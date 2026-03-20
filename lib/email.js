const { Resend } = require("resend");
const fs = require("fs");
const path = require("path");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Mi Magia <magia@duendesdeluruguay.com>";

async function sendFormEmail({ customerName, customerEmail, guardianName, formUrl }) {
  let template = fs.readFileSync(
    path.join(__dirname, "../templates/email-link.html"),
    "utf-8"
  );

  template = template
    .replace(/{{customerName}}/g, customerName)
    .replace(/{{guardianName}}/g, guardianName)
    .replace(/{{formUrl}}/g, formUrl);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Tu ${guardianName} te espera — Completa tu canalizacion`,
    html: template,
  });
}

async function sendLetterEmail({ customerName, customerEmail, guardianName, letterUrl }) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Tu carta de canalizacion esta lista — ${guardianName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Georgia', serif; background: #FFFDF7; color: #2D2A26; padding: 40px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto;">
          <p style="font-size: 14px; color: #B8A88A; letter-spacing: 3px; text-transform: uppercase;">Duendes del Uruguay</p>
          <h1 style="font-size: 24px; font-weight: 400; color: #2D2A26; margin: 30px 0;">Querido/a ${customerName}</h1>
          <p style="font-size: 16px; line-height: 1.8; color: #5A5347;">
            Tu ${guardianName} ha hablado.<br>
            Tu carta de canalizacion esta lista para ti.
          </p>
          <a href="${letterUrl}" style="display: inline-block; margin: 30px 0; padding: 16px 40px; background: #C9A96E; color: #FFFDF7; text-decoration: none; font-size: 16px; letter-spacing: 1px; border-radius: 4px;">
            Leer mi carta
          </a>
          <p style="font-size: 13px; color: #B8A88A; margin-top: 40px;">
            Este enlace es unico y personal. Guardalo con cuidado.
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

module.exports = { sendFormEmail, sendLetterEmail };
