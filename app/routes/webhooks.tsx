/**
 * Webhook Dispatcher: /webhooks
 * Minimal implementation to debug 500 error.
 */

import type { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
    const secret = process.env.SHOPIFY_API_SECRET;

    console.log("[webhooks] Request received");
    console.log("[webhooks] HMAC header present:", !!hmacHeader);
    console.log("[webhooks] Secret present:", !!secret);

    // If no secret configured or no HMAC header, return 401
    if (!secret || !hmacHeader) {
      console.log("[webhooks] Missing secret or HMAC, returning 401");
      return new Response("Unauthorized", { status: 401 });
    }

    // Read body
    const body = await request.text();
    console.log("[webhooks] Body length:", body.length);

    // Simple HMAC check using Web Crypto API (works in Vercel Edge)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const bodyData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, bodyData);
    const calculatedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

    console.log("[webhooks] Calculated HMAC:", calculatedHmac.substring(0, 10) + "...");
    console.log("[webhooks] Received HMAC:", hmacHeader.substring(0, 10) + "...");

    // Compare HMAC
    if (calculatedHmac !== hmacHeader) {
      console.log("[webhooks] HMAC mismatch, returning 401");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[webhooks] HMAC valid");

    // Parse and handle
    const payload = JSON.parse(body);
    const topic = request.headers.get("X-Shopify-Topic");

    return new Response(JSON.stringify({ received: true, topic }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[webhooks] Error:", error);
    // Return 401 for any error
    return new Response("Unauthorized", { status: 401 });
  }
};
