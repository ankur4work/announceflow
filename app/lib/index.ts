/**
 * AnnounceFlow Library Exports
 */

// Types
export type {
  BarType,
  BarPosition,
  FontSize,
  CTAStyle,
  BarContent,
  BarStyle,
  BarSettings,
  BarSchedule,
  BarTargeting,
  BarAnalytics,
  Bar,
  GlobalSettings,
  BarsConfig,
} from "./types";

export { DEFAULT_BARS_CONFIG, generateBarId, createDefaultBar } from "./types";

// Metafields operations
export {
  METAFIELD_NAMESPACE,
  METAFIELD_KEY,
  METAFIELD_TYPE,
  getBarsConfig,
  setBarsConfig,
  getBarById,
  getEnabledBars,
  createBar,
  updateBar,
  deleteBar,
  toggleBarEnabled,
  duplicateBar,
  reorderBars,
  updateGlobalSettings,
  getGlobalSettings,
} from "./metafields.server";
