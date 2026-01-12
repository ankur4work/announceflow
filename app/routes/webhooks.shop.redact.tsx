/**
 * Webhook: shop/redact
 * Triggered 48 hours after a shop uninstalls the app.
 * Validates HMAC and deletes ALL data associated with the shop.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { deleteShopData } from "../lib/db.server";

// Structured logging helper
function logWebhookEvent(topic: string, event: string, data?: any, error?: any) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        topic,
        event,
        ...(data && { data }),
        ...(error && {
            error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
        }),
    };
    console.log(JSON.stringify(logEntry));
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const topic = "shop/redact";
    
    try {
        if (request.method !== "POST") {
            logWebhookEvent(topic, "method_not_allowed", { method: request.method });
            return json({ message: "Method not allowed" }, { status: 405 });
        }

        const secret = process.env.SHOPIFY_API_SECRET || "";
        if (!secret) {
            logWebhookEvent(topic, "missing_secret", {}, new Error("SHOPIFY_API_SECRET is not defined"));
            return json({ message: "Server error" }, { status: 500 });
        }

        // Read body once for both HMAC verification and parsing
        const bodyText = await request.clone().text();
        const bodyRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: bodyText,
        });

        // 1. Verify HMAC
        const isValid = await verifyWebhookHMAC(bodyRequest, secret);
        if (!isValid) {
            logWebhookEvent(topic, "invalid_hmac", {});
            return json({ message: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse Payload
        let payload;
        try {
            payload = JSON.parse(bodyText);
        } catch (err) {
            logWebhookEvent(topic, "parse_error", {}, err);
            return json({ message: "Bad Request" }, { status: 400 });
        }

        const { shop_domain } = payload;

        logWebhookEvent(topic, "received", { shop_domain });

        // 3. Process Redaction
        try {
            if (shop_domain) {
                await deleteShopData(shop_domain);
                logWebhookEvent(topic, "redaction_success", { shop_domain });
            } else {
                logWebhookEvent(topic, "missing_shop_domain", {});
            }
        } catch (error) {
            logWebhookEvent(topic, "processing_error", { shop_domain }, error);
            // Fall through to return 200
        }

        // Always return 200
        return json({ message: "Shop redaction processed" }, { status: 200 });
    } catch (error) {
        logWebhookEvent(topic, "unexpected_error", {}, error);
        // Always return 200 for GDPR webhooks even on unexpected errors
        return json({ message: "Shop redaction processed" }, { status: 200 });
    }
};
