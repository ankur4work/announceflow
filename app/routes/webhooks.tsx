/**
 * Webhook Dispatcher: /webhooks
 * Routes GDPR compliance webhooks to their respective handlers
 * Verifies HMAC signature before processing any request.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const topic = request.headers.get("X-Shopify-Topic");

  // Log incoming request
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint: "/webhooks",
    event: "received",
    data: { topic }
  }));

  // Verify HMAC first - return 401 for invalid signatures
  try {
    if (request.method !== "POST") {
      return json({ message: "Method not allowed" }, { status: 405 });
    }

    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      console.error("SHOPIFY_API_SECRET not configured");
      // Return 401 for security - don't expose server config issues
      return json({ message: "Unauthorized" }, { status: 401 });
    }

    // Clone request for HMAC verification
    const bodyText = await request.clone().text();
    const verifyRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyText,
    });

    const isValid = await verifyWebhookHMAC(verifyRequest, secret);
    if (!isValid) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: "/webhooks",
        event: "invalid_hmac",
        data: { topic }
      }));
      return json({ message: "Unauthorized" }, { status: 401 });
    }

    // HMAC valid - route to appropriate handler
    // Parse body for processing
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return json({ message: "Bad Request" }, { status: 400 });
    }

    const { shop_domain, customer } = payload;

    // Import handlers dynamically to avoid circular deps
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
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: "/webhooks",
          event: "unknown_topic",
          data: { topic }
        }));
        return json({ message: "Unknown topic" }, { status: 400 });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 401 for any error during HMAC verification phase
    return json({ message: "Unauthorized" }, { status: 401 });
  }
};
