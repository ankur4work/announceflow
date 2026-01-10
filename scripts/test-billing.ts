/**
 * Billing API Test Script
 * Tests billing functionality for AnnounceFlow
 *
 * Usage: npx tsx scripts/test-billing.ts [shop-domain]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ANSI color codes for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message: string, type: "pass" | "fail" | "info" | "warn" = "info") {
  const icons = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
  };
  console.log(`${icons[type]} ${message}`);
}

function header(title: string) {
  console.log(`\n${colors.bold}${colors.blue}━━━ ${title} ━━━${colors.reset}\n`);
}

// Test results tracking
const results: { name: string; passed: boolean; error?: string }[] = [];

function recordResult(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  if (passed) {
    log(`${name}`, "pass");
  } else {
    log(`${name}: ${error}`, "fail");
  }
}

// ============================================
// TEST CASES
// ============================================

async function testDatabaseConnection() {
  header("Test 1: Database Connection");
  try {
    await prisma.$connect();
    recordResult("Database connection", true);
    return true;
  } catch (error) {
    recordResult("Database connection", false, String(error));
    return false;
  }
}

async function testShopExists(shopDomain: string) {
  header("Test 2: Shop Record Exists");
  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
    });

    if (shop) {
      recordResult(`Shop found: ${shopDomain}`, true);
      log(`  Current plan: ${shop.plan}`, "info");
      log(`  Installed at: ${shop.installedAt}`, "info");
      return shop;
    } else {
      recordResult("Shop record exists", false, `Shop not found: ${shopDomain}`);
      return null;
    }
  } catch (error) {
    recordResult("Shop record exists", false, String(error));
    return null;
  }
}

async function testPlanUpdate(shopDomain: string) {
  header("Test 3: Plan Update (FREE -> PREMIUM -> FREE)");

  try {
    // Get current plan
    const shopBefore = await prisma.shop.findUnique({
      where: { shopDomain },
    });

    if (!shopBefore) {
      recordResult("Plan update", false, "Shop not found");
      return false;
    }

    const originalPlan = shopBefore.plan;
    log(`  Original plan: ${originalPlan}`, "info");

    // Update to PREMIUM
    await prisma.shop.update({
      where: { shopDomain },
      data: { plan: "PREMIUM" },
    });

    const shopAfterPremium = await prisma.shop.findUnique({
      where: { shopDomain },
    });

    if (shopAfterPremium?.plan !== "PREMIUM") {
      recordResult("Update to PREMIUM", false, `Expected PREMIUM, got ${shopAfterPremium?.plan}`);
      return false;
    }
    recordResult("Update to PREMIUM", true);

    // Update back to FREE
    await prisma.shop.update({
      where: { shopDomain },
      data: { plan: "FREE" },
    });

    const shopAfterFree = await prisma.shop.findUnique({
      where: { shopDomain },
    });

    if (shopAfterFree?.plan !== "FREE") {
      recordResult("Update to FREE", false, `Expected FREE, got ${shopAfterFree?.plan}`);
      return false;
    }
    recordResult("Update to FREE", true);

    // Restore original plan
    await prisma.shop.update({
      where: { shopDomain },
      data: { plan: originalPlan },
    });
    log(`  Restored to original plan: ${originalPlan}`, "info");

    return true;
  } catch (error) {
    recordResult("Plan update", false, String(error));
    return false;
  }
}

async function testBillingConstants() {
  header("Test 4: Billing Configuration");

  try {
    // Read and validate billing.server.ts constants
    const fs = await import("fs");
    const path = await import("path");

    const billingPath = path.join(process.cwd(), "app", "lib", "billing.server.ts");
    const billingContent = fs.readFileSync(billingPath, "utf-8");

    // Check test mode is enabled
    const testModeMatch = billingContent.match(/test:\s*(true|false)/);
    if (testModeMatch) {
      const isTestMode = testModeMatch[1] === "true";
      if (isTestMode) {
        recordResult("Test mode enabled (test: true)", true);
      } else {
        recordResult("Test mode enabled", false, "test: false - PRODUCTION MODE!");
      }
    } else {
      recordResult("Test mode check", false, "Could not find test mode setting");
    }

    // Check plan name
    const planNameMatch = billingContent.match(/PLAN_NAME\s*=\s*["']([^"']+)["']/);
    if (planNameMatch) {
      recordResult(`Plan name: "${planNameMatch[1]}"`, true);
    }

    // Check plan price
    const planPriceMatch = billingContent.match(/PLAN_PRICE\s*=\s*([\d.]+)/);
    if (planPriceMatch) {
      const price = parseFloat(planPriceMatch[1]);
      recordResult(`Plan price: $${price.toFixed(2)} USD`, true);
    }

    // Check interval
    const intervalMatch = billingContent.match(/interval:\s*(\w+)/);
    if (intervalMatch) {
      recordResult(`Billing interval: ${intervalMatch[1]}`, true);
    }

    // Check GraphQL mutation exists
    if (billingContent.includes("appSubscriptionCreate")) {
      recordResult("GraphQL subscription mutation defined", true);
    } else {
      recordResult("GraphQL subscription mutation", false, "Not found");
    }

    // Check active subscription query exists
    if (billingContent.includes("activeSubscriptions")) {
      recordResult("Active subscription query defined", true);
    } else {
      recordResult("Active subscription query", false, "Not found");
    }

    return true;
  } catch (error) {
    recordResult("Billing configuration check", false, String(error));
    return false;
  }
}

async function testBillingRoutes() {
  header("Test 5: Billing Route Files");

  try {
    const fs = await import("fs");
    const path = await import("path");

    const routesDir = path.join(process.cwd(), "app", "routes");

    // Check api.billing.tsx exists
    const billingRoute = path.join(routesDir, "api.billing.tsx");
    if (fs.existsSync(billingRoute)) {
      const content = fs.readFileSync(billingRoute, "utf-8");

      // Check loader (GET)
      if (content.includes("export const loader")) {
        recordResult("GET /api/billing (status endpoint)", true);
      } else {
        recordResult("GET /api/billing", false, "No loader export");
      }

      // Check action (POST)
      if (content.includes("export const action")) {
        recordResult("POST /api/billing (subscribe endpoint)", true);
      } else {
        recordResult("POST /api/billing", false, "No action export");
      }
    } else {
      recordResult("api.billing.tsx exists", false, "File not found");
    }

    // Check api.billing.subscribe.tsx exists
    const subscribeRoute = path.join(routesDir, "api.billing.subscribe.tsx");
    if (fs.existsSync(subscribeRoute)) {
      recordResult("POST /api/billing/subscribe (alternative)", true);
    } else {
      log("  api.billing.subscribe.tsx not found (optional)", "warn");
    }

    // Check api.billing.callback.tsx exists
    const callbackRoute = path.join(routesDir, "api.billing.callback.tsx");
    if (fs.existsSync(callbackRoute)) {
      const content = fs.readFileSync(callbackRoute, "utf-8");

      if (content.includes("export const loader")) {
        recordResult("GET /api/billing/callback (callback handler)", true);
      } else {
        recordResult("Callback handler", false, "No loader export");
      }

      // Check redirect cases
      if (content.includes("billing=success")) {
        recordResult("Success redirect configured", true);
      }
      if (content.includes("billing=cancelled")) {
        recordResult("Cancelled redirect configured", true);
      }
      if (content.includes("billing=failed")) {
        recordResult("Failed redirect configured", true);
      }
    } else {
      recordResult("api.billing.callback.tsx exists", false, "File not found");
    }

    return true;
  } catch (error) {
    recordResult("Billing routes check", false, String(error));
    return false;
  }
}

async function testGraphQLMutation() {
  header("Test 6: GraphQL Mutation Syntax");

  try {
    const fs = await import("fs");
    const path = await import("path");

    const billingPath = path.join(process.cwd(), "app", "lib", "billing.server.ts");
    const content = fs.readFileSync(billingPath, "utf-8");

    // Extract the mutation
    const mutationMatch = content.match(/APP_SUBSCRIPTION_CREATE\s*=\s*`#graphql([\s\S]*?)`/);

    if (mutationMatch) {
      const mutation = mutationMatch[1];

      // Validate required fields
      const requiredFields = [
        { field: "name: $name", desc: "Plan name variable" },
        { field: "returnUrl: $returnUrl", desc: "Return URL variable" },
        { field: "test:", desc: "Test mode flag" },
        { field: "lineItems:", desc: "Line items array" },
        { field: "appRecurringPricingDetails:", desc: "Recurring pricing" },
        { field: "price:", desc: "Price object" },
        { field: "currencyCode:", desc: "Currency code" },
        { field: "confirmationUrl", desc: "Confirmation URL in response" },
        { field: "userErrors", desc: "Error handling" },
      ];

      for (const { field, desc } of requiredFields) {
        if (mutation.includes(field)) {
          recordResult(`${desc}`, true);
        } else {
          recordResult(`${desc}`, false, `Missing: ${field}`);
        }
      }
    } else {
      recordResult("GraphQL mutation extraction", false, "Could not parse mutation");
    }

    return true;
  } catch (error) {
    recordResult("GraphQL mutation validation", false, String(error));
    return false;
  }
}

async function testLiveEndpoint(shopDomain: string) {
  header("Test 7: Live Endpoint Test (requires running server)");

  try {
    // Try to reach the status endpoint
    const response = await fetch("http://localhost:3000/api/status", {
      method: "GET",
    }).catch(() => null);

    if (response) {
      if (response.ok) {
        const data = await response.json();
        recordResult("Server is running", true);
        log(`  Status response: ${JSON.stringify(data)}`, "info");
      } else {
        recordResult("Server responded", true);
        log(`  Status: ${response.status}`, "warn");
      }
    } else {
      log("Server not running (start with: npm run dev)", "warn");
      log("Skipping live endpoint tests", "info");
    }

    return true;
  } catch (error) {
    log("Server not reachable - skipping live tests", "warn");
    return true;
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║   AnnounceFlow Billing API Test Suite  ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  // Get shop domain from args or use default
  let shopDomain = process.argv[2];

  if (!shopDomain) {
    // Try to get first shop from database
    const shops = await prisma.shop.findMany({ take: 1 });
    if (shops.length > 0) {
      shopDomain = shops[0].shopDomain;
      log(`Using shop from database: ${shopDomain}`, "info");
    } else {
      log("No shop domain provided and no shops in database", "warn");
      log("Usage: npx tsx scripts/test-billing.ts your-shop.myshopify.com", "info");
      process.exit(1);
    }
  }

  // Run tests
  await testDatabaseConnection();
  await testShopExists(shopDomain);
  await testPlanUpdate(shopDomain);
  await testBillingConstants();
  await testBillingRoutes();
  await testGraphQLMutation();
  await testLiveEndpoint(shopDomain);

  // Summary
  header("Test Summary");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${total}`);

  if (failed > 0) {
    console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.name}: ${r.error}`);
      });
  }

  console.log(`\n${colors.bold}Manual Testing Steps:${colors.reset}`);
  console.log("1. Start the dev server: npm run dev");
  console.log("2. Open the app in Shopify admin");
  console.log("3. Navigate to billing/upgrade section");
  console.log("4. Click 'Upgrade to Premium'");
  console.log("5. Approve the test charge on Shopify's page");
  console.log("6. Verify redirect to /app?billing=success");
  console.log("7. Confirm plan updated in database\n");

  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("Test suite failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
