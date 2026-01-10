import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Validate required environment variables
const requiredEnvVars = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SCOPES",
  "SHOPIFY_APP_URL",
] as const;

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  console.error(
    "Please create a .env file with required variables. See .env.example or README.md"
  );
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
      console.log("Creating or updating shop record for:", session.shop);
      // Import here dynamically to avoid circular dependencies if any, 
      // or just trust the imports at top are fine. 
      // But wait, createShop is not imported. I need to add import or use dynamic import.
      // Let's add the import at the top first? No, replace_file_content can't do two places easily.
      // I will use dynamic import or just rely on global prisma if needed, but db.server.ts exports createShop.
      // Actually, I can just use prisma directly here if createShop is too complex to import mid-file?
      // No, best practice is to use the helper.
      // Let's assume I will add the import in a separate tool call if needed, 
      // OR I can just use prisma.shop.upsert here directly for simplicity and reliability.

      const { createShop, getShopByDomain } = await import("./lib/db.server");
      const existing = await getShopByDomain(session.shop);
      if (!existing && session.accessToken) {
        await createShop(session.shop, session.accessToken);
      }
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

