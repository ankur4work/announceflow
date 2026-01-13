/**
 * API: /api/billing/callback
 * GET: Handles the redirect from Shopify after charge approval/decline
 */

import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getActiveSubscription } from "../lib/billing.server";
import { updateShopPlan, getShopByDomain } from "../lib/db.server";
import { normalizeShopDomain } from "../lib/auth.server";
import { onPlanUpgrade } from "../lib/metafields.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const { session, admin } = await authenticate.admin(request);
        const url = new URL(request.url);
        
        // Normalize shop domain to ensure consistent format
        const normalizedShop = normalizeShopDomain(session.shop);
        
        console.log(`Billing callback received for shop: ${normalizedShop}`);
        console.log(`Callback URL params:`, Object.fromEntries(url.searchParams.entries()));

        // Check if shop exists in database
        const shop = await getShopByDomain(normalizedShop);
        if (!shop) {
            console.error(`Shop not found in database: ${normalizedShop}`);
            return redirect("/app?billing=error&reason=shop_not_found");
        }

        // Check URL parameters to determine if this is a successful redirect from Shopify
        const chargeId = url.searchParams.get("charge_id");
        const cancelled = url.searchParams.get("cancelled");
        const hmac = url.searchParams.get("hmac");
        
        // If explicitly cancelled, don't proceed
        if (cancelled === "true") {
            console.log(`Billing was cancelled for shop: ${normalizedShop}`);
            return redirect("/app?billing=cancelled");
        }

        // If we're being redirected back from Shopify billing page, it means the user approved
        // We should update the plan regardless of subscription check (which might be delayed)
        // The presence of hmac or charge_id indicates a valid redirect from Shopify
        const isShopifyRedirect = !!(hmac || chargeId || url.searchParams.has("shop"));
        
        if (isShopifyRedirect) {
            console.log(`Shopify billing redirect detected for shop: ${normalizedShop}`);
            
            // Try to verify subscription, but don't fail if it's not immediately available
            let activeSub = null;
            try {
                activeSub = await getActiveSubscription(admin);
                console.log(`Subscription status check result:`, activeSub);
            } catch (subError) {
                console.warn(`Could not verify subscription status, proceeding anyway:`, subError);
            }

            // Update plan if subscription is active/pending, OR if we have a charge_id (user approved)
            if (activeSub && (activeSub.status === "ACTIVE" || activeSub.status === "PENDING")) {
                const wasFree = shop.plan === "FREE";
                await updateShopPlan(normalizedShop, "PREMIUM");
                console.log(`Successfully updated shop ${normalizedShop} to PREMIUM plan (subscription verified)`);
                
                // Handle plan upgrade: update branding settings
                if (wasFree) {
                    await onPlanUpgrade(normalizedShop, admin);
                }
                
                return redirect("/app?billing=success");
            } else if (chargeId) {
                // User approved but subscription not immediately visible - update anyway
                const wasFree = shop.plan === "FREE";
                await updateShopPlan(normalizedShop, "PREMIUM");
                console.log(`Updated shop ${normalizedShop} to PREMIUM plan (charge_id present: ${chargeId})`);
                
                // Handle plan upgrade: update branding settings
                if (wasFree) {
                    await onPlanUpgrade(normalizedShop, admin);
                }
                
                return redirect("/app?billing=success");
            } else {
                // No charge_id and no subscription - might be a direct visit, check current plan
                if (shop.plan === "PREMIUM") {
                    console.log(`Shop already has PREMIUM plan: ${normalizedShop}`);
                    return redirect("/app?billing=success");
                }
                // If we have hmac, it's a valid Shopify redirect, so update anyway
                if (hmac) {
                    const wasFree = shop.plan === "FREE";
                    await updateShopPlan(normalizedShop, "PREMIUM");
                    console.log(`Updated shop ${normalizedShop} to PREMIUM plan (hmac present)`);
                    
                    // Handle plan upgrade: update branding settings
                    if (wasFree) {
                        await onPlanUpgrade(normalizedShop, admin);
                    }
                    
                    return redirect("/app?billing=success");
                }
            }
        }

        // If no Shopify redirect indicators, verify subscription status
        try {
            const activeSub = await getActiveSubscription(admin);
            console.log(`Subscription status check result:`, activeSub);

            if (activeSub && (activeSub.status === "ACTIVE" || activeSub.status === "PENDING")) {
                const wasFree = shop.plan === "FREE";
                await updateShopPlan(normalizedShop, "PREMIUM");
                console.log(`Successfully updated shop ${normalizedShop} to PREMIUM plan`);
                
                // Handle plan upgrade: update branding settings
                if (wasFree) {
                    await onPlanUpgrade(normalizedShop, admin);
                }
                
                return redirect("/app?billing=success");
            }
        } catch (subError) {
            console.error(`Error checking subscription:`, subError);
        }
        
        console.warn(`Could not determine billing status for shop: ${normalizedShop}`);
        return redirect("/app?billing=failed");
    } catch (error) {
        console.error("Error handling billing callback:", error);

        // Try to extract shop from request if authentication failed
        // This can happen when redirecting from Shopify billing page
        try {
            const url = new URL(request.url);
            const shopParam = url.searchParams.get("shop");
            const chargeId = url.searchParams.get("charge_id");

            console.log(`Fallback: shop=${shopParam}, charge_id=${chargeId}`);

            if (shopParam && chargeId) {
                const normalizedShop = normalizeShopDomain(shopParam);
                console.log(`Attempting to update plan for shop from URL param: ${normalizedShop}`);

                // Check if shop exists, if not we can't update (shop should be created during install)
                const shop = await getShopByDomain(normalizedShop);
                if (shop) {
                    await updateShopPlan(normalizedShop, "PREMIUM");
                    console.log(`Successfully updated ${normalizedShop} to PREMIUM via fallback`);
                    return redirect("/app?billing=success");
                } else {
                    console.error(`Shop not found in database for fallback: ${normalizedShop}`);
                    // Redirect to app to trigger re-authentication, then back to callback
                    return redirect(`/app?billing=pending&shop=${encodeURIComponent(normalizedShop)}`);
                }
            }
        } catch (fallbackError) {
            console.error("Fallback update also failed:", fallbackError);
        }
        return redirect("/app?billing=error");
    }
};
