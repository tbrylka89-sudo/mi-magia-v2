const { getOrderByFormToken } = require("../lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  const order = await getOrderByFormToken(token);
  if (!order) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(200).json({
    guardianName: order.guardian_name,
    customerName: order.customer_name,
  });
};
