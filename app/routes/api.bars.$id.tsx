/**
 * API Routes for Single Bar Operations
 * GET /api/bars/:id - Get single bar
 * PUT /api/bars/:id - Update bar
 * DELETE /api/bars/:id - Delete bar
 * PATCH /api/bars/:id - Toggle enabled status
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getBarById,
  updateBar,
  deleteBar,
  toggleBarEnabled,
  checkEnabledBarLimit,
} from "../lib/metafields.server";
import { getShopByDomain } from "../lib/db.server";
import type { BarType, BarPosition, FontSize, CTAStyle } from "../lib/types";
import {
  validateBarText,
  validateBarName,
  validateUrl,
  validatePriority,
  validateScheduleDates,
  validateHexColor,
  validateBarPosition,
  validateFontSize,
  validateCookieDuration,
} from "../lib/validation.server";

// GET /api/bars/:id - Get single bar
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const barId = params.id;

    if (!barId) {
      return json({ success: false, error: "Bar ID is required" }, { status: 400 });
    }

    const bar = await getBarById(admin, barId);

    if (!bar) {
      return json({ success: false, error: "Bar not found" }, { status: 404 });
    }

    return json({ success: true, bar });
  } catch (error) {
    console.error("Error fetching bar:", error);
    return json({ success: false, error: "Failed to fetch bar" }, { status: 500 });
  }
};

// PUT/PATCH/DELETE /api/bars/:id
export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const barId = params.id;

    if (!barId) {
      return json({ success: false, error: "Bar ID is required" }, { status: 400 });
    }

    const method = request.method.toUpperCase();

    // DELETE - Remove bar
    if (method === "DELETE") {
      const result = await deleteBar(admin, barId);

      if (result.success) {
        return json({ success: true, message: "Bar deleted successfully" });
      }

      return json(
        { success: false, error: result.errors?.join(", ") || "Failed to delete bar" },
        { status: 500 }
      );
    }

    // PATCH - Toggle enabled status
    if (method === "PATCH") {
      const body = await request.json().catch(() => ({}));

      // If body has explicit enabled value, update it
      if (typeof body.enabled === "boolean") {
        // Check enabled bar limit if enabling on FREE plan
        if (body.enabled) {
          const limitCheck = await checkEnabledBarLimit(session.shop, admin, barId);
          if (!limitCheck.allowed) {
            const shop = await getShopByDomain(session.shop);
            return json(
              {
                error: limitCheck.reason || "Enabled bar limit reached",
                code: "PLAN_LIMIT",
                current_plan: shop?.plan || "FREE",
                bar_limit: 1,
                enabled_count: limitCheck.enabledCount || 0,
                upgrade_url: "/api/billing/subscribe",
              },
              { status: 402 }
            );
          }
        }

        const result = await updateBar(admin, barId, { enabled: body.enabled });

        if (result.success) {
          return json({
            success: true,
            bar: result.bar,
            message: body.enabled ? "Bar enabled" : "Bar disabled",
          });
        }

        return json(
          { success: false, error: result.errors?.join(", ") || "Failed to update bar" },
          { status: 500 }
        );
      }

      // Otherwise toggle - check limit before toggling
      // Get current bar state first
      const currentBar = await getBarById(admin, barId);
      if (!currentBar) {
        return json({ success: false, error: "Bar not found" }, { status: 404 });
      }

      // If enabling, check limit
      if (!currentBar.enabled) {
        const limitCheck = await checkEnabledBarLimit(session.shop, admin, barId);
        if (!limitCheck.allowed) {
          // Auto-disable other bars instead of returning error (as per requirement)
          // The toggleBarEnabled function will handle this
        }
      }

      // Toggle with shop domain for auto-disable logic
      const result = await toggleBarEnabled(admin, barId, session.shop);

      if (result.success) {
        const response: any = {
          success: true,
          enabled: result.enabled,
          message: result.enabled ? "Bar enabled" : "Bar disabled",
        };
        
        // Include info about auto-disabled bars if any
        if (result.autoDisabled && result.autoDisabled.length > 0) {
          response.auto_disabled = result.autoDisabled;
          response.message += `. ${result.autoDisabled.length} other bar(s) were automatically disabled (Free plan limit: 1 enabled bar).`;
        }

        return json(response);
      }

      return json(
        { success: false, error: result.errors?.join(", ") || "Failed to toggle bar" },
        { status: 500 }
      );
    }

    // PUT - Update bar
    if (method === "PUT") {
      const body = await request.json();
      
      // Check enabled bar limit if enabling on FREE plan
      if (body.enabled === true) {
        const limitCheck = await checkEnabledBarLimit(session.shop, admin, barId);
        if (!limitCheck.allowed) {
          const shop = await getShopByDomain(session.shop);
          return json(
            {
              error: limitCheck.reason || "Enabled bar limit reached",
              code: "PLAN_LIMIT",
              current_plan: shop?.plan || "FREE",
              bar_limit: 1,
              enabled_count: limitCheck.enabledCount || 0,
              upgrade_url: "/api/billing/subscribe",
            },
            { status: 402 }
          );
        }
      }

      // Validate name
      const nameCheck = validateBarName(body.name);
      if (!nameCheck.valid) {
        return json(
          { success: false, error: nameCheck.error },
          { status: 400 }
        );
      }

      // Validate text content
      const textCheck = validateBarText(body.content?.text);
      if (!textCheck.valid) {
        return json(
          { success: false, error: textCheck.error },
          { status: 400 }
        );
      }

      // Validate priority if provided
      if (body.priority !== undefined) {
        const priorityCheck = validatePriority(body.priority);
        if (!priorityCheck.valid) {
          return json(
            { success: false, error: priorityCheck.error },
            { status: 400 }
          );
        }
      }

      // Validate CTA link if provided
      if (body.content?.cta_link && !validateUrl(body.content.cta_link)) {
        return json(
          { success: false, error: "Invalid CTA link URL format" },
          { status: 400 }
        );
      }

      // Validate style if provided
      if (body.style) {
        if (body.style.position) {
          const posCheck = validateBarPosition(body.style.position);
          if (!posCheck.valid) {
            return json(
              { success: false, error: posCheck.error },
              { status: 400 }
            );
          }
        }

        if (body.style.bg_color) {
          const bgCheck = validateHexColor(body.style.bg_color);
          if (!bgCheck.valid) {
            return json(
              { success: false, error: bgCheck.error },
              { status: 400 }
            );
          }
        }

        if (body.style.text_color) {
          const tcCheck = validateHexColor(body.style.text_color);
          if (!tcCheck.valid) {
            return json(
              { success: false, error: tcCheck.error },
              { status: 400 }
            );
          }
        }

        if (body.style.font_size) {
          const fsCheck = validateFontSize(body.style.font_size);
          if (!fsCheck.valid) {
            return json(
              { success: false, error: fsCheck.error },
              { status: 400 }
            );
          }
        }
      }

      // Validate settings if provided
      if (body.settings?.cookie_duration !== undefined) {
        const cookieCheck = validateCookieDuration(body.settings.cookie_duration);
        if (!cookieCheck.valid) {
          return json(
            { success: false, error: cookieCheck.error },
            { status: 400 }
          );
        }
      }

      // Validate schedule if provided
      if (body.schedule) {
        const scheduleCheck = validateScheduleDates(
          body.schedule.start_date,
          body.schedule.end_date
        );
        if (!scheduleCheck.valid) {
          return json(
            { success: false, error: scheduleCheck.error },
            { status: 400 }
          );
        }
      }

      // Validate countdown bars specifically
      if (body.type === "countdown") {
        if (!body.content?.end_datetime) {
          return json(
            { success: false, error: "End datetime is required for countdown bars" },
            { status: 400 }
          );
        }
        const endDate = new Date(body.content.end_datetime);
        if (isNaN(endDate.getTime())) {
          return json(
            { success: false, error: "Invalid end datetime format" },
            { status: 400 }
          );
        }
        if (body.enabled && endDate.getTime() <= Date.now()) {
          return json(
            { success: false, error: "End datetime must be in the future for enabled bars" },
            { status: 400 }
          );
        }
      }

      const result = await updateBar(admin, barId, {
        name: body.name,
        type: body.type as BarType,
        enabled: body.enabled,
        priority: body.priority,
        content: {
          text: body.content.text,
          cta_text: body.content.cta_text,
          cta_link: body.content.cta_link,
          cta_style: body.content.cta_style as CTAStyle,
          end_datetime: body.content.end_datetime,
          expired_text: body.content.expired_text,
        },
        style: {
          position: body.style?.position as BarPosition,
          bg_color: body.style?.bg_color,
          text_color: body.style?.text_color,
          font_size: body.style?.font_size as FontSize,
          padding_vertical: body.style?.padding_vertical,
          sticky: body.style?.sticky,
        },
        settings: {
          dismissible: body.settings?.dismissible,
          show_on_mobile: body.settings?.show_on_mobile,
          show_on_desktop: body.settings?.show_on_desktop,
          cookie_duration: body.settings?.cookie_duration,
          hide_when_expired: body.settings?.hide_when_expired,
        },
      });

      if (result.success) {
        return json({ success: true, bar: result.bar });
      }

      return json(
        { success: false, error: result.errors?.join(", ") || "Failed to update bar" },
        { status: 500 }
      );
    }

    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in bar action:", error);
    return json({ success: false, error: "Server error" }, { status: 500 });
  }
};
