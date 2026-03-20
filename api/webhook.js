const {
  verifyWebhook,
  identifyStore,
  getProductDescription,
  extractOrderData,
} = require("../lib/shopify");
const { createOrder, initDB } = require("../lib/db");
const { sendFormEmail } = require("../lib/email");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Collect raw body for HMAC verification
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  const body = JSON.parse(rawBody);

  // Verify Shopify webhook signature
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!verifyWebhook(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const shopDomain = req.headers["x-shopify-shop-domain"] || "";
  const store = identifyStore(shopDomain);

  if (store === "unknown") {
    console.error(`Unknown store: ${shopDomain}`);
    return res.status(400).json({ error: "Unknown store" });
  }

  try {
    await initDB();

    const { orderId, customerName, customerEmail, guardianName, productId } =
      extractOrderData(body);

    if (!customerEmail) {
      console.error("No customer email in order", orderId);
      return res.status(400).json({ error: "No customer email" });
    }

    // Fetch guardian description from Shopify
    let guardianDescription = null;
    if (productId) {
      const product = await getProductDescription(store, productId);
      if (product) {
        guardianDescription = product.description;
      }
    }

    // Create order and get unique form token
    const formToken = await createOrder({
      orderId,
      store,
      customerName,
      customerEmail,
      guardianName,
      guardianDescription,
    });

    // Send email with form link
    const formUrl = `${process.env.APP_URL}/form/${formToken}`;
    await sendFormEmail({
      customerName,
      customerEmail,
      guardianName,
      formUrl,
    });

    console.log(`Order ${orderId} processed. Form email sent to ${customerEmail}`);
    return res.status(200).json({ success: true, orderId });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
