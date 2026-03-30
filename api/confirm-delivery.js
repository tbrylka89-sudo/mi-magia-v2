const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async function handler(req, res) {
  const token = req.query.token || req.body?.token;
  if (!token) {
    return res.status(400).send("Token requerido");
  }

  const client = await pool.connect();
  try {
    // Look up order by form_token
    const orderResult = await client.query(
      "SELECT id, customer_name, guardian_name, delivered_at, shipped_at FROM orders WHERE form_token = $1",
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).send("Orden no encontrada");
    }

    const order = orderResult.rows[0];

    if (req.method === "GET") {
      // Show confirmation page
      const alreadyConfirmed = !!order.delivered_at;
      const html = buildConfirmationPage(order, token, alreadyConfirmed);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    if (req.method === "POST") {
      if (order.delivered_at) {
        return res.status(200).json({ success: true, message: "Ya confirmado previamente" });
      }

      // Mark as delivered
      await client.query(
        "UPDATE orders SET delivered_at = NOW() WHERE id = $1",
        [order.id]
      );

      // Schedule post-delivery emails
      await client.query(
        `INSERT INTO post_delivery_emails (order_id, email_type, scheduled_for)
         VALUES ($1, 'followup-3days', NOW() + INTERVAL '3 days')
         ON CONFLICT (order_id, email_type) DO NOTHING`,
        [order.id]
      );
      await client.query(
        `INSERT INTO post_delivery_emails (order_id, email_type, scheduled_for)
         VALUES ($1, 'community-14days', NOW() + INTERVAL '14 days')
         ON CONFLICT (order_id, email_type) DO NOTHING`,
        [order.id]
      );

      console.log(`Order ${order.id} confirmed delivered by adopter. Post-delivery emails scheduled.`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    return res.status(500).send("Error interno");
  } finally {
    client.release();
  }
};

function buildConfirmationPage(order, token, alreadyConfirmed) {
  const confirmedSection = alreadyConfirmed
    ? `<div class="confirmed">
        <div class="icon">✨</div>
        <h2>Ya confirmaste que recibiste a ${order.guardian_name}</h2>
        <p>Gracias por avisarnos. En los próximos días vas a recibir un mensaje nuestro para saber cómo fue ese primer encuentro.</p>
       </div>`
    : `<div class="pending">
        <div class="icon">📦</div>
        <h2>¿Ya llegó ${order.guardian_name}?</h2>
        <p>Cuando tengas a tu ser elemental en tus manos, confirmalo acá abajo. A partir de ese momento, se activa la siguiente etapa de tu experiencia.</p>
        <button id="confirmBtn" onclick="confirmDelivery()">Sí, ya lo recibí</button>
        <div id="loading" style="display:none;">Confirmando...</div>
        <div id="success" style="display:none;">
          <div class="icon">✨</div>
          <h2>¡Confirmado!</h2>
          <p>Gracias, ${order.customer_name}. En los próximos días vas a recibir un mensaje nuestro.</p>
        </div>
       </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmar recepción — Mi Magia</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #FFFDF7;
      color: #2D2A26;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 40px 24px;
    }
    .logo {
      font-size: 14px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #8B6914;
      margin-bottom: 32px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 22px;
      font-weight: normal;
      color: #2D2A26;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #5a5550;
      margin-bottom: 24px;
    }
    button {
      background: #C9A96E;
      color: #FFFDF7;
      border: none;
      padding: 16px 40px;
      font-family: Georgia, serif;
      font-size: 16px;
      cursor: pointer;
      letter-spacing: 1px;
      transition: background 0.3s;
    }
    button:hover { background: #8B6914; }
    button:disabled { background: #B8A88A; cursor: not-allowed; }
    .confirmed { opacity: 1; }
    #success h2, .confirmed h2 { color: #8B6914; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Duendes del Uruguay</div>
    ${confirmedSection}
  </div>
  <script>
    async function confirmDelivery() {
      const btn = document.getElementById('confirmBtn');
      const loading = document.getElementById('loading');
      const success = document.getElementById('success');
      btn.disabled = true;
      btn.style.display = 'none';
      loading.style.display = 'block';
      try {
        const resp = await fetch('/api/confirm-delivery?token=${token}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: '${token}' })
        });
        if (resp.ok) {
          loading.style.display = 'none';
          success.style.display = 'block';
          document.querySelector('.pending p')?.remove();
        }
      } catch(e) {
        loading.textContent = 'Error. Intentá de nuevo.';
        btn.style.display = 'block';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}
