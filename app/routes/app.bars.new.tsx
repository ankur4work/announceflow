import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigate, useSubmit, useNavigation, useBlocker } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Select,
  Button,
  InlineStack,
  Box,
  Divider,
  Checkbox,
  Banner,
  Modal,
  FormLayout,
  Badge,
  InlineGrid,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { createBar } from "../lib/metafields.server";
import type { BarType, BarPosition, FontSize, CTAStyle, Currency } from "../lib/types";
import { ColorPicker, FontSizeSelector, BarPreview } from "../components";

// Form data type
interface FormData {
  type: BarType;
  content: {
    text: string;
    ctaText: string;
    ctaLink: string;
  };
  style: {
    position: BarPosition;
    bgColor: string;
    textColor: string;
    fontSize: FontSize;
    progressBarColor: string;
    progressBarBgColor: string;
  };
  settings: {
    enabled: boolean;
    dismissible: boolean;
    hideWhenExpired: boolean;
    showProgressBar: boolean;
  };
  extra: {
    endDatetime: string;
    expiredText: string;
  };
  freeShipping: {
    threshold: string;
    currency: Currency;
    progressMessage: string;
    successMessage: string;
  };
}

// Validation errors type
interface FormErrors {
  text?: string;
  ctaLink?: string;
  endDatetime?: string;
  threshold?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const type = formData.get("type") as BarType;
  const text = formData.get("text") as string;
  const ctaText = formData.get("ctaText") as string;
  const ctaLink = formData.get("ctaLink") as string;
  const position = formData.get("position") as BarPosition;
  const bgColor = formData.get("bgColor") as string;
  const textColor = formData.get("textColor") as string;
  const fontSize = formData.get("fontSize") as FontSize;
  const enabled = formData.get("enabled") === "true";
  const dismissible = formData.get("dismissible") === "true";

  const endDatetime = formData.get("endDatetime") as string;
  const expiredText = formData.get("expiredText") as string;
  const hideWhenExpired = formData.get("hideWhenExpired") === "true";

  // Free shipping fields
  const shippingThreshold = formData.get("shippingThreshold") as string;
  const shippingCurrency = formData.get("shippingCurrency") as Currency;
  const progressMessage = formData.get("progressMessage") as string;
  const successMessage = formData.get("successMessage") as string;
  const progressBarColor = formData.get("progressBarColor") as string;
  const progressBarBgColor = formData.get("progressBarBgColor") as string;
  const showProgressBar = formData.get("showProgressBar") === "true";

  // Validation
  if (type === "free_shipping") {
    // For free shipping, text is auto-generated from progress message
    const threshold = parseFloat(shippingThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return json({ success: false, error: "Shipping threshold must be a positive number" }, { status: 400 });
    }
    if (threshold >= 100000) {
      return json({ success: false, error: "Shipping threshold must be less than 100,000" }, { status: 400 });
    }
  } else if (!text || !text.trim()) {
    return json({ success: false, error: "Announcement text is required" }, { status: 400 });
  }

  if (type === "countdown") {
    if (!endDatetime) {
      return json({ success: false, error: "End date is required for countdown" }, { status: 400 });
    }
    // Check if date is valid
    if (isNaN(new Date(endDatetime).getTime())) {
      return json({ success: false, error: "Invalid end date" }, { status: 400 });
    }
  }

  // Generate a name from the text or type
  let name: string;
  if (type === "free_shipping") {
    name = `Free Shipping - ${shippingCurrency} ${shippingThreshold}`;
  } else {
    name = text.length > 30 ? text.substring(0, 30) + "..." : text;
  }

