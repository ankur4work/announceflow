import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, BlockStack, InlineStack, Text, Box, Button, ButtonGroup } from "@shopify/polaris";
import { DesktopIcon, MobileIcon } from "@shopify/polaris-icons";
import type { BarType } from "../lib/types";

// Props interface
interface BarPreviewProps {
    type: BarType;
    content: {
        text: string;
        ctaText?: string;
        ctaLink?: string;
        endDatetime?: string;
        expiredText?: string;
    };
    style: {
        position: "top" | "bottom";
        bgColor: string;
        textColor: string;
        fontSize: "small" | "medium" | "large";
    };
    settings: {
        dismissible: boolean;
        hideWhenExpired?: boolean;
    };
    isPremium?: boolean;
    shippingThreshold?: number;
    currentCartValue?: number;
}

// Get font size in pixels
const getFontSizePx = (size: string): number => {
    switch (size) {
        case "small":
            return 14;
        case "large":
            return 18;
        default:
            return 16;
    }
};

// Calculate color contrast ratio (WCAG)
function getContrastRatio(color1: string, color2: string): number {
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

// Countdown timer component with proper formatting
function CountdownDisplay({
    endDatetime,
    textColor,
    fontSize,
}: {
    endDatetime?: string;
    textColor: string;
    fontSize: number;
}) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!endDatetime) {
            // Show demo countdown if no end date (02d 14h 35m 42s)
            setTimeLeft({ days: 2, hours: 14, minutes: 35, seconds: 42 });
            return;
        }

        const endDate = new Date(endDatetime);
        if (isNaN(endDate.getTime())) {
            setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const diff = endDate.getTime() - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setIsExpired(false);
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [endDatetime]);

    if (isExpired) {
        return null;
    }

    // Format: "02d 14h 35m 42s"
    const formatTime = (value: number, unit: string) => {
        return `${String(value).padStart(2, "0")}${unit}`;
    };

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                fontSize: `${fontSize}px`,
            }}
        >
            {formatTime(timeLeft.days, "d")} {formatTime(timeLeft.hours, "h")}{" "}
            {formatTime(timeLeft.minutes, "m")} {formatTime(timeLeft.seconds, "s")}
        </div>
    );
}

// Free Shipping Progress Bar Component
function FreeShippingProgress({
    threshold = 50,
    currentValue = 0,
    textColor,
    bgColor,
}: {
    threshold?: number;
    currentValue?: number;
    textColor: string;
    bgColor: string;
}) {
    const [animatedProgress, setAnimatedProgress] = useState(0);

    useEffect(() => {
        // Animate progress bar
        const progress = Math.min((currentValue / threshold) * 100, 100);
        const duration = 800; // Animation duration in ms
        const steps = 30;
        const stepDuration = duration / steps;
        const stepValue = progress / steps;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            setAnimatedProgress(Math.min(stepValue * currentStep, progress));
            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [currentValue, threshold]);

    const remaining = Math.max(0, threshold - currentValue);
    const progressPercent = Math.min((currentValue / threshold) * 100, 100);

    return (
        <div style={{ width: "100%", marginTop: "8px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                    fontSize: "13px",
                }}
            >
                <span style={{ fontWeight: 500 }}>
                    {currentValue >= threshold
                        ? "You've unlocked free shipping!"
                        : `Add $${remaining.toFixed(2)} for free shipping`}
                </span>
                <span style={{ fontWeight: 600, opacity: 0.9 }}>
                    ${currentValue.toFixed(2)} / ${threshold}
                </span>
            </div>
            <div
                style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "3px",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        width: `${animatedProgress}%`,
                        height: "100%",
                        backgroundColor: textColor,
                        borderRadius: "3px",
                        transition: "width 0.1s ease-out",
                    }}
                />
            </div>
        </div>
    );
}

// Main preview component
/**
 * BarPreview component renders a live preview of the announcement bar.
 * Supports all 5 bar types with animations and smooth transitions.
 *
 * @param props - Component props including type, content, style, and settings.
 * @returns React Element rendering the preview.
 */
