/**
 * API Route: /api/settings/branding
 * GET: Returns branding status and whether it can be disabled
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getBarsConfig } from "../lib/metafields.server";
import { getShopByDomain } from "../lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const { admin, session } = await authenticate.admin(request);
        
        // Get shop plan from database
        const shop = await getShopByDomain(session.shop);
        const currentPlan = shop?.plan || "FREE";
        
        // Get bars config to check branding settings
        const config = await getBarsConfig(admin);
        const showBranding = config.settings?.show_branding ?? (currentPlan === "FREE" ? true : false);
        
        // FREE plan cannot disable branding, PREMIUM can
        const canDisable = currentPlan === "PREMIUM";

        return json({
            success: true,
            show_branding: showBranding,
            can_disable: canDisable,
            current_plan: currentPlan,
        });
    } catch (error) {
        console.error("Error fetching branding status:", error);
        return json(
            { 
                success: false, 
                error: "Failed to fetch branding status",
                show_branding: true, // Default to showing branding on error
                can_disable: false,
            },
            { status: 500 }
        );
    }
};
