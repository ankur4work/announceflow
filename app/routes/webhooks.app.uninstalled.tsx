/**
 * Webhook: app/uninstalled
 * Triggered when a merchant uninstalls the app.
 * Marks the shop as uninstalled in the database but DOES NOT delete data.
 * Validates HMAC signature.
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { verifyWebhookHMAC } from "../lib/webhook.server";
import { markShopUninstalled } from "../lib/db.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret) {
    console.error("SHOPIFY_API_SECRET is not defined");
    return json({ message: "Server error" }, { status: 500 });
  }

  // 1. Verify HMAC
  const isValid = await verifyWebhookHMAC(request, secret);
  if (!isValid) {
    console.warn("Invalid webhook HMAC for app/uninstalled");
    return json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse Payload
  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    console.error("Failed to parse webhook body", err);
    return json({ message: "Bad Request" }, { status: 400 });
  }

  const shopDomain = payload.domain || payload.myshopify_domain;

  console.log(`Received app/uninstalled for ${shopDomain}`);

  if (shopDomain) {
    try {
      // 3. Mark as uninstalled
      await markShopUninstalled(shopDomain);
      console.log(`Shop ${shopDomain} marked as uninstalled`);

      // 4. Clean up sessions (Optional, but good practice)
      try {
        await prisma.session.deleteMany({
          where: { shop: shopDomain },
        });
        console.log(`Sessions cleaned up for ${shopDomain}`);
      } catch (sessionError) {
        console.warn(`Failed to cleanup sessions for ${shopDomain}`, sessionError);
      }
    } catch (error) {
      console.error(`Error handling uninstall for ${shopDomain}:`, error);
    }
  } else {
    console.warn("No domain found in app/uninstalled payload");
  }

  // Always return 200
  return json({ message: "Webhook received" }, { status: 200 });
};
