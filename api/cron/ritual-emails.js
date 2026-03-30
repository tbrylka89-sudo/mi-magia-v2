/**
 * Vercel Cron Handler for mi-magia ritual emails
 * Schedule: 0 9 * * * (9AM UTC daily)
 */

const { Pool } = require("pg");
const {
  sendDay1Email,
  sendDay3Email,
  sendDay5Email,
  sendDay7Email,
} = require("../../lib/ritual-emails");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getDayNumber(formSubmittedDate) {
  const submitted = new Date(formSubmittedDate);
  const today = new Date();
  submitted.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today - submitted;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

async function wasEmailSent(client, orderId, emailType) {
  const result = await client.query(
    "SELECT id FROM ritual_emails_sent WHERE order_id = $1 AND email_type = $2",
    [orderId, emailType]
  );
  return result.rows.length > 0;
}

async function markEmailAsSent(client, orderId, emailType, resendEmailId) {
  await client.query(
    `INSERT INTO ritual_emails_sent (order_id, email_type, resend_email_id, sent_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (order_id, email_type) DO UPDATE
     SET resend_email_id = $3, sent_at = NOW()`,
    [orderId, emailType, resendEmailId]
  );
}

async function sendRitualEmail(day, orderData) {
  const { id: orderId, customer_name, customer_email, guardian_name } = orderData;
  const emailFunctions = { 1: sendDay1Email, 3: sendDay3Email, 5: sendDay5Email, 7: sendDay7Email };
  if (!emailFunctions[day]) return null;
  try {
    const result = await emailFunctions[day]({
      customerName: customer_name,
      customerEmail: customer_email,
      guardianName: guardian_name,
      orderNumber: orderId,
    });
    return result && result.id ? { success: true, emailId: result.id } : { success: false, error: "No email ID" };
  } catch (error) {
    console.error(`Error sending day ${day} email for order ${orderId}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log("[Ritual Email Cron] Starting...");
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const ordersResult = await client.query(
      `SELECT id, customer_name, customer_email, guardian_name, form_submitted_at
       FROM orders WHERE form_submitted_at >= $1 AND ritual_email_status = 'active'
       ORDER BY form_submitted_at DESC`,
      [tenDaysAgo.toISOString()]
    );
    const orders = ordersResult.rows;
    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "No active orders", processed: 0 });
    }
    const results = { processed: 0, sent: 0, skipped: 0, errors: [] };
    for (const order of orders) {
      const dayNumber = getDayNumber(order.form_submitted_at);
      if (![1, 3, 5, 7].includes(dayNumber)) { results.skipped++; continue; }
      const emailType = `day-${dayNumber}`;
      const alreadySent = await wasEmailSent(client, order.id, emailType);
      if (alreadySent) { results.skipped++; continue; }
      const sendResult = await sendRitualEmail(dayNumber, order);
      if (sendResult && sendResult.success) {
        await markEmailAsSent(client, order.id, emailType, sendResult.emailId);
        results.sent++;
      } else {
        results.errors.push({ orderId: order.id, day: dayNumber, error: sendResult?.error });
      }
      results.processed++;
    }
    console.log("[Ritual Email Cron] Done", results);
    return res.status(200).json({ message: "Ritual email cron completed", ...results });
  } catch (error) {
    console.error("[Ritual Email Cron] Error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  } finally {
    client.release();
  }
};
