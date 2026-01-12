/**
 * API Route: /api/bars
 * GET: List all bars for the shop
 * POST: Create a new bar
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getBarsConfig, createBar, checkBarLimit } from "../lib/metafields.server";
import { getShopByDomain } from "../lib/db.server";
import type { BarType, BarPosition, FontSize, CTAStyle } from "../lib/types";
import { validateBar } from "../lib/validation.server";

// GET /api/bars - List all bars
export const loader = async ({ request }: LoaderFunctionArgs) => {
    try {
        const { admin, session } = await authenticate.admin(request);
        const config = await getBarsConfig(admin);
        
        // Get shop plan and bar counts
        const shop = await getShopByDomain(session.shop);
        const currentPlan = shop?.plan || "FREE";
        const barLimit = currentPlan === "PREMIUM" ? 999 : 1;
        const barCount = config.bars.length;
        const canCreateMore = currentPlan === "PREMIUM" || barCount < barLimit;

        return json({
            success: true,
            bars: config.bars,
            global_settings: config.global_settings,
            plan: currentPlan,
            bar_limit: barLimit,
            bar_count: barCount,
            can_create_more: canCreateMore,
        });
    } catch (error) {
        console.error("Error fetching bars:", error);
        return json(
            { success: false, error: "Failed to fetch bars" },
            { status: 500 }
        );
    }
};

// POST /api/bars - Create new bar
export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return json({ success: false, error: "Method not allowed" }, { status: 405 });
    }

    try {
        const { admin, session } = await authenticate.admin(request);
        const body = await request.json();

        // Check bar limit before creating
        const limitCheck = await checkBarLimit(session.shop, admin);
        if (!limitCheck.allowed) {
            const shop = await getShopByDomain(session.shop);
            return json(
                {
                    error: limitCheck.reason || "Bar limit reached",
                    code: "PLAN_LIMIT",
                    current_plan: limitCheck.currentPlan || shop?.plan || "FREE",
                    bar_limit: limitCheck.barLimit || 1,
                    bar_count: limitCheck.barCount || 0,
                    upgrade_url: "/api/billing/subscribe",
                },
                { status: 402 }
            );
        }

        // Validate input using shared validation logic
        const validation = validateBar(body);
        if (!validation.valid) {
            return json(
                { success: false, error: validation.errors.join(", ") },
                { status: 400 }
            );
        }

        const result = await createBar(admin, {
            name: body.name,
            type: (body.type as BarType) || "promotional",
            enabled: body.enabled || false,
            priority: body.priority || 0,
            content: {
                text: body.content.text,
                cta_text: body.content.cta_text,
                cta_link: body.content.cta_link,
                cta_style: (body.content.cta_style as CTAStyle) || "primary",
                end_datetime: body.content.end_datetime,
                expired_text: body.content.expired_text,
            },
            style: {
                position: (body.style?.position as BarPosition) || "top",
                bg_color: body.style?.bg_color || "#000000",
                text_color: body.style?.text_color || "#ffffff",
                font_size: (body.style?.font_size as FontSize) || "medium",
                padding_vertical: body.style?.padding_vertical || 12,
                sticky: body.style?.sticky || false,
            },
            settings: {
                dismissible: body.settings?.dismissible ?? true,
                show_on_mobile: body.settings?.show_on_mobile ?? true,
                show_on_desktop: body.settings?.show_on_desktop ?? true,
                cookie_duration: body.settings?.cookie_duration || 24,
                hide_when_expired: body.settings?.hide_when_expired || false,
            },
        });

        if (result.success) {
            return json({ success: true, bar: result.bar });
        }

        return json(
            { success: false, error: result.errors?.join(", ") || "Failed to create bar" },
            { status: 500 }
        );
    } catch (error) {
        console.error("Error creating bar:", error);
        return json(
            { success: false, error: "Failed to create bar" },
            { status: 500 }
        );
    }
};
