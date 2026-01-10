// app/types/bar.ts

export type BarType = "promotional" | "countdown" | "shipping" | "email" | "cookie";
export type BarPosition = "top" | "bottom";
export type BarFontSize = "small" | "medium" | "large";

export interface BarContent {
  text: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface BarStyle {
  position: BarPosition;
  bgColor: string;
  textColor: string;
  fontSize: BarFontSize;
}

export interface BarSettings {
  dismissible: boolean;
  countdown?: {
    endDate: string; // ISO date string
    showTimer: boolean;
  };
  shipping?: {
    threshold: number;
    currency: string;
  };
  email?: {
    placeholder: string;
    buttonText: string;
  };
}

export interface Bar {
  id: string;
  type: BarType;
  enabled: boolean;
  content: BarContent;
  style: BarStyle;
  settings: BarSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface BarsMetafieldData {
  bars: Bar[];
}

// Validation helpers
export function isValidBarType(type: string): type is BarType {
  return ["promotional", "countdown", "shipping", "email", "cookie"].includes(type);
}

export function isValidPosition(position: string): position is BarPosition {
  return ["top", "bottom"].includes(position);
}

export function isValidFontSize(size: string): size is BarFontSize {
  return ["small", "medium", "large"].includes(size);
}