/**
 * Webhook Handler Functions
 * These functions process GDPR compliance webhooks after HMAC verification.
 * All handlers return 200 status even on errors (per Shopify requirements).
 */

import { json } from "@remix-run/node";
import { getShopByDomain, getSubscriberByEmail, deleteSubscriberByEmail, deleteShopData } from "./db.server";

/**
 * Process customers/data_request webhook
 * Returns customer data if found, otherwise returns "No data found"
 */
export async function processDataRequest(shop_domain: string, customer: any) {
  const topic = "customers/data_request";

  try {
    if (shop_domain && customer?.email) {
      const shop = await getShopByDomain(shop_domain);
      if (shop) {
        const subscriber = await getSubscriberByEmail(shop.id, customer.email);
        if (subscriber) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            topic,
            event: "data_found",
            data: { shop_domain, email: customer.email }
          }));
          return json({
            customer: {
              email: subscriber.email,
              subscribed_at: subscriber.createdAt,
              recorded_ip: subscriber.ipAddress,
              source_bar_id: subscriber.barId
            }
          }, { status: 200 });
        }
      }
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      topic,
      event: "no_data_found",
      data: { shop_domain, email: customer?.email }
    }));
    return json({ message: "No data found" }, { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      topic,
      event: "error",
      error: error instanceof Error ? error.message : String(error)
    }));
    return json({ message: "Request processed" }, { status: 200 });
  }
}

/**
 * Process customers/redact webhook
 * Deletes customer data if found
 */
export async function processCustomerRedact(shop_domain: string, customer: any) {
  const topic = "customers/redact";

  try {
    if (shop_domain && customer?.email) {
      const shop = await getShopByDomain(shop_domain);
      if (shop) {
        await deleteSubscriberByEmail(shop.id, customer.email);
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          topic,
          event: "redaction_success",
          data: { shop_domain, email: customer.email }
        }));
      }
    }
    return json({ message: "Redaction processed" }, { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      topic,
      event: "error",
      error: error instanceof Error ? error.message : String(error)
    }));
    return json({ message: "Redaction processed" }, { status: 200 });
  }
}

/**
 * Process shop/redact webhook
 * Deletes all shop data (called 48 hours after uninstall)
 */
export async function processShopRedact(shop_domain: string) {
  const topic = "shop/redact";

  try {
    if (shop_domain) {
      await deleteShopData(shop_domain);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        topic,
        event: "shop_redaction_success",
        data: { shop_domain }
      }));
    }
    return json({ message: "Shop redaction processed" }, { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      topic,
      event: "error",
      error: error instanceof Error ? error.message : String(error)
    }));
    return json({ message: "Shop redaction processed" }, { status: 200 });
  }
}
