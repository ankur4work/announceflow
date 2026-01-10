/**
 * Webhook: customers/data_request
 * Triggered when a customer requests their data.
 * Validates HMAC and returns data found for the customer.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { getSubscriberByEmail, getShopByDomain } from "../lib/db.server";

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
        console.warn("Invalid webhook HMAC for customers/data_request");
        return json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Payload
    // Note: verifyWebhookHMAC clones the request, so we can read it again?
    // Actually, verifyWebhookHMAC clones it, so the original request body stream might still be intact?
    // Wait, if verifyWebhookHMAC reads the clone, the original is fine.
    // HOWEVER, we need the raw body for JSON parsing too.
    // Let's safe-parse.
    let payload;
    try {
        payload = await request.json();
    } catch (err) {
        console.error("Failed to parse webhook body", err);
        return json({ message: "Bad Request" }, { status: 400 });
    }

    const { shop_domain, customer } = payload;
    const email = customer?.email;

    console.log(`Received customer/data_request for ${shop_domain}, email: ${email}`);

    // 3. Process Request
    // Even if we fail finding data, we MUST return 200 OK as per Shopify requirements
    try {
        if (shop_domain && email) {
            const shop = await getShopByDomain(shop_domain);
            if (shop) {
                const subscriber = await getSubscriberByEmail(shop.id, email);
                if (subscriber) {
                    // Return the data found
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
    } catch (error) {
        console.error("Error processing customers/data_request:", error);
        // Fall through to return 200
    }

    // Always return 200 if no data found or handled
    return json({ message: "No data found" }, { status: 200 });
};
