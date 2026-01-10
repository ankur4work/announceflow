/**
 * API: /api/status
 * GET: Returns current plan status for the shop
 */

import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "../lib/db.server";
import { getActiveSubscription } from "../lib/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const { session, admin } = await authenticate.admin(request);
        const shop = await getShopByDomain(session.shop);

        let subscription = null;
        if (shop?.plan === "PREMIUM") {
            subscription = await getActiveSubscription(admin);
        }

        return json({
            plan: shop?.plan || "FREE",
            subscription
        });

    } catch (error) {
        console.error("Error fetching billing status:", error);
        return json({ plan: "FREE", error: "Failed to fetch status" });
    }
};
