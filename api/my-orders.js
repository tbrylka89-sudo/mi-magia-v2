const { query } = require("../lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email requerido" });
  }

  const { rows: orders } = await query(
    `SELECT o.order_id, o.guardian_name, o.guardian_description, o.customer_name,
            o.form_completed, o.letter_generated, o.form_token, o.created_at,
            l.letter_token
     FROM orders o
     LEFT JOIN letters l ON l.order_id = o.order_id
     WHERE LOWER(o.customer_email) = LOWER($1)
     ORDER BY o.created_at DESC`,
    [email.trim()]
  );

  return res.status(200).json({
    found: orders.length > 0,
    customerName: orders[0]?.customer_name || "",
    orders: orders.map((o) => ({
      guardianName: o.guardian_name,
      date: o.created_at,
      formCompleted: o.form_completed,
      letterReady: o.letter_generated,
      formUrl: !o.form_completed ? `/form/${o.form_token}` : null,
      letterUrl: o.letter_token ? `/carta/${o.letter_token}` : null,
    })),
  });
};
