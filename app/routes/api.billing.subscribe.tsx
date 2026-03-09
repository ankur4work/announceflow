/**
 * API: /api/billing/subscribe
 * POST: Initiates the billing flow for Premium plan
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createSubscription, getActiveSubscription } from "../lib/billing.server";
import { updateShopPlan } from "../lib/db.server";
import { onPlanUpgrade } from "../lib/metafields.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return json({ message: "Method not allowed" }, { status: 405 });
    }

    try {
        const { admin, session } = await authenticate.admin(request);

        // Construct return URL (callback)
        const url = new URL(request.url);
        const returnUrl = `${url.origin}/api/billing/callback?shop=${encodeURIComponent(session.shop)}`;

        // Already subscribed in Shopify: sync local state and avoid duplicate charge flow.
        const activeSub = await getActiveSubscription(admin);
        if (activeSub && (activeSub.status === "ACTIVE" || activeSub.status === "PENDING")) {
            await updateShopPlan(session.shop, "PREMIUM");
            await onPlanUpgrade(session.shop, admin);
            return json({
                success: true,
                alreadyActive: true,
            });
        }

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
