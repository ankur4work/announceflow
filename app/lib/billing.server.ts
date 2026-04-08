/**
 * Shopify Billing API Utilities
 * Handles recurring application charges for the Premium plan.
 */

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getShopByDomain } from "./db.server";

// Define generic AdminClient interface
interface AdminClient {
    graphql: (query: string, variables?: Record<string, any>) => Promise<Response>;
}

export const PLAN_NAME = "AnnounceFlow Premium";
export const PLAN_PRICE = 99.00;
export const CURRENCY_CODE = "USD";
export const PLAN_TRIAL_DAYS = 0;

// Determine if we should use test mode
// Test mode is enabled if:
//   1. NODE_ENV is NOT "production" (default for development), OR
//   2. BILLING_TEST_MODE is explicitly set to "true"
// This ensures test mode is ALWAYS used in development
const USE_TEST_MODE = 
    process.env.NODE_ENV !== "production" || 
    process.env.BILLING_TEST_MODE === "true";

// Log the test mode status for debugging (always log to help diagnose issues)
console.log(`[Billing] Configuration - Test mode: ${USE_TEST_MODE}, NODE_ENV: ${process.env.NODE_ENV || 'undefined'}, BILLING_TEST_MODE: ${process.env.BILLING_TEST_MODE || 'undefined'}`);

