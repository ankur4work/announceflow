/**
 * AnnounceFlow Validation Utilities
 * Helper functions for validating bar configurations and user input
 */

/**
 * Validate email format
 * Uses RFC 5322 compliant regex pattern
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: false, error: "Email cannot be empty" };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long" };
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Validate if a string is a valid URL
 * Accepts both full URLs (https://...) and domains (example.com)
 */
export function validateUrl(url: string): boolean {
  if (!url) return true; // Allow empty URLs (optional field)
  
  try {
    // If it doesn't start with http, assume https
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    new URL(fullUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate schedule dates
 * Ensures start_date < end_date and both are valid ISO dates
 */
export function validateScheduleDates(
  startDate?: string,
  endDate?: string
): { valid: boolean; error?: string } {
  if (!startDate && !endDate) {
    return { valid: true };
  }

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return { valid: false, error: "Invalid start_date format (use ISO 8601)" };
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return { valid: false, error: "Invalid end_date format (use ISO 8601)" };
    }

    if (startDate) {
      const start = new Date(startDate);
      if (end.getTime() <= start.getTime()) {
        return {
          valid: false,
          error: "end_date must be after start_date",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate priority value
 * Must be between 0 and 100
 */
export function validatePriority(priority?: number): {
  valid: boolean;
  error?: string;
} {
  if (priority === undefined || priority === null) {
    return { valid: true }; // Default to 0 is fine
  }

  if (!Number.isInteger(priority)) {
    return { valid: false, error: "Priority must be an integer" };
  }

  if (priority < 0 || priority > 100) {
    return { valid: false, error: "Priority must be between 0 and 100" };
  }

  return { valid: true };
}

/**
 * Validate bar name
 * Must be non-empty and reasonable length
 */
export function validateBarName(name?: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required" };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: "Name must be under 200 characters" };
  }

  return { valid: true };
}

/**
 * Validate bar text content
 * Must be non-empty and reasonable length
 */
export function validateBarText(text?: string): {
  valid: boolean;
  error?: string;
} {
  if (!text || typeof text !== "string") {
    return { valid: false, error: "Bar text is required" };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Bar text cannot be empty" };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Bar text must be under 500 characters" };
  }

  return { valid: true };
}

/**
 * Validate hex color
 * Must be valid hex color format
 */
export function validateHexColor(color?: string): {
  valid: boolean;
  error?: string;
} {
  if (!color || typeof color !== "string") {
    return { valid: false, error: "Color is required" };
  }

  // Allow shorthand (#fff) and full (#ffffff)
  if (!/^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(color)) {
    return { valid: false, error: "Invalid hex color format" };
  }

  return { valid: true };
}

/**
 * Validate cookie duration
 * Must be positive number (hours)
 */
export function validateCookieDuration(duration?: number): {
  valid: boolean;
  error?: string;
} {
  if (duration === undefined || duration === null) {
    return { valid: true }; // Optional, will use default
  }

  if (!Number.isInteger(duration) || duration <= 0) {
    return {
      valid: false,
      error: "Cookie duration must be a positive integer (hours)",
    };
  }

  if (duration > 365 * 24) {
    // Max 1 year
    return {
      valid: false,
      error: "Cookie duration cannot exceed 1 year",
    };
  }

  return { valid: true };
}

/**
 * Validate bar type
 * Must be one of the allowed types
 */
export function validateBarType(type?: string): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = [
    "announcement",
    "promotional",
    "countdown",
    "email_signup",
    "free_shipping",
  ];

  if (!type || !allowedTypes.includes(type)) {
    return {
      valid: false,
      error: `Bar type must be one of: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate bar position
 * Must be top or bottom
 */
export function validateBarPosition(position?: string): {
  valid: boolean;
  error?: string;
} {
  if (!position || !["top", "bottom"].includes(position)) {
    return { valid: false, error: "Position must be 'top' or 'bottom'" };
  }

  return { valid: true };
}

/**
 * Validate font size
 * Must be one of: small, medium, large
 */
export function validateFontSize(size?: string): {
  valid: boolean;
  error?: string;
} {
  if (!size || !["small", "medium", "large"].includes(size)) {
    return { valid: false, error: "Font size must be 'small', 'medium', or 'large'" };
  }

  return { valid: true };
}

/**
 * Validate shipping threshold
 * Must be a positive number less than 100000
 */
export function validateShippingThreshold(threshold?: number): {
  valid: boolean;
  error?: string;
} {
  if (threshold === undefined || threshold === null) {
    return { valid: false, error: "Shipping threshold is required" };
  }

  if (typeof threshold !== "number" || isNaN(threshold)) {
    return { valid: false, error: "Shipping threshold must be a number" };
  }

  if (threshold <= 0) {
    return { valid: false, error: "Shipping threshold must be a positive number" };
  }

  if (threshold >= 100000) {
    return { valid: false, error: "Shipping threshold must be less than 100,000" };
  }

  return { valid: true };
}

/**
 * Validate currency
 * Must be one of: INR, USD, EUR, GBP
 */
export function validateCurrency(currency?: string): {
  valid: boolean;
  error?: string;
} {
  const allowedCurrencies = ["INR", "USD", "EUR", "GBP"];

  if (!currency || !allowedCurrencies.includes(currency)) {
    return {
      valid: false,
      error: `Currency must be one of: ${allowedCurrencies.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate entire bar object before creating/updating
 * Returns comprehensive validation result
 */
export function validateBar(barData: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  const nameCheck = validateBarName(barData.name);
  if (!nameCheck.valid) errors.push(nameCheck.error!);

  if (barData.content) {
    const textCheck = validateBarText(barData.content.text);
    if (!textCheck.valid) errors.push(textCheck.error!);

    if (barData.content.cta_link) {
      const urlCheck = validateUrl(barData.content.cta_link);
      if (!urlCheck) errors.push("Invalid CTA link URL");
    }
  } else {
    errors.push("Content is required");
  }

  // Check optional fields if provided
  if (barData.priority !== undefined) {
    const priorityCheck = validatePriority(barData.priority);
    if (!priorityCheck.valid) errors.push(priorityCheck.error!);
  }

  if (barData.type) {
    const typeCheck = validateBarType(barData.type);
    if (!typeCheck.valid) errors.push(typeCheck.error!);
  }

  if (barData.style) {
    if (barData.style.position) {
      const posCheck = validateBarPosition(barData.style.position);
      if (!posCheck.valid) errors.push(posCheck.error!);
    }

    if (barData.style.bg_color) {
      const bgCheck = validateHexColor(barData.style.bg_color);
      if (!bgCheck.valid) errors.push(bgCheck.error!);
    }

    if (barData.style.text_color) {
      const tcCheck = validateHexColor(barData.style.text_color);
      if (!tcCheck.valid) errors.push(tcCheck.error!);
    }

    if (barData.style.font_size) {
      const fsCheck = validateFontSize(barData.style.font_size);
      if (!fsCheck.valid) errors.push(fsCheck.error!);
    }
  }

  if (barData.settings?.cookie_duration !== undefined) {
    const cookieCheck = validateCookieDuration(barData.settings.cookie_duration);
    if (!cookieCheck.valid) errors.push(cookieCheck.error!);
  }

  if (barData.schedule) {
    const scheduleCheck = validateScheduleDates(
      barData.schedule.start_date,
      barData.schedule.end_date
    );
    if (!scheduleCheck.valid) errors.push(scheduleCheck.error!);
  }

  // Validate free shipping specific fields
  if (barData.type === "free_shipping" && barData.content?.free_shipping) {
    const thresholdCheck = validateShippingThreshold(
      barData.content.free_shipping.threshold
    );
    if (!thresholdCheck.valid) errors.push(thresholdCheck.error!);

    const currencyCheck = validateCurrency(
      barData.content.free_shipping.currency
    );
    if (!currencyCheck.valid) errors.push(currencyCheck.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
