import { useState, useCallback, useEffect } from "react";
import { Card, BlockStack, InlineStack, Text, Box, Button, ButtonGroup } from "@shopify/polaris";
import { DesktopIcon, MobileIcon } from "@shopify/polaris-icons";
import type { BarType, BarPosition } from "../lib/types";

// Props interface
interface BarPreviewProps {
    type: BarType;
    content: {
        text: string;
        ctaText?: string;
        ctaLink?: string;
        endDatetime?: string;
        expiredText?: string;
        // Email capture fields
        placeholder?: string;
        buttonText?: string;
        successMessage?: string;
        // Cookie consent fields
        acceptText?: string;
        declineText?: string;
        privacyLink?: string;
        privacyText?: string;
        // Free shipping fields
        threshold?: number;
        currency?: string;
        messageTemplate?: string;
        shippingSuccessMessage?: string;
    };
    style: {
        position: BarPosition;
        bgColor: string;
        textColor: string;
        fontSize: "small" | "medium" | "large";
        buttonBgColor?: string;
        buttonTextColor?: string;
        progressColor?: string;
        progressBgColor?: string;
    };
    settings: {
        dismissible: boolean;
        hideWhenExpired?: boolean;
        showDecline?: boolean;
        showProgressBar?: boolean;
    };
    isPremium?: boolean;
}

// Get position label for display
const getPositionLabel = (position: BarPosition): string => {
    const labels: Record<BarPosition, string> = {
        top: "Top of page",
        bottom: "Bottom of page",
        left: "Left side",
        right: "Right side",
        "top-left": "Top left corner",
        "top-right": "Top right corner",
        "bottom-left": "Bottom left corner",
        "bottom-right": "Bottom right corner",
    };
    return labels[position] || position;
};

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

// Format currency for preview
const formatCurrencyPreview = (amount: number, currencyCode: string): string => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "$", AUD: "$" };
    const symbol = symbols[currencyCode] || currencyCode + " ";
    return symbol + amount.toFixed(2);
};

