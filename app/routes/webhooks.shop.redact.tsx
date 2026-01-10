/**
 * Webhook: shop/redact
 * Triggered 48 hours after a shop uninstalls the app.
 * Validates HMAC and deletes ALL data associated with the shop.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { deleteShopData } from "../lib/db.server";

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
        console.warn("Invalid webhook HMAC for shop/redact");
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

    const { shop_domain } = payload;

    console.log(`Received shop/redact for ${shop_domain}`);

    // 3. Process Redaction
    try {
        if (shop_domain) {
            await deleteShopData(shop_domain);
            console.log(`Completely redacted data for shop ${shop_domain}`);
        } else {
            console.warn("No shop_domain in shop/redact payload");
        }
    } catch (error) {
        console.error("Error processing shop/redact:", error);
        // Fall through to return 200
    }

    // Always return 200
    return json({ message: "Shop redaction processed" }, { status: 200 });
};
