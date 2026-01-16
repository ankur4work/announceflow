/**
 * Webhook Dispatcher: /webhooks
 * Handles GDPR compliance webhooks with manual HMAC verification.
 * Always returns 401 for invalid HMAC (never 500).
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import crypto from "crypto";

// Verify HMAC signature
function verifyHmac(body: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader || !secret) {
    return false;
  }

  try {
    const calculatedHmac = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    // Use timing-safe comparison
    const a = Buffer.from(calculatedHmac);
    const b = Buffer.from(hmacHeader);

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  // Always return 401 for non-POST requests
  if (request.method !== "POST") {
    return new Response("Unauthorized", { status: 401 });
  }

  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");

  // Read body
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify HMAC - return 401 if invalid
  if (!verifyHmac(body, hmacHeader, secret)) {
    console.log(`[webhooks] Invalid HMAC for topic: ${topic}`);
    return new Response("Unauthorized", { status: 401 });
  }

  console.log(`[webhooks] Valid HMAC for topic: ${topic}`);

  // Parse payload
  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { shop_domain, customer } = payload;

  // Route to appropriate handler
  try {
    switch (topic) {
      case "customers/data_request": {
        const { processDataRequest } = await import("../lib/webhook-handlers.server");
        return processDataRequest(shop_domain, customer);
      }
      case "customers/redact": {
        const { processCustomerRedact } = await import("../lib/webhook-handlers.server");
        return processCustomerRedact(shop_domain, customer);
      }
      case "shop/redact": {
        const { processShopRedact } = await import("../lib/webhook-handlers.server");
        return processShopRedact(shop_domain);
      }
      default:
        console.log(`[webhooks] Unknown topic: ${topic}`);
        // For unknown topics, still return 200 as Shopify expects acknowledgment
        return new Response(JSON.stringify({ message: "OK" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error(`[webhooks] Handler error:`, error);
    // Return 200 even on handler errors - HMAC was valid
    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
