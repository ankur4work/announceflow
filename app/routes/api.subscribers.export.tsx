/**
 * Admin API: Export Subscribers as CSV
 * GET /api/subscribers/export
 *
 * Returns CSV file download with columns: email, bar_id, subscribed_at
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain, exportSubscribersCSV } from "../lib/db.server";

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

    // Generate CSV
    const csv = await exportSubscribersCSV(shop.id);

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const filename = `subscribers-${shopDomain.replace(".myshopify.com", "")}-${date}.csv`;

    // Return CSV file download
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error exporting subscribers:", error);
    return json(
      { success: false, error: "Failed to export subscribers" },
      { status: 500 }
    );
  }
};
