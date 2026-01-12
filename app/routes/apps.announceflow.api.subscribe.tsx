/**
 * Storefront API: Email Subscription Endpoint
 * POST /apps/announceflow/api/subscribe
 *
 * This endpoint is called from the Theme Extension (storefront), NOT admin.
 * Handles CORS for cross-origin requests from the storefront.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { validateEmail } from "../lib/validation.server";
import {
  createSubscriber,
  getShopByDomain,
  subscriberExists,
} from "../lib/db.server";
import {
  checkRateLimit,
  getClientIP,
  getRateLimitHeaders,
} from "../lib/rate-limiter.server";

// CORS headers for storefront requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shop-Domain",
  "Access-Control-Max-Age": "86400", // 24 hours
};

/**
 * Handle CORS preflight requests
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // GET requests not allowed
  return json(
    { success: false, error: "Method not allowed" },
    { status: 405, headers: CORS_HEADERS }
  );
};

/**
 * Handle POST subscription requests
 * Request body: { email: string, bar_id: string }
 * Headers: X-Shop-Domain (required)
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: CORS_HEADERS }
    );
  }

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Get shop domain from header
    const shopDomain = request.headers.get("X-Shop-Domain");
    if (!shopDomain) {
      return json(
        { success: false, error: "Shop domain is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Rate limit by IP + shop combination
    const rateLimitKey = `subscribe:${shopDomain}:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime),
          },
        }
      );
    }

    // Parse request body
    let body: { email?: string; bar_id?: string };
    try {
      body = await request.json();
    } catch {
      return json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { email, bar_id } = body;

    // Validate email
    if (!email) {
      return json(
        { success: false, error: "Email is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return json(
        { success: false, error: emailValidation.error },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate bar_id
    if (!bar_id || typeof bar_id !== "string") {
      return json(
        { success: false, error: "Bar ID is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Get shop from database
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      console.error(`Shop not found for subscription: ${shopDomain}`);
      return json(
        { success: false, error: "Shop not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Check if shop was uninstalled
    if (shop.uninstalledAt) {
      return json(
        { success: false, error: "App not installed for this shop" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate
    const exists = await subscriberExists(shop.id, normalizedEmail);
    if (exists) {
      // Return success even for duplicates to prevent email enumeration
      // but don't create a new record
      return json(
        { success: true, message: "Subscribed successfully" },
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime),
          },
        }
      );
    }

    // Create subscriber
    await createSubscriber(shop.id, normalizedEmail, bar_id, clientIP);

    console.log(
      `New subscriber: ${normalizedEmail} for shop ${shopDomain} from bar ${bar_id}`
    );

    return json(
      { success: true, message: "Subscribed successfully" },
      {
        status: 201,
        headers: {
          ...CORS_HEADERS,
          ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime),
        },
      }
    );
  } catch (error) {
    console.error("Error processing subscription:", error);
    return json(
      { success: false, error: "Failed to process subscription" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
