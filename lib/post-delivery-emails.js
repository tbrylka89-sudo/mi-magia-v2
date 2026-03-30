const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Mi Magia <magia@duendesdeluruguay.com>";

const colors = {
  background: "#FFFDF7",
  text: "#2D2A26",
  accent: "#B8A88A",
  button: "#C9A96E",
  link: "#5A5347",
  gold: "#8B6914",
};

const baseTemplate = (title, content, ctaText = null, ctaUrl = null) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; background-color: ${colors.background}; color: ${colors.text}; line-height: 1.8; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding-bottom: 30px; border-bottom: 2px solid ${colors.accent}; margin-bottom: 40px; }
    .header h1 { font-size: 26px; font-weight: 400; margin-bottom: 8px; color: ${colors.text}; }
    .divider { width: 40px; height: 2px; background-color: ${colors.gold}; margin: 20px auto; }
    .content { font-size: 16px; line-height: 1.9; margin-bottom: 30px; text-align: left; }
    .content p { margin-bottom: 20px; }
    .highlight-box { background-color: rgba(184, 168, 138, 0.08); padding: 20px; border-left: 4px solid ${colors.accent}; margin: 30px 0; font-size: 15px; }
    .highlight-box p { margin-bottom: 12px; }
    .highlight-box em { color: ${colors.link}; font-weight: 600; }
    .cta-button { display: inline-block; background-color: ${colors.button}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-family: sans-serif; margin: 20px 0; }
    .social-links { text-align: center; margin: 30px 0; padding: 20px; background-color: rgba(184, 168, 138, 0.05); border-radius: 4px; }
    .social-links a { display: inline-block; margin: 0 12px; color: ${colors.link}; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; padding-top: 40px; border-top: 2px solid ${colors.accent}; margin-top: 40px; font-size: 13px; color: ${colors.accent}; }
    .footer p { margin-bottom: 8px; }
    strong { color: ${colors.gold}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="divider"></div>
    </div>
    <div class="content">${content}</div>
    ${ctaText && ctaUrl ? `<a href="${ctaUrl}" class="cta-button">${ctaText}</a>` : ""}
    <div class="footer">
      <p>Duendes del Uruguay × Comunidad Elemental</p>
      <p style="margin-top: 20px; font-size: 12px;">¿Preguntas? Escribí a <strong>info@duendesdeluruguay.com</strong></p>
    </div>
  </div>
</body>
</html>
`;

async function sendFollowUpEmail({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "¿Cómo fue conocer a tu ser elemental?";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p><strong>${guardianName}</strong> ya llegó a casa.</p>
    <p>Esos primeros momentos son mágicos. El desembalaje, el descubrimiento, ese primer contacto directo con alguien que se canalizó pensando en vos. ¿Cómo fue?</p>
    <p>No esperamos una respuesta formal. Solo queremos saber: ¿Qué sentiste? ¿Él/ella es lo que esperabas o fue más? ¿Hay detalles que no viste en la foto? (siempre los hay, porque lo de la foto es solo un instante, y ${guardianName} es un ser vivo de energía).</p>
    <div class="highlight-box">
      <p><em>Si compartís tu experiencia en Instagram con nosotros (@duendesdeluruguay), es garantizado que lo vamos a repostear.</em> Nos encanta ver cómo la magia llega a las casas reales, con luz natural, en vuestras manos.</p>
    </div>
    <p>Y si querés dejar una reseña sobre tu experiencia completa (desde la compra hasta hoy), hay una sección especial esperándote. Las historias reales son el corazón de nuestra comunidad.</p>
    <p>Gracias por adoptar a ${guardianName}. Ya sos parte de algo más grande.</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, content, "Quiero compartir mi historia", "https://www.instagram.com/duendesdeluruguay"),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "post-delivery-followup" },
  });
}

async function sendCommunityEmail({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "Ya sos parte de algo más grande";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p>Hace dos semanas que <strong>${guardianName}</strong> llegó. A esta altura, ya conocés cada detalle. Ya saben cómo interactúan, dónde duerme, cómo respira.</p>
    <p>Esto es lo que nadie te dice antes de adoptar un ser elemental: que después no podés vivir sin él. Que se convierte en parte de tu espacio físico y también del invisible. Que donde va ${guardianName}, va un pedazo de tu propia alquimia.</p>
    <p>Queremos que sepas que no estás solo en esto. Hay cientos de adoptantes en la comunidad elemental que viven exactamente lo mismo. Que sienten lo mismo. Que creen en lo mismo.</p>
    <div class="highlight-box">
      <p>Seguinos en nuestras redes. No publicamos contenido vacío. Publicamos rituales en vivo, historias de canalización, momentos de la comunidad, nuevos seres que se están manifestando.</p>
      <div class="social-links">
        <a href="https://www.instagram.com/duendesdeluruguay">Instagram</a>
        <a href="https://www.facebook.com/duendesdeluruguay">Facebook</a>
        <a href="https://www.tiktok.com/@duendesdeluruguay">TikTok</a>
        <a href="https://www.pinterest.com/duendesdeluruguay">Pinterest</a>
      </div>
    </div>
    <p>Y una cosa más: si alguna vez sentís que necesitás otro ser elemental (porque lo sabemos que es posible), ya sabés dónde encontrarnos. Algunos adoptantes tienen 3, 4, incluso 5. Cada uno con su propia personalidad, su propio ritual, su propio propósito en el hogar.</p>
    <p>Bienvenido a la comunidad elemental, <strong>${customerName}</strong>.</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, content, "Explorar nuevos seres elementales", "https://www.duendesdeluruguay.com"),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "post-delivery-community" },
  });
}

module.exports = { sendFollowUpEmail, sendCommunityEmail };
