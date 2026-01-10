/**
 * AnnounceFlow Type Definitions
 * Types for bar configurations stored in Shopify metafields
 */

// Bar Types
export type BarType =
  | "announcement"
  | "promotional"
  | "countdown"
  | "email_signup"
  | "free_shipping"
  | "cookie_consent";

// Position Options
export type BarPosition = "top" | "bottom";

// Font Size Options
export type FontSize = "small" | "medium" | "large";

// CTA Button Style
export type CTAStyle = "primary" | "secondary" | "link";

/**
 * Bar Content Configuration
 */
export interface BarContent {
  // Common fields
  text: string;
  cta_text?: string;
  cta_link?: string;
  cta_style?: CTAStyle;
  // Countdown specific fields
  end_datetime?: string; // ISO datetime for countdown end
  expired_text?: string; // Message when countdown ends
}

/**
 * Bar Style Configuration
 */
export interface BarStyle {
  position: BarPosition;
  bg_color: string;
  text_color: string;
  font_size: FontSize;
  padding_vertical?: number;
  sticky?: boolean;
}

/**
 * Bar Display Settings
 */
export interface BarSettings {
  dismissible: boolean;
  show_on_mobile?: boolean;
  show_on_desktop?: boolean;
  cookie_duration?: number; // hours
  hide_when_expired?: boolean; // For countdown bars
}

/**
 * Scheduling Configuration
 */
export interface BarSchedule {
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  timezone?: string;
}

/**
 * Targeting Rules
 */
export interface BarTargeting {
  pages?: string[]; // specific page handles
  exclude_pages?: string[];
  countries?: string[]; // country codes
  customer_tags?: string[];
}

/**
 * Analytics Data
 */
export interface BarAnalytics {
  views: number;
  clicks: number;
  dismissals: number;
  conversions: number;
  last_updated: string;
}

/**
 * Single Bar Configuration
 */
export interface Bar {
  id: string;
  name: string;
  type: BarType;
  enabled: boolean;
  priority: number;
  content: BarContent;
  style: BarStyle;
  settings: BarSettings;
  schedule?: BarSchedule;
  targeting?: BarTargeting;
  analytics?: BarAnalytics;
  created_at: string;
  updated_at: string;
}

/**
 * Global Settings
 */
export interface GlobalSettings {
  shipping_threshold?: number;
  default_position?: BarPosition;
  default_bg_color?: string;
  default_text_color?: string;
  analytics_enabled?: boolean;
  max_bars_displayed?: number;
}

/**
 * Complete Bars Configuration (stored in metafield)
 */
export interface BarsConfig {
  bars: Bar[];
  global_settings: GlobalSettings;
  version: string; // schema version for migrations
}

/**
 * Default empty configuration
 */
export const DEFAULT_BARS_CONFIG: BarsConfig = {
  bars: [],
  global_settings: {
    shipping_threshold: 50,
    default_position: "top",
    default_bg_color: "#000000",
    default_text_color: "#FFFFFF",
    analytics_enabled: true,
    max_bars_displayed: 3,
  },
  version: "1.0.0",
};

/**
 * Generate unique bar ID
 */
export function generateBarId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return "bar_" + timestamp + "_" + random;
}

/**
 * Create a new bar with default values
 */
export function createDefaultBar(overrides: Partial<Bar> = {}): Bar {
  const now = new Date().toISOString();
  return {
    id: generateBarId(),
    name: "New Announcement Bar",
    type: "announcement",
    enabled: false,
    priority: 0,
    content: {
      text: "",
      cta_text: "",
      cta_link: "",
      cta_style: "primary",
    },
    style: {
      position: "top",
      bg_color: "#000000",
      text_color: "#FFFFFF",
      font_size: "medium",
      padding_vertical: 12,
      sticky: false,
    },
    settings: {
      dismissible: true,
      show_on_mobile: true,
      show_on_desktop: true,
      cookie_duration: 24,
    },
    analytics: {
      views: 0,
      clicks: 0,
      dismissals: 0,
      conversions: 0,
      last_updated: now,
    },
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}