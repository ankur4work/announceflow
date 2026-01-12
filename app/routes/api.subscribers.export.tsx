/**
 * Admin API: Export Subscribers as CSV
 * GET /api/subscribers/export
 *
 * Returns CSV file download with columns: Email, Bar Name, Subscribed Date
 *
 * Features:
 * - Premium-only feature (returns 402 if not premium)
 * - Resolves bar IDs to bar names from metafields
 * - Human-readable date formatting
 * - Streaming for large exports (> 1000 rows)
 * - Proper CSV escaping for special characters
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain, getSubscribersByShop, getSubscriberCount } from "../lib/db.server";
import { getBarsConfig } from "../lib/metafields.server";
import type { Bar } from "../lib/types";

// Threshold for streaming (number of rows)
const STREAMING_THRESHOLD = 1000;

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";

  // Check if value needs escaping
  const needsEscaping = /[",\n\r]/.test(value);

  if (needsEscaping) {
    // Escape internal quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Format date to human-readable format
 * Example: "Jan 11, 2026 10:30 AM"
 */
function formatDateHuman(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Create a bar ID to name mapping from config
 */
function createBarNameMap(bars: Bar[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const bar of bars) {
    map.set(bar.id, bar.name);
  }
  return map;
}

/**
 * Generate CSV header row
 */
function getCSVHeader(): string {
  return "Email,Bar Name,Subscribed Date\n";
}

/**
 * Generate a single CSV row
 */
function generateCSVRow(
  email: string,
  barId: string,
  subscribedAt: Date,
  barNameMap: Map<string, string>
): string {
  const barName = barNameMap.get(barId) || barId; // Fallback to ID if name not found
  const formattedDate = formatDateHuman(subscribedAt.toISOString());

  return `${escapeCSVValue(email)},${escapeCSVValue(barName)},${escapeCSVValue(formattedDate)}\n`;
}

/**
 * Generate complete CSV content (for small exports)
 */
async function generateCSVContent(
  shopId: string,
  barNameMap: Map<string, string>
): Promise<string> {
  const subscribers = await getSubscribersByShop(shopId);

  let csv = getCSVHeader();

  for (const sub of subscribers) {
    csv += generateCSVRow(sub.email, sub.barId, sub.createdAt, barNameMap);
  }

  return csv;
}

/**
 * Create a streaming response for large exports
 */
function createStreamingResponse(
  shopId: string,
  barNameMap: Map<string, string>,
  filename: string
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send header
        controller.enqueue(encoder.encode(getCSVHeader()));

        // Fetch and stream in batches
        const BATCH_SIZE = 500;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const subscribers = await getSubscribersByShop(shopId, BATCH_SIZE, offset);

          if (subscribers.length === 0) {
            hasMore = false;
            break;
          }

          for (const sub of subscribers) {
            const row = generateCSVRow(sub.email, sub.barId, sub.createdAt, barNameMap);
            controller.enqueue(encoder.encode(row));
          }

          offset += subscribers.length;
          hasMore = subscribers.length === BATCH_SIZE;
        }

        controller.close();
      } catch (error) {
        console.error("Error streaming CSV:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Transfer-Encoding": "chunked",
    },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    // Get shop from database
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Premium check - CSV export is a premium feature
    if (shop.plan !== "PREMIUM") {
      return json(
        {
          success: false,
          error: "CSV export is a premium feature. Please upgrade your plan.",
          code: "PREMIUM_REQUIRED",
        },
        { status: 402 }
      );
    }

    // Get bar configuration to resolve bar names
    const barsConfig = await getBarsConfig(admin);
    const barNameMap = createBarNameMap(barsConfig.bars);

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const shopName = shopDomain.replace(".myshopify.com", "");
    const filename = `subscribers-${shopName}-${date}.csv`;

    // Check subscriber count to decide between streaming and regular response
    const subscriberCount = await getSubscriberCount(shop.id);

    // Handle empty subscribers case
    if (subscriberCount === 0) {
      return new Response(getCSVHeader(), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Use streaming for large exports
    if (subscriberCount > STREAMING_THRESHOLD) {
      console.log(`Streaming CSV export for ${subscriberCount} subscribers`);
      return createStreamingResponse(shop.id, barNameMap, filename);
    }

    // Regular export for smaller datasets
    const csv = await generateCSVContent(shop.id, barNameMap);

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
