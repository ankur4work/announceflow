/**
 * Admin API: Single Subscriber Operations
 * GET /api/subscribers/:id - Get single subscriber details
 * DELETE /api/subscribers/:id - Delete a subscriber
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain, deleteSubscriber } from "../lib/db.server";
import prisma from "../db.server";

// GET /api/subscribers/:id - Get single subscriber
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;
    const subscriberId = params.id;

    if (!subscriberId) {
      return json(
        { success: false, error: "Subscriber ID is required" },
        { status: 400 }
      );
    }

    // Get shop from database
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Find subscriber (verify it belongs to this shop)
    const subscriber = await prisma.emailSubscriber.findFirst({
      where: {
        id: subscriberId,
        shopId: shop.id,
      },
    });

    if (!subscriber) {
      return json(
        { success: false, error: "Subscriber not found" },
        { status: 404 }
      );
    }

    return json({
      success: true,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        bar_id: subscriber.barId,
        subscribed_at: subscriber.createdAt.toISOString(),
        ip_address: subscriber.ipAddress,
      },
    });
  } catch (error) {
    console.error("Error fetching subscriber:", error);
    return json(
      { success: false, error: "Failed to fetch subscriber" },
      { status: 500 }
    );
  }
};

// DELETE /api/subscribers/:id - Delete subscriber
export const action = async ({ request, params }: ActionFunctionArgs) => {
  // Only allow DELETE method
  if (request.method !== "DELETE") {
    return json(
      { success: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;
    const subscriberId = params.id;

    if (!subscriberId) {
      return json(
        { success: false, error: "Subscriber ID is required" },
        { status: 400 }
      );
    }

    // Get shop from database
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Delete subscriber (verifies shop ownership)
    const deleted = await deleteSubscriber(subscriberId, shop.id);

    if (!deleted) {
      return json(
        { success: false, error: "Subscriber not found" },
        { status: 404 }
      );
    }

    return json({
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    return json(
      { success: false, error: "Failed to delete subscriber" },
      { status: 500 }
    );
  }
};
