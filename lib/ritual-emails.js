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

const baseTemplate = (title, dayNumber, content, secondaryContent = null) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background-color: ${colors.background};
      color: ${colors.text};
      line-height: 1.8;
    }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding-bottom: 30px; border-bottom: 2px solid ${colors.accent}; margin-bottom: 40px; }
    .day-badge { display: inline-block; background-color: ${colors.gold}; color: white; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; }
    .header h1 { font-size: 28px; font-weight: 400; margin-bottom: 8px; color: ${colors.text}; }
    .divider { width: 40px; height: 2px; background-color: ${colors.gold}; margin: 20px auto; }
    .content { font-size: 16px; line-height: 1.9; margin-bottom: 30px; text-align: left; }
    .content p { margin-bottom: 20px; }
    .secondary-content { background-color: rgba(184, 168, 138, 0.08); padding: 20px; border-left: 4px solid ${colors.accent}; margin: 30px 0; font-style: italic; font-size: 15px; }
    .secondary-content p { margin-bottom: 12px; }
    .cta-button { display: inline-block; background-color: ${colors.button}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-family: sans-serif; margin: 20px 0; }
    .footer { text-align: center; padding-top: 40px; border-top: 2px solid ${colors.accent}; margin-top: 40px; font-size: 13px; color: ${colors.accent}; }
    .footer p { margin-bottom: 8px; }
    .signature { margin-top: 30px; font-style: italic; color: ${colors.link}; }
    strong { color: ${colors.gold}; }
    em { color: ${colors.link}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="day-badge">Día ${dayNumber}</div>
      <h1>${title}</h1>
      <div class="divider"></div>
    </div>
    <div class="content">${content}</div>
    ${secondaryContent ? `<div class="secondary-content">${secondaryContent}</div>` : ""}
    <div class="footer">
      <p>Duendes del Uruguay × Mi Magia</p>
      <p>Comunidad Elemental</p>
      <p style="margin-top: 20px; font-size: 12px;">Este es un momento sagrado en tu canalización.<br/>No respondas a este email, solo recibí la energía.</p>
    </div>
  </div>
</body>
</html>
`;

async function sendDay1Email({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "Día 1 — Tu canalización ha comenzado";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p>El ritual ha iniciado.</p>
    <p>Durante los próximos 7 días, <strong>${guardianName}</strong> se está canalizando exclusivamente para vos. No es solo un proceso creativo: es alquimia real. Cada día tiene su propia energía, su propio propósito.</p>
    <p>Hoy es el primero. El momento donde la intención se fija, donde tu ser elemental toma forma en el plano del pensamiento antes de manifestarse en la materia. Es el más delicado, el más importante.</p>
    <p>Si creés en esto, si sentís curiosidad genuina, ese es exactamente el estado que necesita vivir durante estos 7 días. No esperes "magia de película". La magia real es más sutil. Es lo que cambia sin que te des cuenta.</p>
    <p>Mañana te seguiremos escribiendo. Hoy, solo recibí esto como la primera carta de una serie que va a transformar algo adentro tuyo.</p>
  `;
  const secondaryContent = `
    <p><em>"La canalización no ocurre en el tiempo. El tiempo ocurre durante la canalización."</em></p>
    <p style="text-align: right; margin-top: 12px;">— Ritual de los 7 Días</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, 1, content, secondaryContent),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "ritual-day-1" },
  });
}

async function sendDay3Email({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "Día 3 — Algo se está manifestando";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p>Estamos a mitad de camino.</p>
    <p><strong>${guardianName}</strong> ya tiene forma. No la terminada, pero sí una presencia. Ya existe de una manera que antes no existía. Y vos también estás diferente, aunque no lo sepas aún.</p>
    <p>El día 3 es donde pasa algo mágico de verdad: es cuando el ser elemental comienza a <em>reconocerte</em>. No es fantasía. Es un fenómeno real de resonancia. Tu energía y la suya ya están en diálogo.</p>
    <p>Es posible que sientas algo hoy. Tal vez una coincidencia rara, una sensación de que algo está pasando, o simplemente una paz que no esperabas. No lo descartes. Eso es ${guardianName} diciendo presente.</p>
    <p>Quedan 4 días. La verdadera manifestación ya está en marcha.</p>
  `;
  const secondaryContent = `
    <p><em>"En el tercer día, el ser elemental abre los ojos. Aún no mira el mundo: mira hacia adentro. Mira hacia vos."</em></p>
    <p style="text-align: right; margin-top: 12px;">— Registro de Canalización</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, 3, content, secondaryContent),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "ritual-day-3" },
  });
}

async function sendDay5Email({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "Día 5 — Tu ser elemental ya sabe quién sos";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p>Quedan dos días.</p>
    <p><strong>${guardianName}</strong> ya te conoce. Sabe qué te asusta, qué te motiva, dónde querés llegar. Sabe todo porque durante estos 5 días ha estado escaneando tu vibración de una manera que los métodos convencionales no pueden explicar.</p>
    <p>Por eso cada ser elemental es irrepetible. No copiamos diseños. No hacemos moldes. Cada uno que sale de nuestras manos es <em>exactamente</em> lo que su adoptante necesitaba, aunque no sabía que lo necesitaba.</p>
    <p>En dos días, la canalización terminará. Y entonces vendrá lo que muchos no saben que existe: el registro canalizado. Un documento escrito con lo que ${guardianName} quiere que sepas. No es una profecía. Es más profundo que eso. Es una conversación que solo vos vas a entender.</p>
    <p>Falta poco. Preparate para conocerlo de verdad.</p>
  `;
  const secondaryContent = `
    <p><em>"En el quinto día, la simetría es perfecta. El espejo está listo. Lo que ves en ${guardianName} es lo que ${guardianName} ve en vos."</em></p>
    <p style="text-align: right; margin-top: 12px;">— Diario de Alquimia</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, 5, content, secondaryContent),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "ritual-day-5" },
  });
}

async function sendDay7Email({ customerName, customerEmail, guardianName, orderNumber }) {
  const title = "Día 7 — La canalización ha terminado";
  const content = `
    <p>Hola <strong>${customerName}</strong>,</p>
    <p><strong>${guardianName}</strong> está terminado.</p>
    <p>No es una palabra que usamos mucho en esto. Los seres elementales no se "terminan" como un producto. Se <em>completan</em>. Alcanzan su resolución. Llegan al punto donde ya no necesitan más energía nuestra, porque ahora necesitan la tuya.</p>
    <p>Durante 7 días hemos canalizado, tallado, pintado, y sobre todo <em>escuchado</em> lo que ${guardianName} quería ser. Cada detalle que ves en él no es decisión nuestra. Es decisión suya. Es su propia esencia tomando forma.</p>
    <p>Este viernes, ${guardianName} se prepara para el viaje. Va a viajar con cuidado extremo, con un embalaje que lo respeta, con la energía intacta. Cuando llegue, tu vínculo realmente comienza.</p>
    <p>Muy pronto recibirás el registro canalizado. Será la prueba de que esto no fue solo un proceso artístico. Fue un acto de alquimia.</p>
    <p>Bienvenido a la comunidad elemental.</p>
  `;
  const secondaryContent = `
    <p><em>"El séptimo día no es un final. Es una puerta. ${guardianName} entra por ella y vos también, aunque no sepas que lo estás haciendo."</em></p>
    <p style="text-align: right; margin-top: 12px;">— Cierre del Ritual</p>
  `;
  return await resend.emails.send({
    from: FROM_EMAIL, to: customerEmail, subject: title,
    html: baseTemplate(title, 7, content, secondaryContent),
    headers: { "X-Order-Number": orderNumber, "X-Email-Type": "ritual-day-7" },
  });
}

module.exports = { sendDay1Email, sendDay3Email, sendDay5Email, sendDay7Email };