  const result = await createBar(admin, {
    name,
    type,
    enabled,
    content: {
      text: type === "free_shipping" ? progressMessage : text,
      cta_text: type !== "countdown" && type !== "free_shipping" ? (ctaText || undefined) : undefined,
      cta_link: type !== "countdown" && type !== "free_shipping" ? (ctaLink || undefined) : undefined,
      cta_style: type !== "countdown" && type !== "free_shipping" ? ("primary" as CTAStyle) : undefined,
      end_datetime: type === "countdown" ? endDatetime : undefined,
      expired_text: type === "countdown" ? (expiredText || "This offer has ended") : undefined,
      free_shipping: type === "free_shipping" ? {
        threshold: parseFloat(shippingThreshold),
        currency: shippingCurrency,
        progress_message: progressMessage || "Spend {remaining} more for FREE shipping!",
        success_message: successMessage || "Congratulations! You've unlocked FREE shipping!",
      } : undefined,
    },
    style: {
      position,
      bg_color: bgColor,
      text_color: textColor,
      font_size: fontSize,
      progress_bar_color: type === "free_shipping" ? progressBarColor : undefined,
      progress_bar_bg_color: type === "free_shipping" ? progressBarBgColor : undefined,
    },
    settings: {
      dismissible,
      hide_when_expired: type === "countdown" ? hideWhenExpired : undefined,
      show_progress_bar: type === "free_shipping" ? showProgressBar : undefined,
    },
  });

  if (result.success) {
    return redirect("/app?created=true");
  }

  return json(
    { success: false, error: result.errors?.join(", ") || "Failed to create bar" },
    { status: 500 }
  );
};

// Bar type options
const barTypeOptions = [
  { label: "Promotional Announcement", value: "promotional" },
  { label: "Countdown Timer", value: "countdown" },
  { label: "Free Shipping Progress", value: "free_shipping" },
  { label: "Email Capture ★ Premium", value: "email_signup" },
  { label: "Cookie Consent", value: "cookie_consent" },
];

// Font size options
const fontSizeOptions = [
  { label: "Small (12px)", value: "small" },
  { label: "Medium (14px)", value: "medium" },
  { label: "Large (16px)", value: "large" },
];

// Currency options for free shipping
const currencyOptions = [
  { label: "INR (₹)", value: "INR" },
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
];

