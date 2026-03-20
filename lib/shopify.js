const crypto = require("crypto");

function verifyWebhook(rawBody, hmacHeader, secret) {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader || "")
  );
}

function identifyStore(shopDomain) {
  const uyDomain = (process.env.SHOPIFY_UY_STORE_URL || "").replace(
    "https://",
    ""
  );
  const usDomain = (process.env.SHOPIFY_US_STORE_URL || "").replace(
    "https://",
    ""
  );
  if (shopDomain.includes(uyDomain)) return "uy";
  if (shopDomain.includes(usDomain)) return "us";
  return "unknown";
}

async function getProductDescription(store, productId) {
  const storeUrl =
    store === "uy"
      ? process.env.SHOPIFY_UY_STORE_URL
      : process.env.SHOPIFY_US_STORE_URL;
  const apiKey =
    store === "uy"
      ? process.env.SHOPIFY_UY_ADMIN_API_KEY
      : process.env.SHOPIFY_US_ADMIN_API_KEY;

  const res = await fetch(
    `${storeUrl}/admin/api/2024-01/products/${productId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.error(`Shopify API error: ${res.status}`);
    return null;
  }

  const data = await res.json();
  return {
    title: data.product.title,
    description: data.product.body_html,
  };
}

function extractOrderData(body) {
  const customer = body.customer || {};
  const lineItem = (body.line_items || [])[0] || {};

  return {
    orderId: String(body.id),
    customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
    customerEmail: body.contact_email || customer.email || body.email,
    guardianName: lineItem.title || "Guardian",
    productId: lineItem.product_id,
  };
}

module.exports = {
  verifyWebhook,
  identifyStore,
  getProductDescription,
  extractOrderData,
};
