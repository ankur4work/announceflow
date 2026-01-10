/**
 * AnnounceFlow Metafields Server Utilities
 * GraphQL operations for reading/writing bar configurations to Shopify metafields
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { Bar, BarsConfig } from "./types";
import { DEFAULT_BARS_CONFIG, createDefaultBar } from "./types";

// Metafield constants
export const METAFIELD_NAMESPACE = "announceflow";
export const METAFIELD_KEY = "bars_config";
export const METAFIELD_TYPE = "json";

/**
 * GraphQL Queries
 */

// Query to get shop metafield
const GET_BARS_CONFIG_QUERY = `#graphql
  query GetBarsConfig {
    shop {
      id
      metafield(namespace: "announceflow", key: "bars_config") {
        id
        namespace
        key
        value
        type
      }
    }
  }
`;

// Mutation to set/update shop metafield
const SET_BARS_CONFIG_MUTATION = `#graphql
  mutation SetBarsConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Query to get shop ID
const GET_SHOP_ID_QUERY = `#graphql
  query GetShopId {
    shop {
      id
    }
  }
`;

/**
 * Type definitions for GraphQL responses
 */
interface ShopMetafieldResponse {
  shop: {
    id: string;
    metafield: {
      id: string;
      namespace: string;
      key: string;
      value: string;
      type: string;
    } | null;
  };
}

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: Array<{
      id: string;
      namespace: string;
      key: string;
      value: string;
    }>;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface ShopIdResponse {
  shop: {
    id: string;
  };
}

/**
 * Get the shop's GID for metafield operations
 */
async function getShopId(admin: AdminApiContext): Promise<string> {
  const response = await admin.graphql(GET_SHOP_ID_QUERY);
  const json = await response.json();
  const data = json.data as ShopIdResponse;
  return data.shop.id;
}

/**
 * Read bar configuration from metafields
 * Returns the stored config or default if none exists
 */
export async function getBarsConfig(
  admin: AdminApiContext
): Promise<BarsConfig> {
  try {
    const response = await admin.graphql(GET_BARS_CONFIG_QUERY);
    const json = await response.json();
    const data = json.data as ShopMetafieldResponse;

    if (data.shop.metafield?.value) {
      const config = JSON.parse(data.shop.metafield.value) as BarsConfig;
      return {
        ...DEFAULT_BARS_CONFIG,
        ...config,
      };
    }

    return DEFAULT_BARS_CONFIG;
  } catch (error) {
    console.error("Error reading bars config:", error);
    return DEFAULT_BARS_CONFIG;
  }
}

/**
 * Write bar configuration to metafields
 */
export async function setBarsConfig(
  admin: AdminApiContext,
  config: BarsConfig
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const shopId = await getShopId(admin);

    const response = await admin.graphql(SET_BARS_CONFIG_MUTATION, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: METAFIELD_TYPE,
            value: JSON.stringify(config),
          },
        ],
      },
    });

    const json = await response.json();
    const data = json.data as MetafieldsSetResponse;

    if (data.metafieldsSet.userErrors.length > 0) {
      return {
        success: false,
        errors: data.metafieldsSet.userErrors.map((e) => e.message),
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error writing bars config:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Get a single bar by ID
 */
export async function getBarById(
  admin: AdminApiContext,
  barId: string
): Promise<Bar | null> {
  const config = await getBarsConfig(admin);
  return config.bars.find((bar) => bar.id === barId) || null;
}

/**
 * Get all enabled bars
 */
export async function getEnabledBars(
  admin: AdminApiContext
): Promise<Bar[]> {
  const config = await getBarsConfig(admin);
  return config.bars
    .filter((bar) => bar.enabled)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Create a new bar
 */
export async function createBar(
  admin: AdminApiContext,
  barData: Partial<Bar>
): Promise<{ success: boolean; bar?: Bar; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);
    const newBar = createDefaultBar(barData);

    config.bars.push(newBar);

    const result = await setBarsConfig(admin, config);

    if (result.success) {
      return { success: true, bar: newBar };
    }

    return { success: false, errors: result.errors };
  } catch (error) {
    console.error("Error creating bar:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Update an existing bar
 */
export async function updateBar(
  admin: AdminApiContext,
  barId: string,
  updates: Partial<Bar>
): Promise<{ success: boolean; bar?: Bar; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);
    const barIndex = config.bars.findIndex((bar) => bar.id === barId);

    if (barIndex === -1) {
      return { success: false, errors: ["Bar not found"] };
    }

    const updatedBar: Bar = {
      ...config.bars[barIndex],
      ...updates,
      id: barId,
      updated_at: new Date().toISOString(),
    };

    config.bars[barIndex] = updatedBar;

    const result = await setBarsConfig(admin, config);

    if (result.success) {
      return { success: true, bar: updatedBar };
    }

    return { success: false, errors: result.errors };
  } catch (error) {
    console.error("Error updating bar:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Delete a bar by ID
 */
export async function deleteBar(
  admin: AdminApiContext,
  barId: string
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);
    const barIndex = config.bars.findIndex((bar) => bar.id === barId);

    if (barIndex === -1) {
      return { success: false, errors: ["Bar not found"] };
    }

    config.bars.splice(barIndex, 1);

    return await setBarsConfig(admin, config);
  } catch (error) {
    console.error("Error deleting bar:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Toggle bar enabled status
 */
export async function toggleBarEnabled(
  admin: AdminApiContext,
  barId: string
): Promise<{ success: boolean; enabled?: boolean; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);
    const bar = config.bars.find((b) => b.id === barId);

    if (!bar) {
      return { success: false, errors: ["Bar not found"] };
    }

    bar.enabled = !bar.enabled;
    bar.updated_at = new Date().toISOString();

    const result = await setBarsConfig(admin, config);

    if (result.success) {
      return { success: true, enabled: bar.enabled };
    }

    return { success: false, errors: result.errors };
  } catch (error) {
    console.error("Error toggling bar:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Duplicate a bar
 */
export async function duplicateBar(
  admin: AdminApiContext,
  barId: string
): Promise<{ success: boolean; bar?: Bar; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);
    const originalBar = config.bars.find((bar) => bar.id === barId);

    if (!originalBar) {
      return { success: false, errors: ["Bar not found"] };
    }

    const duplicatedBar = createDefaultBar({
      ...originalBar,
      name: originalBar.name + " (Copy)",
      enabled: false,
    });

    config.bars.push(duplicatedBar);

    const result = await setBarsConfig(admin, config);

    if (result.success) {
      return { success: true, bar: duplicatedBar };
    }

    return { success: false, errors: result.errors };
  } catch (error) {
    console.error("Error duplicating bar:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Reorder bars (update priorities)
 */
export async function reorderBars(
  admin: AdminApiContext,
  barIds: string[]
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);

    barIds.forEach((id, index) => {
      const bar = config.bars.find((b) => b.id === id);
      if (bar) {
        bar.priority = barIds.length - index;
        bar.updated_at = new Date().toISOString();
      }
    });

    return await setBarsConfig(admin, config);
  } catch (error) {
    console.error("Error reordering bars:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Update global settings
 */
export async function updateGlobalSettings(
  admin: AdminApiContext,
  settings: Partial<BarsConfig["global_settings"]>
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    const config = await getBarsConfig(admin);

    config.global_settings = {
      ...config.global_settings,
      ...settings,
    };

    return await setBarsConfig(admin, config);
  } catch (error) {
    console.error("Error updating global settings:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Get global settings
 */
export async function getGlobalSettings(
  admin: AdminApiContext
): Promise<BarsConfig["global_settings"]> {
  const config = await getBarsConfig(admin);
  return config.global_settings;
}
