import { useState, useCallback, useEffect } from "react";
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
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "🚚 Free shipping on orders over $50!"}
                        </span>
                        {content.ctaText && <CTAButton content={content} style={style} />}
                        {settings.dismissible && (
                            <span style={dismissButtonStyle}>✕</span>
                        )}
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
                            style={{
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                fontSize: "13px",
                                backgroundColor: "rgba(255,255,255,0.9)",
                                color: "#333",
                                width: isMobile ? "140px" : "180px",
                            }}
                        />
                        <button
                            disabled
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
                            <span style={dismissButtonStyle}>✕</span>
                        )}
                    </div>
                );

            case "cookie_consent":
                return (
                    <div style={baseStyle}>
                        <span style={{ fontWeight: 500 }}>
                            {content.text || "🍪 We use cookies to improve your experience."}
                        </span>
                        <button
                            disabled
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

export default BarPreview;
