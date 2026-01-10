import { Select, Text, InlineStack, Box } from "@shopify/polaris";

type FontSizeValue = "small" | "medium" | "large";

interface FontSizeSelectorProps {
    label?: string;
    value: FontSizeValue;
    onChange: (value: FontSizeValue) => void;
    helpText?: string;
}

// Font size options with pixel values
const FONT_SIZE_OPTIONS = [
    { label: "Small (14px)", value: "small", px: 14 },
    { label: "Medium (16px)", value: "medium", px: 16 },
    { label: "Large (18px)", value: "large", px: 18 },
];

// Get pixel value for a size
export function getFontSizePx(size: FontSizeValue): string {
    switch (size) {
        case "small":
            return "14px";
        case "large":
            return "18px";
        default:
            return "16px";
    }
}

/**
 * FontSizeSelector component allowing selection between Small, Medium, and Large sizes.
 * Displays a visual preview of the selected size.
 *
 * @param props - Component props including label, value, onChange handler.
 * @returns React Element.
 */
export function FontSizeSelector({
    label = "Font Size",
    value,
    onChange,
    helpText,
}: FontSizeSelectorProps) {
    const currentOption = FONT_SIZE_OPTIONS.find((opt) => opt.value === value);

    return (
        <InlineStack gap="400" blockAlign="end">
            <Box minWidth="180px">
                <Select
                    label={label}
                    options={FONT_SIZE_OPTIONS.map((opt) => ({
                        label: opt.label,
                        value: opt.value,
                    }))}
                    value={value}
                    onChange={(v) => onChange(v as FontSizeValue)}
                    helpText={helpText}
                />
            </Box>

            {/* Size preview */}
            <Box
                padding="200"
                background="bg-surface-secondary"
                borderRadius="200"
                minWidth="100px"
            >
                <InlineStack align="center" blockAlign="center" gap="200">
                    <Text
                        as="span"
                        variant="bodyMd"
                        fontWeight="semibold"
                    >
                        <span style={{ fontSize: getFontSizePx(value) }}>Aa</span>
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                        {currentOption?.px}px
                    </Text>
                </InlineStack>
            </Box>
        </InlineStack>
    );
}

export default FontSizeSelector;
