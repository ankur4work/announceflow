/**
 * Auth Server Utilities
 * Session token verification and access token retrieval for AnnounceFlow
 */

import prisma from "../db.server";

// ============================================================================
// Types
// ============================================================================

/**
 * Error codes for authentication failures
 */
export type AuthErrorCode =
    | "UNAUTHORIZED"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "SESSION_NOT_FOUND"
    | "ACCESS_TOKEN_MISSING";

/**
 * Authentication error with typed code
 */
export class AuthError extends Error {
    readonly code: AuthErrorCode;
    readonly requireReauth: boolean;

    constructor(
        code: AuthErrorCode,
        message: string,
        requireReauth: boolean = false
    ) {
        super(message);
        this.name = "AuthError";
        this.code = code;
        this.requireReauth = requireReauth;
    }
}

/**
 * Authenticated context attached to requests
 */
export interface AuthContext {
    /** Shop domain (e.g., "my-store.myshopify.com") */
    shop: string;
    /** Access token for Shopify API calls */
    accessToken: string;
    /** Session ID */
    sessionId: string;
    /** Whether this is an online session (user-specific) */
    isOnline: boolean;
    /** User info (only for online sessions) */
    user?: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        accountOwner: boolean;
        locale?: string;
    };
}

/**
 * Decoded JWT payload from Shopify session token
 */
export interface SessionTokenPayload {
    /** Issuer - Shopify admin URL */
    iss: string;
    /** Destination - App URL */
    dest: string;
    /** Audience - API key */
    aud: string;
    /** Subject - Shop admin URL */
    sub: string;
    /** Expiration time (Unix timestamp) */
    exp: number;
    /** Not before time (Unix timestamp) */
    nbf: number;
    /** Issued at time (Unix timestamp) */
    iat: number;
    /** JWT ID */
    jti: string;
    /** Session ID */
    sid: string;
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Get the stored access token for a shop from the database
 *
 * @param shopDomain - The shop domain (e.g., "my-store.myshopify.com")
 * @returns The access token or null if not found
 *
 * @example
 * ```ts
 * const token = await getShopAccessToken("my-store.myshopify.com");
 * if (token) {
 *   // Use token for API calls
 * }
 * ```
 */
export async function getShopAccessToken(
    shopDomain: string
): Promise<string | null> {
    try {
        // Normalize shop domain
        const normalizedShop = normalizeShopDomain(shopDomain);

        // Find the offline session for this shop (offline sessions persist)
        const session = await prisma.session.findFirst({
            where: {
                shop: normalizedShop,
                isOnline: false,
            },
            select: {
                accessToken: true,
                expires: true,
            },
        });

        if (!session) {
            console.warn(`No session found for shop: ${normalizedShop}`);
            return null;
        }

        // Check if session has expired
        if (session.expires && new Date(session.expires) < new Date()) {
            console.warn(`Session expired for shop: ${normalizedShop}`);
            return null;
        }

        return session.accessToken;
    } catch (error) {
        console.error(`Error fetching access token for ${shopDomain}:`, error);
        return null;
    }
}

/**
 * Get full session data for a shop
 *
 * @param shopDomain - The shop domain
 * @returns Session data or null
 */
export async function getShopSession(shopDomain: string) {
    try {
        const normalizedShop = normalizeShopDomain(shopDomain);

        const session = await prisma.session.findFirst({
            where: {
                shop: normalizedShop,
                isOnline: false,
            },
        });

        return session;
    } catch (error) {
        console.error(`Error fetching session for ${shopDomain}:`, error);
        return null;
    }
}

/**
 * Check if a shop has a valid session
 *
 * @param shopDomain - The shop domain
 * @returns True if shop has valid session
 */
export async function hasValidSession(shopDomain: string): Promise<boolean> {
    const token = await getShopAccessToken(shopDomain);
    return token !== null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize shop domain to consistent format
 * Handles various input formats like "shop.myshopify.com", "https://shop.myshopify.com", etc.
 */
export function normalizeShopDomain(shop: string): string {
    // Remove protocol if present
    let normalized = shop.replace(/^https?:\/\//, "");

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, "");

    // Remove /admin path if present
    normalized = normalized.replace(/\/admin.*$/, "");

    return normalized.toLowerCase();
}

/**
 * Extract shop domain from Shopify admin URL
 * Handles URLs like "https://admin.shopify.com/store/shop-name"
 */
export function extractShopFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);

        // Handle new admin URL format: admin.shopify.com/store/{shop-name}
        if (urlObj.hostname === "admin.shopify.com") {
            const match = urlObj.pathname.match(/^\/store\/([^/]+)/);
            if (match) {
                return `${match[1]}.myshopify.com`;
            }
        }

        // Handle old format: {shop}.myshopify.com
        if (urlObj.hostname.endsWith(".myshopify.com")) {
            return urlObj.hostname;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Check if a token is expired based on exp claim
 */
export function isTokenExpired(exp: number): boolean {
    // Add 5 second buffer for clock skew
    return Date.now() / 1000 > exp - 5;
}
