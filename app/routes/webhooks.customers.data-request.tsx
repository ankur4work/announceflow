/**
 * Webhook: customers/data_request
 * Triggered when a customer requests their data.
 * Validates HMAC and returns data found for the customer.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { getSubscriberByEmail, getShopByDomain } from "../lib/db.server";

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
    const topic = "customers/data_request";
    
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
        
        // Create a new request for HMAC verification (webhook.server expects a Request object)
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

        const { shop_domain, customer } = payload;
        const email = customer?.email;

        logWebhookEvent(topic, "received", { shop_domain, email });

        // 3. Process Request
        // Even if we fail finding data, we MUST return 200 OK as per Shopify requirements
        try {
            if (shop_domain && email) {
                const shop = await getShopByDomain(shop_domain);
                if (shop) {
                    const subscriber = await getSubscriberByEmail(shop.id, email);
                    if (subscriber) {
                        logWebhookEvent(topic, "data_found", { shop_domain, email });
                        // Return the data found
                        return json({
                            customer: {
                                email: subscriber.email,
                                subscribed_at: subscriber.createdAt,
                                recorded_ip: subscriber.ipAddress,
                                source_bar_id: subscriber.barId
                            }
                        }, { status: 200 });
                    } else {
                        logWebhookEvent(topic, "no_subscriber_found", { shop_domain, email });
                    }
                } else {
                    logWebhookEvent(topic, "shop_not_found", { shop_domain });
                }
            } else {
                logWebhookEvent(topic, "missing_data", { shop_domain, email });
            }
        } catch (error) {
            logWebhookEvent(topic, "processing_error", { shop_domain, email }, error);
            // Fall through to return 200
        }

        // Always return 200 if no data found or handled
        return json({ message: "No data found" }, { status: 200 });
    } catch (error) {
        logWebhookEvent(topic, "unexpected_error", {}, error);
        // Always return 200 for GDPR webhooks even on unexpected errors
        return json({ message: "Request processed" }, { status: 200 });
    }
};
