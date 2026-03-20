const express = require("express");
const path = require("path");
const { initDB } = require("./lib/db");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON for most routes
app.use((req, res, next) => {
  if (req.path === "/api/webhook") {
    // Webhook needs raw body for HMAC verification
    let chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      req.rawBody = Buffer.concat(chunks).toString("utf8");
      try {
        req.body = JSON.parse(req.rawBody);
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// API routes
const webhookHandler = require("./api/webhook");
const submitFormHandler = require("./api/submit-form");
const validateFormHandler = require("./api/validate-form");
const letterHandler = require("./api/letter/[id]");

// Webhook from Shopify
app.post("/api/webhook", async (req, res) => {
  // Adapter: rawBody is already on req
  req.headers = req.headers;
  // Override the async iterator the old handler used
  const originalHandler = webhookHandler;
  try {
    await webhookAdapter(req, res);
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function webhookAdapter(req, res) {
  const {
    verifyWebhook,
    identifyStore,
    getProductDescription,
    extractOrderData,
  } = require("./lib/shopify");
  const { createOrder, initDB } = require("./lib/db");
  const { sendFormEmail } = require("./lib/email");

  const rawBody = req.rawBody;
  const body = req.body;

  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!verifyWebhook(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const shopDomain = req.headers["x-shopify-shop-domain"] || "";
  const store = identifyStore(shopDomain);

  if (store === "unknown") {
    console.error(`Unknown store: ${shopDomain}`);
    return res.status(400).json({ error: "Unknown store" });
  }

  await initDB();

  const { orderId, customerName, customerEmail, guardianName, productId } =
    extractOrderData(body);

  if (!customerEmail) {
    console.error("No customer email in order", orderId);
    return res.status(400).json({ error: "No customer email" });
  }

  let guardianDescription = null;
  if (productId) {
    const product = await getProductDescription(store, productId);
    if (product) {
      guardianDescription = product.description;
    }
  }

  const formToken = await createOrder({
    orderId,
    store,
    customerName,
    customerEmail,
    guardianName,
    guardianDescription,
  });

  const formUrl = `${process.env.APP_URL}/form/${formToken}`;
  await sendFormEmail({ customerName, customerEmail, guardianName, formUrl });

  console.log(`Order ${orderId} processed. Form email sent to ${customerEmail}`);
  return res.status(200).json({ success: true, orderId });
}

// Form validation
app.get("/api/validate-form", async (req, res) => {
  try {
    await validateFormHandler(req, res);
  } catch (err) {
    console.error("Validate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Form submission
app.post("/api/submit-form", async (req, res) => {
  try {
    await submitFormHandler(req, res);
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Letter page
app.get("/carta/:id", async (req, res) => {
  req.query = { id: req.params.id };
  try {
    await letterHandler(req, res);
  } catch (err) {
    console.error("Letter error:", err);
    res.status(500).send("Error loading letter");
  }
});

// Form page (SPA - serves form.html for any /form/* route)
app.get("/form/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

// Init DB and start
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mi Magia v2 running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });
