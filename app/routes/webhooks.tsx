/**
 * Webhook Dispatcher: /webhooks
 * Routes GDPR compliance webhooks to their respective handlers
 * based on the X-Shopify-Topic header.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { action as dataRequestAction } from "./webhooks.customers.data-request";
import { action as customersRedactAction } from "./webhooks.customers.redact";
import { action as shopRedactAction } from "./webhooks.shop.redact";

export const action = async (args: ActionFunctionArgs) => {
  const topic = args.request.headers.get("X-Shopify-Topic");

  switch (topic) {
    case "customers/data_request":
      return dataRequestAction(args);
    case "customers/redact":
      return customersRedactAction(args);
    case "shop/redact":
      return shopRedactAction(args);
    default:
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          topic: "webhooks",
          event: "unknown_topic",
          data: { received_topic: topic },
        })
      );
      return json({ message: "Unknown webhook topic" }, { status: 400 });
  }
};
