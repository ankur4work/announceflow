/**
 * API: /api/billing/subscribe
 * POST: Initiates the billing flow for Premium plan
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createSubscription } from "../lib/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return json({ message: "Method not allowed" }, { status: 405 });
    }

    try {
        const { admin } = await authenticate.admin(request);

        // Construct return URL (callback)
        const url = new URL(request.url);
        const returnUrl = `${url.origin}/api/billing/callback`;

        const confirmationUrl = await createSubscription(admin, returnUrl);

        return json({
            success: true,
            confirmationUrl
        });

    } catch (error) {
        console.error("Error creating subscription:", error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to initiate billing"
        }, { status: 500 });
    }
};
