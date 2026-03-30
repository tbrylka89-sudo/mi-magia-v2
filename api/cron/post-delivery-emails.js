/**
 * Vercel Cron Handler for post-delivery emails
 * Schedule: 0 10 * * * (10AM UTC daily)
 */

const { Pool } = require("pg");
const { sendFollowUpEmail, sendCommunityEmail } = require("../../lib/post-delivery-emails");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function sendPostDeliveryEmail(emailType, orderData) {
  const { id: orderId, customer_name, customer_email, guardian_name } = orderData;
  const emailFunctions = {
    "followup-3days": sendFollowUpEmail,
    "community-14days": sendCommunityEmail,
  };
  if (!emailFunctions[emailType]) return null;
  try {
    const result = await emailFunctions[emailType]({
      customerName: customer_name,
      customerEmail: customer_email,
      guardianName: guardian_name,
      orderNumber: orderId,
    });
    return result && result.id ? { success: true, emailId: result.id } : { success: false, error: "No email ID" };
  } catch (error) {
    console.error(`Error sending ${emailType} for order ${orderId}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log("[Post-Delivery Cron] Starting...");
    const result = await client.query(
      `SELECT pde.id, pde.order_id, pde.email_type, pde.scheduled_for,
              o.customer_name, o.customer_email, o.guardian_name
       FROM post_delivery_emails pde
       JOIN orders o ON pde.order_id = o.id
       WHERE pde.sent_at IS NULL AND pde.scheduled_for <= NOW()
       ORDER BY pde.scheduled_for ASC`
    );
    const pendingEmails = result.rows;
    if (!pendingEmails || pendingEmails.length === 0) {
      return res.status(200).json({ message: "No pending emails", processed: 0 });
    }
    const results = { processed: 0, sent: 0, errors: [] };
    for (const emailRecord of pendingEmails) {
      const orderData = {
        id: emailRecord.order_id,
        customer_name: emailRecord.customer_name,
        customer_email: emailRecord.customer_email,
        guardian_name: emailRecord.guardian_name,
      };
      const sendResult = await sendPostDeliveryEmail(emailRecord.email_type, orderData);
      if (sendResult && sendResult.success) {
        await client.query(
          `UPDATE post_delivery_emails SET resend_email_id = $1, sent_at = NOW()
           WHERE order_id = $2 AND email_type = $3`,
          [sendResult.emailId, orderData.id, emailRecord.email_type]
        );
        results.sent++;
      } else {
        results.errors.push({ orderId: orderData.id, type: emailRecord.email_type, error: sendResult?.error });
      }
      results.processed++;
    }
    console.log("[Post-Delivery Cron] Done", results);
    return res.status(200).json({ message: "Post-delivery cron completed", ...results });
  } catch (error) {
    console.error("[Post-Delivery Cron] Error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  } finally {
    client.release();
  }
};
