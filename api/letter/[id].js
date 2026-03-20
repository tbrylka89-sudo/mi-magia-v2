const { getLetterByToken } = require("../../lib/db");
const fs = require("fs");
const path = require("path");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const letterToken = req.query.id;
  if (!letterToken) {
    return res.status(400).send("Missing letter ID");
  }

  try {
    const letter = await getLetterByToken(letterToken);
    if (!letter) {
      return res.status(404).send("Letter not found");
    }

    let template = fs.readFileSync(
      path.join(__dirname, "../../public/letter.html"),
      "utf-8"
    );

    // Convert letter content paragraphs to HTML
    const contentHtml = letter.content
      .split("\n\n")
      .filter((p) => p.trim())
      .map((p) => `<p>${p.trim()}</p>`)
      .join("\n");

    template = template
      .replace(/{{customerName}}/g, letter.customer_name)
      .replace(/{{guardianName}}/g, letter.guardian_name)
      .replace(/{{letterContent}}/g, contentHtml);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(template);
  } catch (error) {
    console.error("Letter rendering error:", error);
    return res.status(500).send("Error loading letter");
  }
};