// Countdown timer component
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
            // Show demo countdown if no end date
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

    const units = [
        { value: timeLeft.days, label: "days" },
        { value: timeLeft.hours, label: "hrs" },
        { value: timeLeft.minutes, label: "min" },
        { value: timeLeft.seconds, label: "sec" },
    ];

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontVariantNumeric: "tabular-nums",
            }}
        >
            {units.map((unit, i) => (
                <div key={unit.label} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                backgroundColor: "rgba(0,0,0,0.2)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                fontSize: `${fontSize + 2}px`,
                                minWidth: "36px",
                            }}
                        >
                            {String(unit.value).padStart(2, "0")}
                        </div>
                        <div
                            style={{
                                fontSize: "10px",
                                opacity: 0.8,
                                marginTop: "2px",
                            }}
                        >
                            {unit.label}
                        </div>
                    </div>
                    {i < units.length - 1 && (
                        <span
                            style={{
                                margin: "0 4px",
                                fontWeight: 700,
                                opacity: 0.7,
                                alignSelf: "flex-start",
                                paddingTop: "6px",
                            }}
                        >
                            :
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// Main preview component
/**
 * BarPreview component renders a live preview of the announcement bar.
 * Supports both desktop and mobile views.
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
}: BarPreviewProps) {
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

    const fontSize = getFontSizePx(style.fontSize);
    const isMobile = device === "mobile";
    const containerWidth = isMobile ? "375px" : "100%";

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
            transition: "all 0.2s ease",
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
                            <span style={dismissButtonStyle}>✕</span>
                        )}
                    </div>
                );

            case "free_shipping":
                const threshold = content.threshold || 50;
                const currency = content.currency || "USD";
                const demoCartAmount = threshold * 0.4; // Demo: 40% of threshold
                const remaining = threshold - demoCartAmount;
                const percentage = Math.min(100, (demoCartAmount / threshold) * 100);
                const formattedRemaining = formatCurrencyPreview(remaining, currency);
                const messageText = (content.messageTemplate || "Spend {remaining} more for FREE shipping!")
                    .replace("{remaining}", formattedRemaining);

                return (
                    <div style={baseStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "16px", flexWrap: "wrap", justifyContent: "center" }}>
                            <span style={{ fontWeight: 500 }}>
                                {messageText}
                            </span>
                            {settings.showProgressBar !== false && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{
                                        width: isMobile ? "100px" : "150px",
                                        height: "8px",
                                        backgroundColor: style.progressBgColor || "rgba(255,255,255,0.3)",
                                        borderRadius: "4px",
                                        overflow: "hidden",
                                    }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: "100%",
                                            backgroundColor: style.progressColor || style.textColor,
                                            borderRadius: "4px",
                                            transition: "width 0.3s ease",
                                        }} />
                                    </div>
                                    <span style={{ fontSize: "12px", fontWeight: 600 }}>{Math.round(percentage)}%</span>
                                </div>
                            )}
                        </div>
                        {settings.dismissible && (
                            <span style={dismissButtonStyle}>✕</span>
                        )}
                    </div>
                );

            case "email_signup":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "Get 10% off your first order!"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: "center" }}>
                            <input
                                type="email"
                                placeholder={content.placeholder || "Enter your email"}
                                disabled
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "4px",
                                    border: "none",
                                    fontSize: "13px",
                                    backgroundColor: "rgba(255,255,255,0.95)",
                                    color: "#333",
                                    width: isMobile ? "100%" : "180px",
                                    maxWidth: isMobile ? "200px" : "none",
                                    minHeight: "36px",
                                }}
                            />
                            <button
                                disabled
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: style.buttonBgColor || style.textColor,
                                    color: style.buttonTextColor || style.bgColor,
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: "default",
                                    minHeight: "36px",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {content.buttonText || "Subscribe"}
                            </button>
                        </div>
                        {settings.dismissible && (
                            <span style={dismissButtonStyle}>✕</span>
                        )}
                    </div>
                );

            case "cookie_consent":
                return (
                    <div style={baseStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", flexWrap: "wrap", justifyContent: "center" }}>
                            <span style={{ fontWeight: 500 }}>
                                {content.text || "We use cookies to improve your experience."}
                            </span>
                            {content.privacyLink && content.privacyText && (
                                <span
                                    style={{
                                        textDecoration: "underline",
                                        opacity: 0.85,
                                        fontSize: `${fontSize - 2}px`,
                                        cursor: "default",
                                    }}
                                >
                                    {content.privacyText || "Privacy Policy"}
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                                disabled
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: style.buttonBgColor || style.textColor,
                                    color: style.buttonTextColor || style.bgColor,
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: "default",
                                    minHeight: "32px",
                                }}
                            >
                                {content.acceptText || "Accept"}
                            </button>
                            {settings.showDecline !== false && (
                                <button
                                    disabled
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: "4px",
                                        border: `1px solid ${style.buttonBgColor || style.textColor}`,
                                        backgroundColor: "transparent",
                                        color: style.buttonBgColor || style.textColor,
                                        fontWeight: 500,
                                        fontSize: "13px",
                                        cursor: "default",
                                        minHeight: "32px",
                                    }}
                                >
                                    {content.declineText || "Decline"}
                                </button>
                            )}
                        </div>
                    </div>
                );

            // Promotional (default)
            default:
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "Welcome to our store!"}
                        </span>
                        {content.ctaText && <CTAButton content={content} style={style} />}
                        {settings.dismissible && (
                            <span style={dismissButtonStyle}>✕</span>
                        )}
                        {/* Free plan branding */}
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
        }
    };

    const dismissButtonStyle: React.CSSProperties = {
        position: "absolute",
        right: "12px",
        opacity: 0.7,
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 400,
    };

    return (
        <Card>
            <BlockStack gap="400">
                {/* Header with device toggle */}
                <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                        Preview
                    </Text>
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

                {/* Preview container */}
                <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                >
                    <div
                        style={{
                            width: containerWidth,
                            margin: "0 auto",
                            transition: "width 0.3s ease",
                        }}
                    >
                        {/* Browser mockup */}
                        <div
                            style={{
                                borderRadius: "8px",
                                overflow: "hidden",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                backgroundColor: "#fff",
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

                            {/* Store content placeholder with relative positioning for corner/side bars */}
                            <div
                                style={{
                                    padding: isMobile ? "16px" : "24px",
                                    minHeight: isMobile ? "120px" : "150px",
                                    backgroundColor: "#fff",
                                    position: "relative",
                                }}
                            >
                                {/* Corner and side positioned bars */}
                                {(style.position === "top-left" || style.position === "top-right" ||
                                  style.position === "bottom-left" || style.position === "bottom-right" ||
                                  style.position === "left" || style.position === "right") && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            ...(style.position === "top-left" && { top: "10px", left: "10px" }),
                                            ...(style.position === "top-right" && { top: "10px", right: "10px" }),
                                            ...(style.position === "bottom-left" && { bottom: "10px", left: "10px" }),
                                            ...(style.position === "bottom-right" && { bottom: "10px", right: "10px" }),
                                            ...(style.position === "left" && { left: "0", top: "50%", transform: "translateY(-50%)" }),
                                            ...(style.position === "right" && { right: "0", top: "50%", transform: "translateY(-50%)" }),
                                            maxWidth: (style.position === "left" || style.position === "right") ? "auto" : "280px",
                                            zIndex: 10,
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                            overflow: "hidden",
                                            ...(style.position === "left" || style.position === "right" ? {
                                                writingMode: "vertical-rl",
                                                textOrientation: "mixed",
                                            } : {}),
                                        }}
                                    >
                                        {renderBarContent()}
                                    </div>
                                )}

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
                        Position: {getPositionLabel(style.position)}
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

export default BarPreview;
