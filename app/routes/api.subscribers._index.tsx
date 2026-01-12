/**
 * Admin API: Subscribers List Endpoint
 * GET /api/subscribers - List all subscribers for current shop (with pagination)
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 *
 * Response: { subscribers: [...], total: number, limit: number, offset: number }
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getShopByDomain,
  getSubscribersByShop,
  getSubscriberCount,
  getSubscriberStats,
} from "../lib/db.server";

// Maximum items per page
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    // Get shop from database
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    let limit = parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    let offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Validate and constrain parameters
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (isNaN(offset) || offset < 0) offset = 0;

    // Fetch subscribers and count in parallel
    const [subscribers, total, stats] = await Promise.all([
      getSubscribersByShop(shop.id, limit, offset),
      getSubscriberCount(shop.id),
      getSubscriberStats(shop.id),
    ]);

    // Format subscribers for response
    const formattedSubscribers = subscribers.map((sub) => ({
      id: sub.id,
      email: sub.email,
      bar_id: sub.barId,
      subscribed_at: sub.createdAt.toISOString(),
      ip_address: sub.ipAddress,
    }));

    return json({
      success: true,
      subscribers: formattedSubscribers,
      total,
      limit,
      offset,
      stats: {
        total: stats.total,
        this_week: stats.thisWeek,
        this_month: stats.thisMonth,
      },
      has_more: offset + subscribers.length < total,
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return json(
      { success: false, error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
};
