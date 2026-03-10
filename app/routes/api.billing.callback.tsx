/**
 * API: /api/billing/callback
 * GET: Handles the redirect from Shopify after charge approval/decline
 */

import { redirect as remixRedirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getActiveSubscription } from "../lib/billing.server";
import { updateShopPlan, getShopByDomain } from "../lib/db.server";
import { normalizeShopDomain } from "../lib/auth.server";
import { onPlanUpgrade, onPlanDowngrade } from "../lib/metafields.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const callbackUrl = new URL(request.url);
    const shopFromQuery = callbackUrl.searchParams.get("shop");
    const normalizedShopFromQuery = shopFromQuery ? normalizeShopDomain(shopFromQuery) : null;
    let embeddedRedirect: ((url: string, init?: { target?: "_self" | "_parent" | "_top" | "_blank" }) => Response) | null = null;

    const appRedirect = (status: string, reason?: string, shop?: string): Response => {
        const params = new URLSearchParams({ billing: status });
        const resolvedShop = shop || normalizedShopFromQuery;
        if (resolvedShop) params.set("shop", resolvedShop);
        if (reason) params.set("reason", reason);
        const destination = `/app?${params.toString()}`;
        if (embeddedRedirect) {
            return embeddedRedirect(destination, { target: "_parent" });
        }
        return remixRedirect(destination);
    };

    try {
        const { session, admin, redirect } = await authenticate.admin(request);
        embeddedRedirect = redirect;
        const url = callbackUrl;
        const normalizedShop = normalizeShopDomain(session.shop);

        const shop = await getShopByDomain(normalizedShop);
        if (!shop) {
            console.error(`Shop not found in database: ${normalizedShop}`);
            return appRedirect("error", "shop_not_found", normalizedShop);
        }

        const cancelled = url.searchParams.get("cancelled");

        // Merchant explicitly declined or cancelled the charge approval.
        if (cancelled === "true") {
            const wasPremium = shop.plan === "PREMIUM";
            await updateShopPlan(normalizedShop, "FREE");
            if (wasPremium) {
                await onPlanDowngrade(normalizedShop, admin);
            }
            return appRedirect("cancelled", undefined, normalizedShop);
        }

        // Only grant Premium when Shopify confirms an active/pending subscription.
        const activeSub = await getActiveSubscription(admin);
        if (activeSub && (activeSub.status === "ACTIVE" || activeSub.status === "PENDING")) {
            const wasFree = shop.plan === "FREE";
            await updateShopPlan(normalizedShop, "PREMIUM");
            if (wasFree) {
                await onPlanUpgrade(normalizedShop, admin);
            }
            return appRedirect("success", undefined, normalizedShop);
        }

        // No subscription found after callback: keep/free downgrade and ask merchant to retry.
        const wasPremium = shop.plan === "PREMIUM";
        await updateShopPlan(normalizedShop, "FREE");
        if (wasPremium) {
            await onPlanDowngrade(normalizedShop, admin);
        }
        return appRedirect("failed", undefined, normalizedShop);
    } catch (error) {
        console.error("Error handling billing callback:", error);
        if (normalizedShopFromQuery) {
            return remixRedirect(`/auth/login?shop=${encodeURIComponent(normalizedShopFromQuery)}`);
        }
        return appRedirect("error");
    }
};
