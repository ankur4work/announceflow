/**
 * API: /api/billing/callback
 * GET: Handles the redirect from Shopify after charge approval/decline
 */

import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getActiveSubscription } from "../lib/billing.server";
import { updateShopPlan } from "../lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session, admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const chargeId = url.searchParams.get("charge_id");

    if (!chargeId) {
        // If no charge ID, assume cancelled or invalid
        return redirect("/app?billing=cancelled");
    }

    try {
        // Verify the subscription is actually active via API
        const activeSub = await getActiveSubscription(admin);

        if (activeSub && activeSub.status === "ACTIVE") {
            // Update local DB
            await updateShopPlan(session.shop, "PREMIUM");

            // Redirect to app with success
            return redirect("/app?billing=success");
        } else {
            // If not active, maybe it failed or is pending?
            return redirect("/app?billing=failed");
        }
    } catch (error) {
        console.error("Error handling billing callback:", error);
        return redirect("/app?billing=error");
    }
};
