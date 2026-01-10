/**
 * Webhook: customers/redact
 * Triggered when a customer requests data deletion.
 * Validates HMAC and deletes matching subscriber data.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { getShopByDomain, deleteSubscriberByEmail } from "../lib/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return json({ message: "Method not allowed" }, { status: 405 });
    }

    const secret = process.env.SHOPIFY_API_SECRET || "";
    if (!secret) {
        console.error("SHOPIFY_API_SECRET is not defined");
        return json({ message: "Server error" }, { status: 500 });
    }

    // 1. Verify HMAC
    const isValid = await verifyWebhookHMAC(request, secret);
    if (!isValid) {
        console.warn("Invalid webhook HMAC for customers/redact");
        return json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Payload
    let payload;
    try {
        payload = await request.json();
    } catch (err) {
        console.error("Failed to parse webhook body", err);
        return json({ message: "Bad Request" }, { status: 400 });
    }

    const { shop_domain, customer } = payload;
    const email = customer?.email;

    console.log(`Received customers/redact for ${shop_domain}, email: ${email}`);

    // 3. Process Redaction
    try {
        if (shop_domain && email) {
            const shop = await getShopByDomain(shop_domain);
            if (shop) {
                await deleteSubscriberByEmail(shop.id, email);
                console.log(`Redacted subscriber ${email} for shop ${shop_domain}`);
            } else {
                console.warn(`Shop not found for redaction: ${shop_domain}`);
            }
        }
    } catch (error) {
        console.error("Error processing customers/redact:", error);
        // Fall through to return 200
    }

    // Always return 200
    return json({ message: "Redaction processed" }, { status: 200 });
};
