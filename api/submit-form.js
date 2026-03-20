const { getOrderByFormToken, saveFormResponse, saveLetter } = require("../lib/db");
const { generateLetter } = require("../lib/anthropic");
const { sendLetterEmail } = require("../lib/email");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { formToken, responses } = req.body;

  if (!formToken || !responses) {
    return res.status(400).json({ error: "Missing formToken or responses" });
  }

  try {
    const order = await getOrderByFormToken(formToken);
    if (!order) {
      return res
        .status(404)
        .json({ error: "Form not found or already completed" });
    }

    // Save form responses
    await saveFormResponse(order.order_id, responses);

    // Generate channeling letter via Claude
    const letterContent = await generateLetter({
      guardianName: order.guardian_name,
      guardianDescription: order.guardian_description,
      customerName: order.customer_name,
      formResponses: responses,
    });

    // Save letter and get unique token
    const letterToken = await saveLetter(order.order_id, letterContent);

    // Send email with letter link
    const letterUrl = `${process.env.APP_URL}/carta/${letterToken}`;
    await sendLetterEmail({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      guardianName: order.guardian_name,
      letterUrl,
    });

    return res.status(200).json({
      success: true,
      letterUrl,
    });
  } catch (error) {
    console.error("Form submission error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
