const { verifyWebhook, identifyStore } = require("../lib/shopify");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  const body = JSON.parse(rawBody);

  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!verifyWebhook(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const shopDomain = req.headers["x-shopify-shop-domain"] || "";
  const topic = req.headers["x-shopify-topic"] || "";
  const store = identifyStore(shopDomain);

  if (store === "unknown") {
    console.error(`Unknown store: ${shopDomain}`);
    return res.status(400).json({ error: "Unknown store" });
  }

  const client = await pool.connect();
  try {
    if (topic === "orders/fulfilled") {
      // Order was marked as fulfilled/shipped
      const orderId = String(body.id);
      const trackingNumber = body.fulfillments?.[0]?.tracking_number || null;

      const result = await client.query(
        `UPDATE orders SET shipped_at = NOW(), tracking_number = $1
         WHERE order_id = $2 RETURNING id, customer_email`,
        [trackingNumber, orderId]
      );

      if (result.rows.length > 0) {
        console.log(`Order ${orderId} marked as shipped. Tracking: ${trackingNumber}`);
      } else {
        console.log(`Order ${orderId} not found in mi-magia DB (may not have form)`);
      }

      return res.status(200).json({ success: true, event: "shipped", orderId });

    } else if (topic === "fulfillments/update") {
      // Fulfillment status updated — check if delivered
      const shipmentStatus = body.shipment_status;
      const orderId = String(body.order_id);
      const trackingNumber = body.tracking_number || null;

      if (shipmentStatus === "delivered") {
        // 1. Update delivered_at on orders
        const result = await client.query(
          `UPDATE orders SET delivered_at = NOW(), tracking_number = COALESCE($1, tracking_number)
           WHERE order_id = $2 AND delivered_at IS NULL
           RETURNING id, customer_email, guardian_name`,
          [trackingNumber, orderId]
        );

        if (result.rows.length > 0) {
          const order = result.rows[0];
          // 2. Schedule post-delivery emails
          // Follow-up: 3 days after delivery
          await client.query(
            `INSERT INTO post_delivery_emails (order_id, email_type, scheduled_for)
             VALUES ($1, 'followup-3days', NOW() + INTERVAL '3 days')
             ON CONFLICT (order_id, email_type) DO NOTHING`,
            [order.id]
          );
          // Community: 14 days after delivery
          await client.query(
            `INSERT INTO post_delivery_emails (order_id, email_type, scheduled_for)
             VALUES ($1, 'community-14days', NOW() + INTERVAL '14 days')
             ON CONFLICT (order_id, email_type) DO NOTHING`,
            [order.id]
          );

          console.log(`Order ${orderId} delivered. Scheduled follow-up (3d) and community (14d) emails.`);
        } else {
          console.log(`Order ${orderId} not found or already marked delivered`);
        }

        return res.status(200).json({ success: true, event: "delivered", orderId });

      } else {
        // Other statuses: in_transit, out_for_delivery, etc — just log
        console.log(`Order ${orderId} fulfillment status: ${shipmentStatus}`);
        return res.status(200).json({ success: true, event: shipmentStatus, orderId });
      }

    } else {
      console.log(`Unhandled topic: ${topic}`);
      return res.status(200).json({ success: true, event: "ignored" });
    }
  } catch (error) {
    console.error("Fulfillment webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};
