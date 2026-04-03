const { initDB, createOrder } = require("../lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-admin-key"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { orderId, store, customerName, customerEmail, guardianName, guardianDescription } = req.body;

  if (!orderId || !customerEmail || !guardianName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await initDB();
    const formToken = await createOrder({
      orderId,
      store: store || "us",
      customerName: customerName || "Cliente",
      customerEmail,
      guardianName,
      guardianDescription: guardianDescription || "",
    });

    return res.status(200).json({ success: true, formToken, formUrl: `/form/${formToken}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
