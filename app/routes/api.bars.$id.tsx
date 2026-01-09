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
} from "../lib/metafields.server";
import type { BarType, BarPosition, FontSize, CTAStyle } from "../lib/types";

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
    const { admin } = await authenticate.admin(request);
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

      // Otherwise toggle
      const result = await toggleBarEnabled(admin, barId);

      if (result.success) {
        return json({
          success: true,
          enabled: result.enabled,
          message: result.enabled ? "Bar enabled" : "Bar disabled",
        });
      }

      return json(
        { success: false, error: result.errors?.join(", ") || "Failed to toggle bar" },
        { status: 500 }
      );
    }

    // PUT - Update bar
    if (method === "PUT") {
      const body = await request.json();

      // Validate required fields
      if (!body.name || !body.content?.text) {
        return json(
          { success: false, error: "Name and text are required" },
          { status: 400 }
        );
      }

      // Validate countdown bars
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
