/**
 * Webhook Dispatcher: /webhooks
 * Routes GDPR compliance webhooks to their respective handlers.
 * Uses Shopify's built-in authenticate.webhook() for HMAC verification.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook() handles HMAC verification automatically
  // It returns 401 for invalid HMAC signatures
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint: "/webhooks",
    event: "authenticated",
    data: { topic, shop }
  }));

  const { shop_domain, customer } = payload as any;

  // Route to appropriate handler based on topic
  // Topic names are uppercase enums from Shopify
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
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: "/webhooks",
        event: "unknown_topic",
        data: { topic, shop }
      }));
      return json({ message: "Unknown topic" }, { status: 400 });
  }
};
