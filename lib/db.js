const { sql } = require("@vercel/postgres");
const crypto = require("crypto");

async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) UNIQUE NOT NULL,
      store VARCHAR(10) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      guardian_name VARCHAR(255) NOT NULL,
      guardian_description TEXT,
      form_token VARCHAR(64) UNIQUE NOT NULL,
      form_completed BOOLEAN DEFAULT FALSE,
      letter_generated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS form_responses (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(order_id),
      responses JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS letters (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(order_id),
      letter_token VARCHAR(64) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function createOrder({
  orderId,
  store,
  customerName,
  customerEmail,
  guardianName,
  guardianDescription,
}) {
  const formToken = crypto.randomBytes(32).toString("hex");
  await sql`
    INSERT INTO orders (order_id, store, customer_name, customer_email, guardian_name, guardian_description, form_token)
    VALUES (${orderId}, ${store}, ${customerName}, ${customerEmail}, ${guardianName}, ${guardianDescription}, ${formToken})
    ON CONFLICT (order_id) DO NOTHING
  `;
  return formToken;
}

async function getOrderByFormToken(formToken) {
  const { rows } = await sql`
    SELECT * FROM orders WHERE form_token = ${formToken} AND form_completed = FALSE
  `;
  return rows[0] || null;
}

async function saveFormResponse(orderId, responses) {
  await sql`
    INSERT INTO form_responses (order_id, responses)
    VALUES (${orderId}, ${JSON.stringify(responses)})
  `;
  await sql`
    UPDATE orders SET form_completed = TRUE WHERE order_id = ${orderId}
  `;
}

async function saveLetter(orderId, content) {
  const letterToken = crypto.randomBytes(32).toString("hex");
  await sql`
    INSERT INTO letters (order_id, letter_token, content)
    VALUES (${orderId}, ${letterToken}, ${content})
  `;
  await sql`
    UPDATE orders SET letter_generated = TRUE WHERE order_id = ${orderId}
  `;
  return letterToken;
}

async function getLetterByToken(letterToken) {
  const { rows } = await sql`
    SELECT l.*, o.customer_name, o.guardian_name
    FROM letters l
    JOIN orders o ON o.order_id = l.order_id
    WHERE l.letter_token = ${letterToken}
  `;
  return rows[0] || null;
}

module.exports = {
  initDB,
  createOrder,
  getOrderByFormToken,
  saveFormResponse,
  saveLetter,
  getLetterByToken,
};