// URL validation helper
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  try {
    // Allow relative URLs starting with /
    if (url.startsWith("/")) return true;
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function CreateBar() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: "promotional",
    content: {
      text: "",
      ctaText: "",
      ctaLink: "",
    },
    style: {
      position: "top",
      bgColor: "#1E3A5F",
      textColor: "#FFFFFF",
      fontSize: "medium",
      progressBarColor: "#4CAF50",
      progressBarBgColor: "#E0E0E0",
    },
    settings: {
      enabled: true,
      dismissible: true,
      hideWhenExpired: false,
      showProgressBar: true,
    },
    extra: {
      endDatetime: "",
      expiredText: "This offer has ended",
    },
    freeShipping: {
      threshold: "50",
      currency: "USD",
      progressMessage: "Spend {remaining} more for FREE shipping!",
      successMessage: "Congratulations! You've unlocked FREE shipping!",
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Show error toast if action failed
  useEffect(() => {
    if (actionData && !actionData.success) {
      shopify.toast.show(actionData.error || "Failed to create bar", { isError: true });
    }
  }, [actionData, shopify]);

  // Update form field helper
  const updateField = useCallback(
    <K extends Exclude<keyof FormData, "type">>(
      section: K,
      field: keyof FormData[K],
      value: FormData[K][keyof FormData[K]]
    ) => {
      setIsDirty(true);
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
      // Clear error when field is updated
      if (field === "text" && errors.text) {
        setErrors((prev) => ({ ...prev, text: undefined }));
      }
      if (field === "ctaLink" && errors.ctaLink) {
        setErrors((prev) => ({ ...prev, ctaLink: undefined }));
      }
    },
    [errors]
  );



  // Update logic for deep nested keys
  const updateContent = (field: keyof FormData['content'], value: string) => updateField("content", field, value);
  const updateStyle = (field: keyof FormData['style'], value: any) => updateField("style", field, value);
  const updateSettings = (field: keyof FormData['settings'], value: boolean) => updateField("settings", field, value);
  const updateExtra = (field: keyof FormData['extra'], value: string) => updateField("extra", field, value);
  const updateFreeShipping = (field: keyof FormData['freeShipping'], value: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      freeShipping: {
        ...prev.freeShipping,
        [field]: value,
      },
    }));
    // Clear threshold error when field is updated
    if (field === "threshold" && errors.threshold) {
      setErrors((prev) => ({ ...prev, threshold: undefined }));
    }
  };

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // For free shipping, text is auto-generated
    if (formData.type !== "free_shipping" && !formData.content.text.trim()) {
      newErrors.text = "Announcement text is required";
    }

    if (formData.type !== "countdown" && formData.type !== "free_shipping" && formData.content.ctaLink && !isValidUrl(formData.content.ctaLink)) {
      newErrors.ctaLink = "Please enter a valid URL";
    }

    if (formData.type === "countdown" && !formData.extra.endDatetime) {
      newErrors.endDatetime = "End date is required";
    }

    // Free shipping validation
    if (formData.type === "free_shipping") {
      const threshold = parseFloat(formData.freeShipping.threshold);
      if (isNaN(threshold) || threshold <= 0) {
        newErrors.threshold = "Threshold must be a positive number";
      } else if (threshold >= 100000) {
        newErrors.threshold = "Threshold must be less than 100,000";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submit
  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      shopify.toast.show("Please fix the form errors", { isError: true });
      return;
    }

    setIsDirty(false);
    const submitData = new FormData();
    submitData.append("type", formData.type);
    submitData.append("text", formData.content.text);
    submitData.append("ctaText", formData.content.ctaText);
    submitData.append("ctaLink", formData.content.ctaLink);
    submitData.append("position", formData.style.position);
    submitData.append("bgColor", formData.style.bgColor);
    submitData.append("textColor", formData.style.textColor);
    submitData.append("fontSize", formData.style.fontSize);
    submitData.append("enabled", String(formData.settings.enabled));
    submitData.append("dismissible", String(formData.settings.dismissible));
    submitData.append("hideWhenExpired", String(formData.settings.hideWhenExpired));
    submitData.append("endDatetime", formData.extra.endDatetime);
    submitData.append("expiredText", formData.extra.expiredText);

    // Free shipping fields
    submitData.append("shippingThreshold", formData.freeShipping.threshold);
    submitData.append("shippingCurrency", formData.freeShipping.currency);
    submitData.append("progressMessage", formData.freeShipping.progressMessage);
    submitData.append("successMessage", formData.freeShipping.successMessage);
    submitData.append("progressBarColor", formData.style.progressBarColor);
    submitData.append("progressBarBgColor", formData.style.progressBarBgColor);
    submitData.append("showProgressBar", String(formData.settings.showProgressBar));

    submit(submitData, { method: "post" });
  }, [formData, validateForm, submit, shopify]);



  // Check if selected type is premium
  const isPremiumType = formData.type === "email_signup";

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Create Announcement Bar"
    >
      <TitleBar title="Create Announcement Bar">
        <button onClick={() => navigate("/app")}>Cancel</button>
        <button variant="primary" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Error Banner */}
        {actionData && !actionData.success && (
          <Banner tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Premium Type Warning */}
        {isPremiumType && (
          <Banner tone="warning" title="Premium Feature">
            <p>
              Email Capture bars require a Premium subscription. Upgrade your plan to use this feature.
            </p>
          </Banner>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Something went wrong">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}
        <Layout>
          {/* Left Column - Form (60%) */}
          <Layout.Section>
            <BlockStack gap="500">
              {/* Bar Type Selector */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Bar Type
                  </Text>
                  <Select
                    label="Select the type of announcement bar"
                    labelHidden
                    options={barTypeOptions}
                    value={formData.type}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        type: value as BarType,
                        // Pre-fill text for countdown
                        content: {
                          ...prev.content,
                          text: value === 'countdown' && !prev.content.text ? "Sale ends in:" : prev.content.text
                        },
                        // Set appropriate defaults for free shipping
                        settings: {
                          ...prev.settings,
                          dismissible: value === 'free_shipping' ? false : prev.settings.dismissible,
                        }
                      }));
                      // Clear errors when switching types
                      setErrors({});
                    }}
                  />
                </BlockStack>
              </Card>

              {/* Content Section */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Content
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Announcement Text"
                      value={formData.content.text}
                      onChange={(value) => updateContent("text", value)}
                      placeholder={formData.type === "countdown" ? "Sale ends in:" : "🎉 Free shipping on orders over $50!"}
                      multiline={2}
                      maxLength={150}
                      showCharacterCount
                      autoComplete="off"
                      error={errors.text}
                      requiredIndicator
                      helpText="This is the main message visitors will see"
                    />

                    {formData.type !== "countdown" && (
                      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <TextField
                          label="Button Text"
                          value={formData.content.ctaText}
                          onChange={(value) => updateContent("ctaText", value)}
                          placeholder="Shop Now"
                          autoComplete="off"
                          helpText="Optional call-to-action button"
                        />
                        <TextField
                          label="Button Link"
                          value={formData.content.ctaLink}
                          onChange={(value) => updateContent("ctaLink", value)}
                          placeholder="/collections/sale or https://..."
                          autoComplete="off"
                          error={errors.ctaLink}
                          helpText="Where the button links to"
                        />
                      </InlineGrid>
                    )}

                    {formData.type === "countdown" && (
                      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <TextField
                          label="End Date & Time"
                          type="datetime-local"
                          value={formData.extra.endDatetime}
                          onChange={(value) => updateExtra("endDatetime", value)}
                          autoComplete="off"
                          error={errors.endDatetime}
                          requiredIndicator
                        />
                        <TextField
                          label="Expired Message"
                          value={formData.extra.expiredText}
                          onChange={(value) => updateExtra("expiredText", value)}
                          placeholder="This offer has ended"
                          autoComplete="off"
                          helpText="Shown when countdown reaches zero"
                        />
                      </InlineGrid>
                    )}

                    {formData.type === "free_shipping" && (
                      <>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Shipping Threshold Amount"
                            type="number"
                            value={formData.freeShipping.threshold}
                            onChange={(value) => updateFreeShipping("threshold", value)}
                            autoComplete="off"
                            error={errors.threshold}
                            requiredIndicator
                            helpText="Minimum cart value for free shipping"
                            min={1}
                            max={99999}
                          />
                          <Select
                            label="Currency"
                            options={currencyOptions}
                            value={formData.freeShipping.currency}
                            onChange={(value) => updateFreeShipping("currency", value)}
                            helpText="Display currency for threshold"
                          />
                        </InlineGrid>
                        <TextField
                          label="Progress Message"
                          value={formData.freeShipping.progressMessage}
                          onChange={(value) => updateFreeShipping("progressMessage", value)}
                          placeholder="Spend {remaining} more for FREE shipping!"
                          autoComplete="off"
                          helpText="Use {remaining} placeholder for the remaining amount"
                          maxLength={150}
                          showCharacterCount
                        />
                        <TextField
                          label="Success Message"
                          value={formData.freeShipping.successMessage}
                          onChange={(value) => updateFreeShipping("successMessage", value)}
                          placeholder="Congratulations! You've unlocked FREE shipping!"
                          autoComplete="off"
                          helpText="Shown when cart value meets the threshold"
                          maxLength={150}
                          showCharacterCount
                        />
                      </>
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Style Section */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Style
                  </Text>
                  <FormLayout>
                    {/* Position */}
                    <BlockStack gap="200">
                      <Text as="span" variant="bodyMd">
                        Position
                      </Text>
                      <ButtonGroup variant="segmented">
                        <Button
                          pressed={formData.style.position === "top"}
                          onClick={() => updateField("style", "position", "top")}
                        >
                          Top
                        </Button>
                        <Button
                          pressed={formData.style.position === "bottom"}
                          onClick={() => updateField("style", "position", "bottom")}
                        >
                          Bottom
                        </Button>
                      </ButtonGroup>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Where the bar appears on your store
                      </Text>
                    </BlockStack>

                    {/* Colors */}
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                      <ColorPicker
                        label="Background Color"
                        value={formData.style.bgColor}
                        onChange={(color) => updateField("style", "bgColor", color)}
                        helpText="Choose a contrasting color for visibility"
                      />
                      <ColorPicker
                        label="Text Color"
                        value={formData.style.textColor}
                        onChange={(color) => updateField("style", "textColor", color)}
                        helpText="Should contrast with background"
                      />
                    </InlineGrid>

                    {/* Progress Bar Colors (Free Shipping only) */}
                    {formData.type === "free_shipping" && (
                      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <ColorPicker
                          label="Progress Bar Color"
                          value={formData.style.progressBarColor}
                          onChange={(color) => updateField("style", "progressBarColor", color)}
                          helpText="Color of the filled progress"
                        />
                        <ColorPicker
                          label="Progress Bar Background"
                          value={formData.style.progressBarBgColor}
                          onChange={(color) => updateField("style", "progressBarBgColor", color)}
                          helpText="Color of the unfilled progress"
                        />
                      </InlineGrid>
                    )}

                    {/* Font Size */}
                    <FontSizeSelector
                      value={formData.style.fontSize}
                      onChange={(size) => updateField("style", "fontSize", size)}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Settings Section */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Settings
                  </Text>
                  <BlockStack gap="300">
                    <Checkbox
                      label="Enable this bar"
                      helpText="Bar will be visible on your store when enabled"
                      checked={formData.settings.enabled}
                      onChange={(checked) => updateField("settings", "enabled", checked)}
                    />
                    <Checkbox
                      label="Allow visitors to dismiss"
                      helpText="Shows an X button so visitors can close the bar"
                      checked={formData.settings.dismissible}
                      onChange={(checked) => updateSettings("dismissible", checked)}
                    />
                    {formData.type === "countdown" && (
                      <Checkbox
                        label="Hide bar when expired"
                        helpText="If checked, the bar will disappear instead of showing the expired message"
                        checked={formData.settings.hideWhenExpired}
                        onChange={(checked) => updateSettings("hideWhenExpired", checked)}
                      />
                    )}
                    {formData.type === "free_shipping" && (
                      <Checkbox
                        label="Show progress bar visual"
                        helpText="Display a visual progress bar showing how close to free shipping"
                        checked={formData.settings.showProgressBar}
                        onChange={(checked) => updateSettings("showProgressBar", checked)}
                      />
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Right Column - Preview (40%) */}
          <Layout.Section variant="oneThird">
            <Box position="sticky" insetBlockStart="400">
              <BarPreview
                type={formData.type}
                content={{
                  text: formData.content.text,
                  ctaText: formData.content.ctaText,
                  ctaLink: formData.content.ctaLink,
                  endDatetime: formData.extra.endDatetime,
                  expiredText: formData.extra.expiredText,
                  freeShipping: formData.type === "free_shipping" ? {
                    threshold: parseFloat(formData.freeShipping.threshold) || 50,
                    currency: formData.freeShipping.currency,
                    progressMessage: formData.freeShipping.progressMessage,
                    successMessage: formData.freeShipping.successMessage,
                  } : undefined,
                }}
                style={{
                  position: formData.style.position,
                  bgColor: formData.style.bgColor,
                  textColor: formData.style.textColor,
                  fontSize: formData.style.fontSize,
                  progressBarColor: formData.style.progressBarColor,
                  progressBarBgColor: formData.style.progressBarBgColor,
                }}
                settings={{
                  dismissible: formData.settings.dismissible,
                  hideWhenExpired: formData.settings.hideWhenExpired,
                  showProgressBar: formData.settings.showProgressBar,
                }}
              />

              {/* Tips Card */}
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">
                      Tips
                    </Text>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        • Keep messages short and actionable
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        • Use contrasting colors for visibility
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        • Add a CTA button to drive clicks
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Box>
            </Box>
          </Layout.Section>
        </Layout>

        {/* Form Footer */}
        <Divider />
        <InlineStack align="end" gap="300">
          <Button onClick={() => navigate("/app")}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSaving}>
            Create Bar
          </Button>
        </InlineStack>
      </BlockStack>
      {blocker.state === "blocked" && (
        <Modal
          open
          title="Unsaved changes"
          primaryAction={{
            content: "Discard changes",
            onAction: () => blocker.proceed(),
            destructive: true,
          }}
          secondaryActions={[{
            content: "Keep editing",
            onAction: () => blocker.reset(),
          }]}
          onClose={() => blocker.reset()}
        >
          <Modal.Section>
            <p>You have unsaved changes. Leaving this page will discard them.</p>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
