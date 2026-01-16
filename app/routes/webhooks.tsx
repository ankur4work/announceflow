/**
 * Webhook Dispatcher: /webhooks
 * Routes GDPR compliance webhooks to their respective handlers.
 * Returns 401 for any authentication failure.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("[webhooks] Received request");

  try {
    // authenticate.webhook() handles HMAC verification
    // It throws an error with a Response for invalid HMAC
    const { payload, topic, shop } = await authenticate.webhook(request);

    console.log(`[webhooks] Authenticated: topic=${topic}, shop=${shop}`);

    const { shop_domain, customer } = payload as any;

    // Route to appropriate handler based on topic
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST": {
        const { processDataRequest } = await import("../lib/webhook-handlers.server");
        return processDataRequest(shop_domain || shop, customer);
      }
      case "CUSTOMERS_REDACT": {
        const { processCustomerRedact } = await import("../lib/webhook-handlers.server");
        return processCustomerRedact(shop_domain || shop, customer);
      }
      case "SHOP_REDACT": {
        const { processShopRedact } = await import("../lib/webhook-handlers.server");
        return processShopRedact(shop_domain || shop);
      }
      default:
        console.log(`[webhooks] Unknown topic: ${topic}`);
        return new Response(JSON.stringify({ message: "Unknown topic" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("[webhooks] Error:", error);

    // If authenticate.webhook throws a Response, return it directly
    if (error instanceof Response) {
      return error;
    }

    // For any other error, return 401 Unauthorized
    // This ensures Shopify's HMAC test gets a 401, not 500
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};