export function BarPreview({
    type,
    content,
    style,
    settings,
    isPremium = false,
    shippingThreshold = 50,
    currentCartValue = 0,
}: BarPreviewProps) {
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
    const [darkMode, setDarkMode] = useState(false);
    const [prevStyle, setPrevStyle] = useState(style);

    const fontSize = getFontSizePx(style.fontSize);
    const isMobile = device === "mobile";
    const containerWidth = isMobile ? "375px" : "100%";

    // Check color contrast
    const contrastRatio = useMemo(
        () => getContrastRatio(style.bgColor, style.textColor),
        [style.bgColor, style.textColor]
    );
    const hasPoorContrast = contrastRatio < 4.5;

    // Animate color transitions
    useEffect(() => {
        if (prevStyle.bgColor !== style.bgColor || prevStyle.textColor !== style.textColor) {
            setPrevStyle(style);
        }
    }, [style, prevStyle]);

    // Check if countdown is expired
    const isCountdownExpired = useCallback(() => {
        if (type !== "countdown" || !content.endDatetime) return false;
        return new Date(content.endDatetime).getTime() <= Date.now();
    }, [type, content.endDatetime]);

    // Render the bar content based on type
    const renderBarContent = () => {
        const baseStyle: React.CSSProperties = {
            backgroundColor: style.bgColor,
            color: style.textColor,
            padding: isMobile ? "10px 12px" : "12px 20px",
            fontSize: `${fontSize}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: isMobile ? "8px" : "16px",
            flexWrap: "wrap",
            position: "relative",
            transition: "background-color 0.3s ease, color 0.3s ease",
            minHeight: "44px",
        };

        // Show expired message for countdown
        if (type === "countdown" && isCountdownExpired()) {
            if (settings.hideWhenExpired) {
                return null;
            }
            return (
                <div style={baseStyle}>
                    <span style={{ fontWeight: 600 }}>
                        {content.expiredText || "This offer has ended"}
                    </span>
                </div>
            );
        }

        switch (type) {
            case "promotional":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "Welcome to our store!"}
                        </span>
                        {content.ctaText && <CTAButton content={content} style={style} />}
                        {settings.dismissible && (
                            <CloseButton textColor={style.textColor} />
                        )}
                        {!isPremium && (
                            <span
                                style={{
                                    position: "absolute",
                                    right: isMobile ? "30px" : "40px",
                                    fontSize: "9px",
                                    opacity: 0.6,
                                }}
                            >
                                Powered by AnnounceFlow
                            </span>
                        )}
                    </div>
                );

            case "countdown":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "Flash Sale ends in:"}
                        </span>
                        <CountdownDisplay
                            endDatetime={content.endDatetime}
                            textColor={style.textColor}
                            fontSize={fontSize}
                        />
                        {settings.dismissible && (
                            <CloseButton textColor={style.textColor} />
                        )}
                    </div>
                );

            case "free_shipping":
                return (
                    <div style={{ ...baseStyle, flexDirection: "column", alignItems: "stretch" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <span style={{ fontWeight: 500 }}>
                                {content.text || "🚚 Free shipping on orders over $50!"}
                            </span>
                            {settings.dismissible && (
                                <CloseButton textColor={style.textColor} />
                            )}
                        </div>
                        <FreeShippingProgress
                            threshold={shippingThreshold}
                            currentValue={currentCartValue}
                            textColor={style.textColor}
                            bgColor={style.bgColor}
                        />
                    </div>
                );

            case "email_signup":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "📧 Subscribe for 10% off your first order!"}
                        </span>
                        <input
                            type="email"
                            placeholder="Enter email"
                            disabled
                            aria-label="Email input (preview only)"
                            style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: `1px solid rgba(255,255,255,0.3)`,
                                fontSize: "13px",
                                backgroundColor: "rgba(255,255,255,0.9)",
                                color: "#333",
                                width: isMobile ? "140px" : "180px",
                                outline: "none",
                            }}
                        />
                        <button
                            disabled
                            aria-label="Subscribe button (preview only)"
                            style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: style.textColor,
                                color: style.bgColor,
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "default",
                            }}
                        >
                            Subscribe
                        </button>
                        {settings.dismissible && (
                            <CloseButton textColor={style.textColor} />
                        )}
                    </div>
                );

            case "cookie_consent":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text ||
                                "🍪 We use cookies to improve your experience."}
                        </span>
                        <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            style={{
                                color: style.textColor,
                                textDecoration: "underline",
                                fontSize: "13px",
                                opacity: 0.9,
                            }}
                            aria-label="Privacy policy link (preview only)"
                        >
                            Privacy Policy
                        </a>
                        <button
                            disabled
                            aria-label="Accept cookies button (preview only)"
                            style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: style.textColor,
                                color: style.bgColor,
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "default",
                            }}
                        >
                            Accept
                        </button>
                        <button
                            disabled
                            aria-label="Decline cookies button (preview only)"
                            style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: `1px solid ${style.textColor}`,
                                backgroundColor: "transparent",
                                color: style.textColor,
                                fontWeight: 500,
                                fontSize: "13px",
                                cursor: "default",
                            }}
                        >
                            Decline
                        </button>
                        {settings.dismissible && (
                            <CloseButton textColor={style.textColor} />
                        )}
                    </div>
                );

            // Default to announcement/promotional
            default:
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "Welcome to our store!"}
                        </span>
                        {content.ctaText && <CTAButton content={content} style={style} />}
                        {settings.dismissible && (
                            <CloseButton textColor={style.textColor} />
                        )}
                    </div>
                );
        }
    };

    return (
        <Card>
            <BlockStack gap="400">
                {/* Header with device toggle and dark mode */}
                <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                        Preview
                    </Text>
                    <InlineStack gap="200">
                        <ButtonGroup variant="segmented">
                            <Button
                                pressed={device === "desktop"}
                                onClick={() => setDevice("desktop")}
                                icon={DesktopIcon}
                                accessibilityLabel="Desktop preview"
                            >
                                Desktop
                            </Button>
                            <Button
                                pressed={device === "mobile"}
                                onClick={() => setDevice("mobile")}
                                icon={MobileIcon}
                                accessibilityLabel="Mobile preview"
                            >
                                Mobile
                            </Button>
                        </ButtonGroup>
                    </InlineStack>
                </InlineStack>

                {/* Color contrast warning */}
                {hasPoorContrast && (
                    <Box padding="200" background="bg-surface-warning-subdued" borderRadius="200">
                        <Text as="span" variant="bodySm" tone="warning">
                            ⚠️ Low color contrast ({contrastRatio.toFixed(1)}:1). Text may be hard
                            to read.
                        </Text>
                    </Box>
                )}

                {/* Preview container */}
                <Box
                    padding="400"
                    background={darkMode ? "bg-surface-inverse" : "bg-surface-secondary"}
                    borderRadius="200"
                >
                    <div
                        style={{
                            width: containerWidth,
                            margin: "0 auto",
                            transition: "width 0.3s ease",
                        }}
                    >
                        {/* Device frame */}
                        <div
                            style={{
                                borderRadius: "8px",
                                overflow: "hidden",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                backgroundColor: "#fff",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.01)";
                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                            }}
                        >
                            {/* Browser chrome */}
                            <div
                                style={{
                                    backgroundColor: "#f5f5f5",
                                    padding: "8px 12px",
                                    borderBottom: "1px solid #e5e5e5",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <div
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor: "#FF5F56",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor: "#FFBD2E",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor: "#27CA3F",
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#fff",
                                        borderRadius: "4px",
                                        padding: "4px 12px",
                                        fontSize: "11px",
                                        color: "#666",
                                        textAlign: "center",
                                    }}
                                >
                                    your-store.myshopify.com
                                </div>
                            </div>

                            {/* Top position bar */}
                            {style.position === "top" && renderBarContent()}

                            {/* Store content placeholder */}
                            <div
                                style={{
                                    padding: isMobile ? "16px" : "24px",
                                    minHeight: isMobile ? "120px" : "150px",
                                    backgroundColor: "#fff",
                                }}
                            >
                                <div
                                    style={{
                                        height: "16px",
                                        width: "50%",
                                        backgroundColor: "#e8e8e8",
                                        borderRadius: "4px",
                                        marginBottom: "12px",
                                    }}
                                />
                                <div
                                    style={{
                                        height: "12px",
                                        width: "80%",
                                        backgroundColor: "#f0f0f0",
                                        borderRadius: "4px",
                                        marginBottom: "8px",
                                    }}
                                />
                                <div
                                    style={{
                                        height: "12px",
                                        width: "60%",
                                        backgroundColor: "#f0f0f0",
                                        borderRadius: "4px",
                                        marginBottom: "8px",
                                    }}
                                />
                                <div
                                    style={{
                                        height: "12px",
                                        width: "70%",
                                        backgroundColor: "#f0f0f0",
                                        borderRadius: "4px",
                                    }}
                                />
                            </div>

                            {/* Bottom position bar */}
                            {style.position === "bottom" && renderBarContent()}
                        </div>
                    </div>
                </Box>

                {/* Position indicator */}
                <InlineStack align="center">
                    <Text as="span" variant="bodySm" tone="subdued">
                        Position: {style.position === "top" ? "Top of page" : "Bottom of page"}
                        {" • "}
                        Font: {style.fontSize}
                        {!isPremium && " • Free plan (with branding)"}
                    </Text>
                </InlineStack>
            </BlockStack>
        </Card>
    );
}

// CTA Button sub-component
function CTAButton({
    content,
    style,
}: {
    content: BarPreviewProps["content"];
    style: BarPreviewProps["style"];
}) {
    return (
        <span
            style={{
                backgroundColor: style.textColor,
                color: style.bgColor,
                padding: "6px 14px",
                borderRadius: "4px",
                fontWeight: 600,
                fontSize: "13px",
                whiteSpace: "nowrap",
                cursor: "default",
                transition: "opacity 0.2s ease",
            }}
        >
            {content.ctaText}
        </span>
    );
}

// Close button component
function CloseButton({ textColor }: { textColor: string }) {
    return (
        <button
            type="button"
            aria-label="Close announcement bar"
            style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.7,
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: 400,
                background: "none",
                border: "none",
                color: textColor,
                padding: "4px",
                lineHeight: 1,
                transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
            }}
        >
            ✕
        </button>
    );
}

export default BarPreview;
