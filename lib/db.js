const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function initDB() {
  await query(`
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
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS form_responses (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(order_id),
      responses JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS letters (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) REFERENCES orders(order_id),
      letter_token VARCHAR(64) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
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
  await query(
    `INSERT INTO orders (order_id, store, customer_name, customer_email, guardian_name, guardian_description, form_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (order_id) DO NOTHING`,
    [orderId, store, customerName, customerEmail, guardianName, guardianDescription, formToken]
  );
  return formToken;
}

async function getOrderByFormToken(formToken) {
  const { rows } = await query(
    "SELECT * FROM orders WHERE form_token = $1 AND form_completed = FALSE",
    [formToken]
  );
  return rows[0] || null;
}

async function saveFormResponse(orderId, responses) {
  await query(
    "INSERT INTO form_responses (order_id, responses) VALUES ($1, $2)",
    [orderId, JSON.stringify(responses)]
  );
  await query(
    "UPDATE orders SET form_completed = TRUE WHERE order_id = $1",
    [orderId]
  );
}

async function saveLetter(orderId, content) {
  const letterToken = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO letters (order_id, letter_token, content) VALUES ($1, $2, $3)",
    [orderId, letterToken, content]
  );
  await query(
    "UPDATE orders SET letter_generated = TRUE WHERE order_id = $1",
    [orderId]
  );
  return letterToken;
}

async function getLetterByToken(letterToken) {
  const { rows } = await query(
    `SELECT l.*, o.customer_name, o.guardian_name
     FROM letters l
     JOIN orders o ON o.order_id = l.order_id
     WHERE l.letter_token = $1`,
    [letterToken]
  );
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
