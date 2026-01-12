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

// Auth utilities
export type {
  AuthContext,
  AuthErrorCode,
  SessionTokenPayload,
} from "./auth.server";

export {
  AuthError,
  getShopAccessToken,
  getShopSession,
  hasValidSession,
  normalizeShopDomain,
  extractShopFromUrl,
  isTokenExpired,
} from "./auth.server";

// API Middleware
export type { AuthResult, ApiErrorResponse } from "./middleware.server";

export {
  requireAuth,
  handleAuthError,
  withAuth,
  extractBearerToken,
  hasAuthorizationHeader,
} from "./middleware.server";

// Database Helpers
export {
  prisma,
  getShopByDomain,
  createShop,
  updateShopPlan,
  markShopUninstalled,
  deleteShopData,
  createSubscriber,
  getSubscribersByShop,
  getSubscriberCount,
  getSubscriberStats,
  getSubscriberByEmail,
  deleteSubscriber,
  deleteSubscriberByEmail,
  deleteAllSubscribers,
  exportSubscribersCSV,
  subscriberExists,
} from "./db.server";

// Validation Utilities
export {
  validateEmail,
  validateUrl,
  validateScheduleDates,
  validatePriority,
  validateBarName,
  validateBarText,
  validateHexColor,
  validateCookieDuration,
  validateBarType,
  validateBarPosition,
  validateFontSize,
  validateBar,
} from "./validation.server";

// Rate Limiting
export {
  checkRateLimit,
  getClientIP,
  getRateLimitHeaders,
} from "./rate-limiter.server";

// Webhook Utilities
export { verifyWebhookHMAC, registerAppWebhooks } from "./webhook.server";

// Billing Utilities
export {
  createSubscription,
  getActiveSubscription,
  hasActivePremiumPlan,
  requirePremium
} from "./billing.server";
