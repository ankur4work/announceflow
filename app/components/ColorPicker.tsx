import { useCallback, useRef, useState } from "react";
import { BlockStack, Text, InlineStack, TextField, Box } from "@shopify/polaris";

interface ColorPickerProps {
    label: string;
    value: string; // hex color like "#1E3A5F"
    onChange: (color: string) => void;
    helpText?: string;
    error?: string;
}

// Preset colors for quick selection
const PRESET_COLORS = [
    { hex: "#1E3A5F", name: "Navy" },
    { hex: "#E74C3C", name: "Red" },
    { hex: "#27AE60", name: "Green" },
    { hex: "#F39C12", name: "Orange" },
    { hex: "#9B59B6", name: "Purple" },
    { hex: "#000000", name: "Black" },
    { hex: "#FFFFFF", name: "White" },
];

// Validate hex color (3 or 6 digits)
const isValidHex = (hex: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

// Normalize hex to 6 digits
const normalizeHex = (hex: string): string => {
    if (!hex.startsWith("#")) {
        hex = "#" + hex;
    }
    // Convert 3-digit hex to 6-digit
    if (/^#[A-Fa-f0-9]{3}$/.test(hex)) {
        const r = hex[1];
        const g = hex[2];
        const b = hex[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return hex;
};

/**
 * ColorPicker component providing a visual color selector and hex input.
 * Includes preset colors and validation.
 *
 * @param props - Component props including label, value, onChange handler.
 * @returns React Element.
 */
export function ColorPicker({
    label,
    value,
    onChange,
    helpText,
    error,
}: ColorPickerProps) {
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    // Handle clicking the preview square or picker button
    const openColorPicker = useCallback(() => {
        colorInputRef.current?.click();
    }, []);

    // Handle native color picker change
    const handleColorPickerChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newColor = e.target.value.toUpperCase();
            setInputValue(newColor);
            onChange(newColor);
        },
        [onChange]
    );

    // Handle text input change
    const handleInputChange = useCallback(
        (newValue: string) => {
            // Ensure # prefix
            if (!newValue.startsWith("#")) {
                newValue = "#" + newValue.replace("#", "");
            }

            // Only allow valid hex characters
            const sanitized = newValue.replace(/[^#A-Fa-f0-9]/g, "").slice(0, 7);
            setInputValue(sanitized.toUpperCase());

            // Only update parent if valid
            if (isValidHex(sanitized)) {
                onChange(normalizeHex(sanitized).toUpperCase());
            }
        },
        [onChange]
    );

    // Handle preset click
    const handlePresetClick = useCallback(
        (hex: string) => {
            setInputValue(hex);
            onChange(hex);
        },
        [onChange]
    );

    // Sync input value when prop changes
    if (value !== inputValue && isValidHex(value) && !isFocused) {
        setInputValue(value.toUpperCase());
    }

    const hasError = !!error;
    const previewBorderColor = value === "#FFFFFF" || value === "#ffffff" ? "#ddd" : "transparent";

    return (
        <BlockStack gap="200">
            {/* Label */}
            <Text as="span" variant="bodyMd">
                {label}
            </Text>

            {/* Color picker row */}
            <InlineStack gap="300" blockAlign="center">
                {/* Color preview square */}
                <button
                    type="button"
                    onClick={openColorPicker}
                    aria-label="Open color picker"
                    style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: value,
                        border: `2px solid ${hasError ? "#D72C0D" : previewBorderColor}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "box-shadow 0.15s ease",
                        boxShadow: isFocused ? "0 0 0 2px #005BD3" : "none",
                    }}
                />

                {/* Hidden native color input */}
                <input
                    ref={colorInputRef}
                    type="color"
                    value={normalizeHex(value)}
                    onChange={handleColorPickerChange}
                    style={{
                        position: "absolute",
                        width: 0,
                        height: 0,
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                />

                {/* Hex input */}
                <Box minWidth="120px">
                    <TextField
                        label="Hex color"
                        labelHidden
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoComplete="off"
                        monospaced
                        error={hasError ? " " : undefined}
                        placeholder="#1E3A5F"
                    />
                </Box>

                {/* Picker button */}
                <button
                    type="button"
                    onClick={openColorPicker}
                    style={{
                        padding: "8px 12px",
                        backgroundColor: "#f6f6f7",
                        border: "1px solid #c9cccf",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#202223",
                        fontWeight: 500,
                        transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f2f3")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f7")}
                >
                    Pick
                </button>
            </InlineStack>

            {/* Error message */}
            {error && (
                <Text as="span" variant="bodySm" tone="critical">
                    {error}
                </Text>
            )}

            {/* Help text */}
            {helpText && !error && (
                <Text as="span" variant="bodySm" tone="subdued">
                    {helpText}
                </Text>
            )}

            {/* Preset colors */}
            <BlockStack gap="150">
                <Text as="span" variant="bodySm" tone="subdued">
                    Presets:
                </Text>
                <InlineStack gap="200">
                    {PRESET_COLORS.map((preset) => (
                        <button
                            key={preset.hex}
                            type="button"
                            onClick={() => handlePresetClick(preset.hex)}
                            title={preset.name}
                            aria-label={`Select ${preset.name}`}
                            style={{
                                width: "28px",
                                height: "28px",
                                backgroundColor: preset.hex,
                                border: `2px solid ${preset.hex === value
                                    ? "#005BD3"
                                    : preset.hex === "#FFFFFF"
                                        ? "#ddd"
                                        : "transparent"
                                    }`,
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "transform 0.1s ease, box-shadow 0.1s ease",
                                boxShadow:
                                    preset.hex === value
                                        ? "0 0 0 2px rgba(0, 91, 211, 0.3)"
                                        : "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        />
                    ))}
                </InlineStack>
            </BlockStack>
        </BlockStack>
    );
}

export default ColorPicker;
