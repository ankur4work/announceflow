/**
 * UI Utility Functions
 * Helper functions for form validation, color contrast, and UX improvements
 */

/**
 * Calculate color contrast ratio (WCAG)
 * Returns a ratio between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
        const rgb = hexToRgb(hex);
        if (!rgb) return 0;
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 * Returns true if contrast ratio >= 4.5:1 for normal text
 */
export function hasGoodContrast(bgColor: string, textColor: string): boolean {
    return getContrastRatio(bgColor, textColor) >= 4.5;
}

/**
 * Get contrast warning message
 */
export function getContrastWarning(bgColor: string, textColor: string): string | null {
    const ratio = getContrastRatio(bgColor, textColor);
    if (ratio < 3) {
        return "Very poor contrast. Text will be unreadable.";
    }
    if (ratio < 4.5) {
        return "Low contrast. Text may be hard to read.";
    }
    return null;
}

/**
 * Format character count with limit
 */
export function formatCharCount(current: number, max?: number): string {
    if (max) {
        return `${current}/${max}`;
    }
    return `${current}`;
}

/**
 * Check if character count exceeds limit
 */
export function exceedsCharLimit(current: number, max?: number): boolean {
    if (!max) return false;
    return current > max;
}