// GraphQL Mutations & Queries
// Create two versions: one with test mode, one without
const APP_SUBSCRIPTION_CREATE_WITH_TEST = `#graphql
  mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $amount: Decimal!, $trialDays: Int!) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: true
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { amount: $amount, currencyCode: USD }
            interval: EVERY_30_DAYS
          }
        }
      }]
    ) {
      appSubscription {
        id
        status
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

const APP_SUBSCRIPTION_CREATE_PRODUCTION = `#graphql
  mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $amount: Decimal!, $trialDays: Int!) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { amount: $amount, currencyCode: USD }
            interval: EVERY_30_DAYS
          }
        }
      }]
    ) {
      appSubscription {
        id
        status
        test
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Create a new recurring subscription
 */
export async function createSubscription(
    admin: AdminClient,
    returnUrl: string
): Promise<string> {
    try {
        // Do not create a duplicate charge if subscription already exists.
        const existingSubscription = await getActiveSubscription(admin);
        if (existingSubscription) {
            throw new Error("An active Premium subscription already exists for this store.");
        }

        // Build variables object
        const variables = {
            name: PLAN_NAME,
            returnUrl,
            amount: PLAN_PRICE,
            trialDays: PLAN_TRIAL_DAYS,
        };
        
        // Use the appropriate query based on test mode
        const query = USE_TEST_MODE 
            ? APP_SUBSCRIPTION_CREATE_WITH_TEST 
            : APP_SUBSCRIPTION_CREATE_PRODUCTION;

        // Log which query is being used
        console.log(`[Billing] Creating subscription with test mode: ${USE_TEST_MODE}`);
        console.log(`[Billing] Using ${USE_TEST_MODE ? 'TEST' : 'PRODUCTION'} query`);

        const response = await admin.graphql(query, {
            variables,
        });

        const responseJson = await response.json();
        
        // Check for GraphQL errors
        if (responseJson.errors) {
            console.error("GraphQL errors in createSubscription:", responseJson.errors);
            const errorMessages = responseJson.errors.map((e: any) => e.message).join(", ");
            
            // If we get a distribution error and we're not in test mode, provide helpful message
            if (errorMessages.includes("public distribution") || errorMessages.includes("Billing API") || errorMessages.includes("without a public distribution")) {
                // If we're in development but test mode wasn't used, that's a bug
                if (process.env.NODE_ENV !== "production" && !USE_TEST_MODE) {
                    console.error("[Billing] ERROR: In development but test mode was not enabled! This should not happen.");
                    throw new Error(
                        "Billing test mode error: The app is in development but test mode was not enabled. " +
                        "Please check your environment configuration. NODE_ENV=" + (process.env.NODE_ENV || "undefined")
                    );
                }
                
                // If we ARE using test mode but still get this error, it might be a Shopify API issue
                if (USE_TEST_MODE) {
                    throw new Error(
                        "Billing API error: Even with test mode enabled, Shopify requires the app to be in a development store context. " +
                        "Make sure you're testing on a development store. " +
                        "If this persists, the app may need to be published to the Shopify App Store for production use."
                    );
                }
                
                throw new Error(
                    "Billing API requires the app to be published to the Shopify App Store for production use. " +
                    "For development, ensure you're using a development store and test mode is enabled."
                );
            }

            if (errorMessages.includes("already has an active payment")) {
                throw new Error("This store already has an active Premium subscription.");
            }
            
            throw new Error(errorMessages);
        }
        
        const data = responseJson.data?.appSubscriptionCreate;

        if (data?.userErrors?.length > 0) {
            console.error("Billing userErrors:", data.userErrors);
            const errorMessages = data.userErrors.map((e: any) => e.message).join(", ");
            
            // If we get a distribution error and we're not in test mode, provide helpful message
            if (errorMessages.includes("public distribution") || errorMessages.includes("Billing API") || errorMessages.includes("without a public distribution")) {
                // If we're in development but test mode wasn't used, that's a bug
                if (process.env.NODE_ENV !== "production" && !USE_TEST_MODE) {
                    console.error("[Billing] ERROR: In development but test mode was not enabled! This should not happen.");
                    throw new Error(
                        "Billing test mode error: The app is in development but test mode was not enabled. " +
                        "Please check your environment configuration. NODE_ENV=" + (process.env.NODE_ENV || "undefined")
                    );
                }
                
                // If we ARE using test mode but still get this error, it might be a Shopify API issue
                if (USE_TEST_MODE) {
                    throw new Error(
                        "Billing API error: Even with test mode enabled, Shopify requires the app to be in a development store context. " +
                        "Make sure you're testing on a development store. " +
                        "If this persists, the app may need to be published to the Shopify App Store for production use."
                    );
                }
                
                throw new Error(
                    "Billing API requires the app to be published to the Shopify App Store for production use. " +
                    "For development, ensure you're using a development store and test mode is enabled."
                );
            }

            if (errorMessages.includes("already has an active payment")) {
                throw new Error("This store already has an active Premium subscription.");
            }
            
            throw new Error(errorMessages);
        }

        if (!data?.confirmationUrl) {
            throw new Error("No confirmation URL returned from billing API");
        }

        return data.confirmationUrl;
    } catch (error) {
        console.error("Error creating subscription:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to create subscription");
    }
}

/**
 * Get active subscription for the shop
 * Returns subscription if it's ACTIVE or PENDING (pending means approved but not yet activated)
 */
export async function getActiveSubscription(
    admin: AdminClient
): Promise<any | null> {
    try {
        const response = await admin.graphql(`#graphql
        query {
          appInstallation {
            activeSubscriptions {
              id
              name
              status
              test
            }
          }
        }
      `);

        const responseJson = await response.json();
        
        if (responseJson.errors) {
            console.error("GraphQL errors in getActiveSubscription:", responseJson.errors);
            return null;
        }
        
        const subscriptions = responseJson.data?.appInstallation?.activeSubscriptions || [];
        console.log(`Found ${subscriptions.length} subscriptions:`, subscriptions);

        // Find our specific plan - accept both ACTIVE and PENDING statuses
        // PENDING means the subscription was approved but may take a moment to activate
        const subscription = subscriptions.find((sub: any) => 
            (sub.status === "ACTIVE" || sub.status === "PENDING") && 
            sub.name === PLAN_NAME
        );
        
        return subscription || null;
    } catch (error) {
        console.error("Error fetching active subscription:", error);
        return null;
    }
}

/**
 * Check if shop has active premium plan in database
 */
export async function hasActivePremiumPlan(shopDomain: string): Promise<boolean> {
    const shop = await getShopByDomain(shopDomain);
    return shop?.plan === "PREMIUM";
}

/**
 * Middleware: Require Premium Plan
 * Throws 402 Payment Required response if not on premium
 */
export async function requirePremium(request: Request) {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const hasPremium = await hasActivePremiumPlan(shop);

    if (!hasPremium) {
        throw json({
            message: "Premium plan required",
            upgradeUrl: "/app/settings" // Assuming settings page has upgrade button
        }, { status: 402 });
    }

    return true;
}
