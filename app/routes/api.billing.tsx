/**
 * API Route: /api/billing
 * GET: Returns current plan status
 * POST: Initiates subscription
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../lib/db.server";
import { getActiveSubscription, createSubscription } from "../lib/billing.server";

// GET /api/billing - Status
export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const { session, admin } = await authenticate.admin(request);
        const shop = await getShopByDomain(session.shop);

        let subscription = null;
        if (shop?.plan === "PREMIUM") {
            subscription = await getActiveSubscription(admin);
        }

        return json({
            success: true,
            plan: shop?.plan || "FREE",
            subscription
        });
    } catch (error) {
        console.error("Error fetching billing status:", error);
        return json({ success: false, plan: "FREE", error: "Auth failed" }, { status: 401 });
    }
};

// POST /api/billing - Subscribe
export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return json({ message: "Method not allowed" }, { status: 405 });
    }

    try {
        const { admin } = await authenticate.admin(request);
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
