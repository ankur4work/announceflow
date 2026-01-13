import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useSubmit, useNavigation, useBlocker } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, Text, TextField, Select, Button,
  InlineStack, Box, Divider, Checkbox, Banner, FormLayout, Modal, InlineError, InlineGrid,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { getBarById, updateBar, deleteBar } from "../lib/metafields.server";
import type { BarType, BarPosition, FontSize, CTAStyle } from "../lib/types";
import { ColorPicker, FontSizeSelector, BarPreview } from "../components";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const barId = params.id;
  if (!barId) return redirect("/app");

  const bar = await getBarById(admin, barId);
  if (!bar) return redirect("/app?error=not_found");

  return json({ bar });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const barId = params.id as string;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    const result = await deleteBar(admin, barId);
    if (result.success) return redirect("/app?deleted=true");
    return json({ success: false, error: result.errors?.join(", ") || "Failed to delete" }, { status: 500 });
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as BarType;
  const text = formData.get("text") as string;
  const ctaText = formData.get("ctaText") as string;
  const ctaLink = formData.get("ctaLink") as string;
  const ctaStyle = formData.get("ctaStyle") as CTAStyle;
  const position = formData.get("position") as BarPosition;
  const bgColor = formData.get("bgColor") as string;
  const textColor = formData.get("textColor") as string;
  const fontSize = formData.get("fontSize") as FontSize;
  const buttonBgColor = formData.get("buttonBgColor") as string;
  const buttonTextColor = formData.get("buttonTextColor") as string;
  const progressColor = formData.get("progressColor") as string;
  const progressBgColor = formData.get("progressBgColor") as string;
  const enabled = formData.get("enabled") === "true";
  const dismissible = formData.get("dismissible") === "true";
  const endDatetime = formData.get("endDatetime") as string;
  const expiredText = formData.get("expiredText") as string;
  const hideWhenExpired = formData.get("hideWhenExpired") === "true";
  // Email capture fields
  const emailPlaceholder = formData.get("emailPlaceholder") as string;
  const emailButtonText = formData.get("emailButtonText") as string;
  const emailSuccessMessage = formData.get("emailSuccessMessage") as string;
  const emailErrorMessage = formData.get("emailErrorMessage") as string;
  // Cookie consent fields
  const acceptText = formData.get("acceptText") as string;
  const declineText = formData.get("declineText") as string;
  const privacyLink = formData.get("privacyLink") as string;
  const privacyText = formData.get("privacyText") as string;
  const showDecline = formData.get("showDecline") === "true";
  // Free shipping fields
  const shippingThreshold = formData.get("shippingThreshold") as string;
  const shippingCurrency = formData.get("shippingCurrency") as string;
  const shippingMessageTemplate = formData.get("shippingMessageTemplate") as string;
  const shippingSuccessMessage = formData.get("shippingSuccessMessage") as string;
  const showProgressBar = formData.get("showProgressBar") === "true";

  // Validation
  if (!name) {
    return json({ success: false, error: "Name is required" }, { status: 400 });
  }

  if (type !== "cookie_consent" && type !== "free_shipping" && (!text || !text.trim())) {
    return json({ success: false, error: "Announcement text is required" }, { status: 400 });
  }

  if (type === "countdown") {
    if (!endDatetime) {
      return json({ success: false, error: "End date/time is required for countdown bars" }, { status: 400 });
    }
    const endDate = new Date(endDatetime);
    if (isNaN(endDate.getTime())) {
      return json({ success: false, error: "Invalid date format" }, { status: 400 });
    }
    if (enabled && endDate.getTime() <= Date.now()) {
      return json({ success: false, error: "End date must be in the future for enabled bars" }, { status: 400 });
    }
  }

  if (type === "cookie_consent" && (!privacyLink || !privacyLink.trim())) {
    return json({ success: false, error: "Privacy policy URL is required" }, { status: 400 });
  }

  if (type === "free_shipping") {
    const threshold = parseFloat(shippingThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return json({ success: false, error: "Shipping threshold must be a positive number" }, { status: 400 });
    }
  }

  // Build content based on bar type
  const content: Record<string, unknown> = { text };

  if (type === "promotional" || type === "announcement") {
    if (ctaText) content.cta_text = ctaText;
    if (ctaLink) content.cta_link = ctaLink;
    content.cta_style = ctaStyle || "primary";
  }

  if (type === "countdown") {
    content.end_datetime = endDatetime;
    content.expired_text = expiredText || "This offer has ended";
  }

  if (type === "email_signup") {
    content.placeholder = emailPlaceholder || "Enter your email";
    content.button_text = emailButtonText || "Subscribe";
    content.success_message = emailSuccessMessage || "Thanks! Check your inbox.";
    content.error_message = emailErrorMessage || "Please enter a valid email";
  }

  if (type === "cookie_consent") {
    content.accept_text = acceptText || "Accept";
    content.decline_text = declineText || "Decline";
    content.privacy_link = privacyLink;
    content.privacy_text = privacyText || "Learn more";
  }

  if (type === "free_shipping") {
    content.threshold = parseFloat(shippingThreshold) || 50;
    content.currency = shippingCurrency || "USD";
    content.message_template = shippingMessageTemplate || "Spend {remaining} more for FREE shipping!";
    content.success_message = shippingSuccessMessage || "You've unlocked FREE shipping!";
  }

  // Build style
  const style: Record<string, unknown> = {
    position,
    bg_color: bgColor,
    text_color: textColor,
    font_size: fontSize,
  };

  if (type === "email_signup" || type === "cookie_consent") {
    style.button_bg_color = buttonBgColor;
    style.button_text_color = buttonTextColor;
  }

  if (type === "free_shipping") {
    style.progress_color = progressColor;
    style.progress_bg_color = progressBgColor;
  }

  // Build settings
  const settings: Record<string, unknown> = {
    dismissible: type !== "cookie_consent" ? dismissible : false,
  };

  if (type === "countdown") {
    settings.hide_when_expired = hideWhenExpired;
  }

  if (type === "cookie_consent") {
    settings.show_decline = showDecline;
  }

  if (type === "free_shipping") {
    settings.show_progress_bar = showProgressBar;
  }

  const result = await updateBar(admin, barId, {
    name, type, enabled,
    content: content as any,
    style: style as any,
    settings: settings as any,
  });

  if (result.success) return redirect("/app?updated=true");
  return json({ success: false, error: result.errors?.join(", ") || "Failed" }, { status: 500 });
};

export default function EditBar() {
  const { bar } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();

  const [name, setName] = useState(bar.name);
  const [type, setType] = useState<BarType>(bar.type);
  const [text, setText] = useState(bar.content.text);
  const [ctaText, setCtaText] = useState(bar.content.cta_text || "");
  const [ctaLink, setCtaLink] = useState(bar.content.cta_link || "");
  const [ctaStyle, setCtaStyle] = useState<CTAStyle>(bar.content.cta_style || "primary");
  const [position, setPosition] = useState<BarPosition>(bar.style.position);
  const [bgColor, setBgColor] = useState(bar.style.bg_color);
  const [textColor, setTextColor] = useState(bar.style.text_color);
  const [fontSize, setFontSize] = useState<FontSize>(bar.style.font_size);
  const [enabled, setEnabled] = useState(bar.enabled);
  const [dismissible, setDismissible] = useState(bar.settings.dismissible);
  const [endDatetime, setEndDatetime] = useState(bar.content.end_datetime || "");
  const [expiredText, setExpiredText] = useState(bar.content.expired_text || "This offer has ended");
  const [hideWhenExpired, setHideWhenExpired] = useState(bar.settings.hide_when_expired || false);
  // Email capture fields
  const [emailPlaceholder, setEmailPlaceholder] = useState(bar.content.placeholder || "Enter your email");
  const [emailButtonText, setEmailButtonText] = useState(bar.content.button_text || "Subscribe");
  const [emailSuccessMessage, setEmailSuccessMessage] = useState(bar.content.success_message || "Thanks! Check your inbox.");
  const [emailErrorMessage, setEmailErrorMessage] = useState(bar.content.error_message || "Please enter a valid email");
  // Cookie consent fields
  const [acceptText, setAcceptText] = useState(bar.content.accept_text || "Accept");
  const [declineText, setDeclineText] = useState(bar.content.decline_text || "Decline");
  const [privacyLink, setPrivacyLink] = useState(bar.content.privacy_link || "/pages/privacy-policy");
  const [privacyText, setPrivacyText] = useState(bar.content.privacy_text || "Learn more");
  const [showDecline, setShowDecline] = useState(bar.settings.show_decline !== false);
  // Free shipping fields
  const [shippingThreshold, setShippingThreshold] = useState(String(bar.content.threshold || 50));
  const [shippingCurrency, setShippingCurrency] = useState(bar.content.currency || "USD");
  const [shippingMessageTemplate, setShippingMessageTemplate] = useState(bar.content.message_template || "Spend {remaining} more for FREE shipping!");
  const [shippingSuccessMessage, setShippingSuccessMessage] = useState(bar.content.success_message || "You've unlocked FREE shipping!");
  const [showProgressBar, setShowProgressBar] = useState(bar.settings.show_progress_bar !== false);
  // Style extensions
  const [buttonBgColor, setButtonBgColor] = useState(bar.style.button_bg_color || "#E74C3C");
  const [buttonTextColor, setButtonTextColor] = useState(bar.style.button_text_color || "#FFFFFF");
  const [progressColor, setProgressColor] = useState(bar.style.progress_color || "#FFFFFF");
  const [progressBgColor, setProgressBgColor] = useState(bar.style.progress_bg_color || "rgba(255,255,255,0.3)");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const isChanged =
      name !== bar.name ||
      type !== bar.type ||
      text !== bar.content.text ||
      ctaText !== (bar.content.cta_text || "") ||
      ctaLink !== (bar.content.cta_link || "") ||
      ctaStyle !== (bar.content.cta_style || "primary") ||
      position !== bar.style.position ||
      bgColor !== bar.style.bg_color ||
      textColor !== bar.style.text_color ||
      fontSize !== bar.style.font_size ||
      enabled !== bar.enabled ||
      dismissible !== bar.settings.dismissible ||
      endDatetime !== (bar.content.end_datetime || "") ||
      expiredText !== (bar.content.expired_text || "This offer has ended") ||
      hideWhenExpired !== (bar.settings.hide_when_expired || false) ||
      // Email capture fields
      emailPlaceholder !== (bar.content.placeholder || "Enter your email") ||
      emailButtonText !== (bar.content.button_text || "Subscribe") ||
      emailSuccessMessage !== (bar.content.success_message || "Thanks! Check your inbox.") ||
      emailErrorMessage !== (bar.content.error_message || "Please enter a valid email") ||
      // Cookie consent fields
      acceptText !== (bar.content.accept_text || "Accept") ||
      declineText !== (bar.content.decline_text || "Decline") ||
      privacyLink !== (bar.content.privacy_link || "/pages/privacy-policy") ||
      privacyText !== (bar.content.privacy_text || "Learn more") ||
      showDecline !== (bar.settings.show_decline !== false) ||
      // Free shipping fields
      shippingThreshold !== String(bar.content.threshold || 50) ||
      shippingCurrency !== (bar.content.currency || "USD") ||
      shippingMessageTemplate !== (bar.content.message_template || "Spend {remaining} more for FREE shipping!") ||
      shippingSuccessMessage !== (bar.content.success_message || "You've unlocked FREE shipping!") ||
      showProgressBar !== (bar.settings.show_progress_bar !== false) ||
      // Style extensions
      buttonBgColor !== (bar.style.button_bg_color || "#E74C3C") ||
      buttonTextColor !== (bar.style.button_text_color || "#FFFFFF") ||
      progressColor !== (bar.style.progress_color || "#FFFFFF") ||
      progressBgColor !== (bar.style.progress_bg_color || "rgba(255,255,255,0.3)");
    setIsDirty(isChanged);
  }, [name, type, text, ctaText, ctaLink, ctaStyle, position, bgColor, textColor, fontSize, enabled, dismissible, endDatetime, expiredText, hideWhenExpired, emailPlaceholder, emailButtonText, emailSuccessMessage, emailErrorMessage, acceptText, declineText, privacyLink, privacyText, showDecline, shippingThreshold, shippingCurrency, shippingMessageTemplate, shippingSuccessMessage, showProgressBar, buttonBgColor, buttonTextColor, progressColor, progressBgColor, bar]);


  useEffect(() => {
    if (actionData && !actionData.success) {
      shopify.toast.show(actionData.error || "Failed", { isError: true });

    }
  }, [actionData, shopify]);



  const barTypeOptions = [
    { label: "Promotional Announcement", value: "promotional" },
    { label: "Countdown Timer", value: "countdown" },
    { label: "Free Shipping Progress", value: "free_shipping" },
    { label: "Email Capture ★ Premium", value: "email_signup" },
    { label: "Cookie Consent", value: "cookie_consent" },
  ];
  const ctaStyleOptions = [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Link", value: "link" }];

  // Get minimum datetime (now + 1 minute)
  const minDatetime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  }, []);

  // Check if countdown has expired
  const isCountdownExpired = useMemo(() => {
    if (type !== "countdown" || !endDatetime) return false;
    const endDate = new Date(endDatetime);
    return !isNaN(endDate.getTime()) && endDate.getTime() <= Date.now();
  }, [type, endDatetime]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Required";
    if (type !== "cookie_consent" && type !== "free_shipping" && !text.trim()) {
      newErrors.text = "Required";
    }
    if ((type === "promotional" || type === "announcement") && ctaText && !ctaLink) {
      newErrors.ctaLink = "Required with button";
    }
    if (type === "countdown") {
      if (!endDatetime) {
        newErrors.endDatetime = "End date and time is required";
      } else {
        const endDate = new Date(endDatetime);
        if (isNaN(endDate.getTime())) {
          newErrors.endDatetime = "Invalid date format";
        } else if (enabled && endDate.getTime() <= Date.now()) {
          newErrors.endDatetime = "End date must be in the future for enabled bars";
        }
      }
    }
    if (type === "cookie_consent" && !privacyLink.trim()) {
      newErrors.privacyLink = "Privacy policy URL is required";
    }
    if (type === "free_shipping") {
      const threshold = parseFloat(shippingThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        newErrors.shippingThreshold = "Must be a positive number";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, text, ctaText, ctaLink, type, endDatetime, enabled, privacyLink, shippingThreshold]);

  const handleSave = useCallback(() => {
    if (!validateForm()) { shopify.toast.show("Please fix the errors", { isError: true }); return; }

    setIsDirty(false);
    const formData = new FormData();
    formData.append("intent", "save");
    formData.append("name", name);
    formData.append("type", type);
    formData.append("text", text);
    formData.append("ctaText", ctaText);
    formData.append("ctaLink", ctaLink);
    formData.append("ctaStyle", ctaStyle);
    formData.append("position", position);
    formData.append("bgColor", bgColor);
    formData.append("textColor", textColor);
    formData.append("fontSize", fontSize);
    formData.append("buttonBgColor", buttonBgColor);
    formData.append("buttonTextColor", buttonTextColor);
    formData.append("progressColor", progressColor);
    formData.append("progressBgColor", progressBgColor);
    formData.append("enabled", String(enabled));
    formData.append("dismissible", String(dismissible));
    formData.append("endDatetime", endDatetime);
    formData.append("expiredText", expiredText);
    formData.append("hideWhenExpired", String(hideWhenExpired));
    // Email fields
    formData.append("emailPlaceholder", emailPlaceholder);
    formData.append("emailButtonText", emailButtonText);
    formData.append("emailSuccessMessage", emailSuccessMessage);
    formData.append("emailErrorMessage", emailErrorMessage);
    // Cookie fields
    formData.append("acceptText", acceptText);
    formData.append("declineText", declineText);
    formData.append("privacyLink", privacyLink);
    formData.append("privacyText", privacyText);
    formData.append("showDecline", String(showDecline));
    // Shipping fields
    formData.append("shippingThreshold", shippingThreshold);
    formData.append("shippingCurrency", shippingCurrency);
    formData.append("shippingMessageTemplate", shippingMessageTemplate);
    formData.append("shippingSuccessMessage", shippingSuccessMessage);
    formData.append("showProgressBar", String(showProgressBar));
    submit(formData, { method: "post" });
  }, [validateForm, submit, shopify, name, type, text, ctaText, ctaLink, ctaStyle, position, bgColor, textColor, fontSize, buttonBgColor, buttonTextColor, progressColor, progressBgColor, enabled, dismissible, endDatetime, expiredText, hideWhenExpired, emailPlaceholder, emailButtonText, emailSuccessMessage, emailErrorMessage, acceptText, declineText, privacyLink, privacyText, showDecline, shippingThreshold, shippingCurrency, shippingMessageTemplate, shippingSuccessMessage, showProgressBar]);

  const handleDelete = useCallback(() => {
    const formData = new FormData();
    formData.append("intent", "delete");
    submit(formData, { method: "post" });
    setShowDeleteModal(false);
  }, [submit]);

  const handleTypeChange = useCallback((newType: string) => {
    setType(newType as BarType);
    setErrors({});
    // Set default text for different bar types
    if (newType === "countdown" && !text) {
      setText("Sale ends in:");
    } else if (newType === "cookie_consent" && !text) {
      setText("We use cookies to improve your experience.");
    } else if (newType === "email_signup" && !text) {
      setText("Get 10% off your first order!");
    }
    // Clear text if it was the default from another type
    if (newType !== "countdown" && text === "Sale ends in:") {
      setText("");
    }
    if (newType !== "cookie_consent" && text === "We use cookies to improve your experience.") {
      setText("");
    }
    if (newType !== "email_signup" && text === "Get 10% off your first order!") {
      setText("");
    }
  }, [text]);



  const formattedEndDate = useMemo(() => {
    if (!endDatetime) return null;
    const date = new Date(endDatetime);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [endDatetime]);

  return (
    <Page backAction={{ content: "Dashboard", onAction: () => navigate("/app") }} title={`Edit: ${bar.name}`}>
      <TitleBar title="Edit Announcement Bar">
        <button variant="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
      </TitleBar>
      <BlockStack gap="500">
        {actionData && !actionData.success && <Banner tone="critical"><p>{actionData.error}</p></Banner>}
        {enabled && !isCountdownExpired && <Banner tone="success">This bar is active on your store.</Banner>}
        {type === "countdown" && isCountdownExpired && (
          <Banner tone="warning">
            This countdown has expired. {hideWhenExpired ? "The bar is hidden." : `Showing: "${expiredText}"`}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            {/* Bar Type Selection */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Bar Type</Text>
                <Select
                  label="Type"
                  labelHidden
                  options={barTypeOptions}
                  value={type}
                  onChange={handleTypeChange}
                  helpText={type === "countdown" ? "Display a countdown timer to create urgency" : ""}
                />
              </BlockStack>
            </Card>

            {/* Content Section */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Content</Text>
                  <FormLayout>
                    <TextField
                      label="Bar Name"
                      value={name}
                      onChange={setName}
                      placeholder="e.g., Flash Sale Countdown"
                      helpText="Internal name for organization"
                      autoComplete="off"
                      error={errors.name}
                      requiredIndicator
                    />
                    <TextField
                      label={
                        type === "countdown" ? "Countdown Message" :
                        type === "email_signup" ? "Headline Text" :
                        type === "cookie_consent" ? "Consent Message" :
                        type === "free_shipping" ? "Message (Optional)" :
                        "Announcement Text"
                      }
                      value={text}
                      onChange={setText}
                      placeholder={
                        type === "countdown" ? "Sale ends in:" :
                        type === "email_signup" ? "Get 10% off your first order!" :
                        type === "cookie_consent" ? "We use cookies to improve your experience." :
                        type === "free_shipping" ? "Free shipping on orders over $50!" :
                        "Free shipping over $50!"
                      }
                      multiline={2}
                      autoComplete="off"
                      error={errors.text}
                      requiredIndicator={type !== "cookie_consent" && type !== "free_shipping"}
                      maxLength={200}
                      showCharacterCount
                      helpText={
                        type === "countdown" ? "Text displayed before the countdown timer" :
                        type === "email_signup" ? "Main headline to encourage signups" :
                        type === "cookie_consent" ? "Main consent message" :
                        type === "free_shipping" ? "Optional message (usually auto-generated from template)" :
                        ""
                      }
                    />

                    {/* CTA Fields (promotional/announcement only) */}
                    {(type === "promotional" || type === "announcement") && (
                      <>
                        <FormLayout.Group>
                          <TextField
                            label="CTA Button Text"
                            value={ctaText}
                            onChange={setCtaText}
                            placeholder="Shop Now"
                            autoComplete="off"
                            helpText="Optional"
                          />
                          <TextField
                            label="CTA Link URL"
                            value={ctaLink}
                            onChange={setCtaLink}
                            placeholder="/collections/sale"
                            autoComplete="off"
                            error={errors.ctaLink}
                          />
                        </FormLayout.Group>
                        {ctaText && (
                          <Select
                            label="Button Style"
                            options={ctaStyleOptions}
                            value={ctaStyle}
                            onChange={(v) => setCtaStyle(v as CTAStyle)}
                          />
                        )}
                      </>
                    )}

                    {/* Countdown Fields */}
                    {type === "countdown" && (
                      <>
                        <BlockStack gap="200">
                          <Text as="span" variant="bodyMd">End Date & Time <span style={{ color: "#bf0711" }}>*</span></Text>
                          <Box>
                            <input
                              type="datetime-local"
                              value={endDatetime}
                              onChange={(e) => {
                                setEndDatetime(e.target.value);
                                if (errors.endDatetime) {
                                  setErrors((prev) => ({ ...prev, endDatetime: "" }));
                                }
                              }}
                              min={minDatetime}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                fontSize: "14px",
                                border: errors.endDatetime ? "2px solid #bf0711" : "1px solid #8c9196",
                                borderRadius: "8px",
                                backgroundColor: "#fff",
                                color: "#202223",
                                outline: "none",
                              }}
                            />
                          </Box>
                          {errors.endDatetime && <InlineError message={errors.endDatetime} fieldID="endDatetime" />}
                          <Text as="span" variant="bodySm" tone="subdued">
                            {isCountdownExpired
                              ? "This countdown has expired"
                              : formattedEndDate
                                ? `Countdown ends: ${formattedEndDate}`
                                : "Select when the countdown should end"}
                          </Text>
                        </BlockStack>

                        <TextField
                          label="Expired Message"
                          value={expiredText}
                          onChange={setExpiredText}
                          placeholder="This offer has ended"
                          autoComplete="off"
                          helpText="Shown when countdown reaches zero (if not hidden)"
                        />

                        <Checkbox
                          label="Hide bar when expired"
                          helpText="If unchecked, the expired message will be shown instead"
                          checked={hideWhenExpired}
                          onChange={setHideWhenExpired}
                        />
                      </>
                    )}

                    {/* Email Capture Fields */}
                    {type === "email_signup" && (
                      <>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Input Placeholder"
                            value={emailPlaceholder}
                            onChange={setEmailPlaceholder}
                            placeholder="Enter your email"
                            autoComplete="off"
                          />
                          <TextField
                            label="Button Text"
                            value={emailButtonText}
                            onChange={setEmailButtonText}
                            placeholder="Subscribe"
                            autoComplete="off"
                          />
                        </InlineGrid>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Success Message"
                            value={emailSuccessMessage}
                            onChange={setEmailSuccessMessage}
                            placeholder="Thanks! Check your inbox."
                            autoComplete="off"
                            helpText="Shown after successful submission"
                          />
                          <TextField
                            label="Error Message"
                            value={emailErrorMessage}
                            onChange={setEmailErrorMessage}
                            placeholder="Please enter a valid email"
                            autoComplete="off"
                            helpText="Shown for invalid email"
                          />
                        </InlineGrid>
                      </>
                    )}

                    {/* Cookie Consent Fields */}
                    {type === "cookie_consent" && (
                      <>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Accept Button Text"
                            value={acceptText}
                            onChange={setAcceptText}
                            placeholder="Accept"
                            autoComplete="off"
                          />
                          <TextField
                            label="Decline Button Text"
                            value={declineText}
                            onChange={setDeclineText}
                            placeholder="Decline"
                            autoComplete="off"
                          />
                        </InlineGrid>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Privacy Policy URL"
                            value={privacyLink}
                            onChange={setPrivacyLink}
                            placeholder="/pages/privacy-policy"
                            autoComplete="off"
                            requiredIndicator
                            helpText="Link to your privacy policy"
                            error={errors.privacyLink}
                          />
                          <TextField
                            label="Privacy Link Text"
                            value={privacyText}
                            onChange={setPrivacyText}
                            placeholder="Learn more"
                            autoComplete="off"
                          />
                        </InlineGrid>
                      </>
                    )}

                    {/* Free Shipping Fields */}
                    {type === "free_shipping" && (
                      <>
                        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                          <TextField
                            label="Shipping Threshold"
                            type="number"
                            value={shippingThreshold}
                            onChange={setShippingThreshold}
                            placeholder="50"
                            autoComplete="off"
                            requiredIndicator
                            helpText="Order amount for free shipping"
                          />
                          <Select
                            label="Currency"
                            options={[
                              { label: "USD ($)", value: "USD" },
                              { label: "EUR (€)", value: "EUR" },
                              { label: "GBP (£)", value: "GBP" },
                              { label: "INR (₹)", value: "INR" },
                              { label: "CAD ($)", value: "CAD" },
                              { label: "AUD ($)", value: "AUD" },
                            ]}
                            value={shippingCurrency}
                            onChange={setShippingCurrency}
                          />
                        </InlineGrid>
                        <TextField
                          label="Progress Message"
                          value={shippingMessageTemplate}
                          onChange={setShippingMessageTemplate}
                          placeholder="Spend {remaining} more for FREE shipping!"
                          autoComplete="off"
                          helpText="Use {remaining} for the remaining amount"
                        />
                        <TextField
                          label="Success Message"
                          value={shippingSuccessMessage}
                          onChange={setShippingSuccessMessage}
                          placeholder="You've unlocked FREE shipping!"
                          autoComplete="off"
                          helpText="Shown when threshold is reached"
                        />
                      </>
                    )}
                  </FormLayout>
                </BlockStack>
              </Card>
            </Box>

            {/* Style Section */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Style</Text>
                  <FormLayout>
                    <InlineStack gap="400" align="start">
                      <Box minWidth="100px"><Text as="span" variant="bodyMd">Position</Text></Box>
                      <InlineStack gap="200">
                        <Button pressed={position === "top"} onClick={() => setPosition("top")}>Top</Button>
                        <Button pressed={position === "bottom"} onClick={() => setPosition("bottom")}>Bottom</Button>
                      </InlineStack>
                    </InlineStack>

                    <FormLayout.Group>
                      <ColorPicker
                        label="Background Color"
                        value={bgColor}
                        onChange={setBgColor}
                      />
                      <ColorPicker
                        label="Text Color"
                        value={textColor}
                        onChange={setTextColor}
                      />
                    </FormLayout.Group>

                    {/* Button Colors - for email capture and cookie consent */}
                    {(type === "email_signup" || type === "cookie_consent") && (
                      <FormLayout.Group>
                        <ColorPicker
                          label="Button Background"
                          value={buttonBgColor}
                          onChange={setButtonBgColor}
                        />
                        <ColorPicker
                          label="Button Text Color"
                          value={buttonTextColor}
                          onChange={setButtonTextColor}
                        />
                      </FormLayout.Group>
                    )}

                    {/* Progress Bar Colors - for free shipping */}
                    {type === "free_shipping" && (
                      <FormLayout.Group>
                        <ColorPicker
                          label="Progress Bar Color"
                          value={progressColor}
                          onChange={setProgressColor}
                        />
                        <ColorPicker
                          label="Progress Bar Background"
                          value={progressBgColor}
                          onChange={setProgressBgColor}
                        />
                      </FormLayout.Group>
                    )}

                    <FontSizeSelector
                      value={fontSize}
                      onChange={setFontSize}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </Box>

            {/* Settings Section */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Settings</Text>
                  <Checkbox
                    label="Enable bar"
                    helpText="Bar will be visible on your store when enabled"
                    checked={enabled}
                    onChange={setEnabled}
                  />
                  {type !== "cookie_consent" && (
                    <Checkbox
                      label="Allow visitors to dismiss"
                      helpText="Show close button to let visitors hide the bar"
                      checked={dismissible}
                      onChange={setDismissible}
                    />
                  )}
                  {type === "cookie_consent" && (
                    <Checkbox
                      label="Show decline button"
                      helpText="If unchecked, only the Accept button will be shown"
                      checked={showDecline}
                      onChange={setShowDecline}
                    />
                  )}
                  {type === "free_shipping" && (
                    <Checkbox
                      label="Show progress bar"
                      helpText="Visual progress bar showing how close to free shipping"
                      checked={showProgressBar}
                      onChange={setShowProgressBar}
                    />
                  )}
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>

          {/* Preview Sidebar */}
          <Layout.Section variant="oneThird">
            <Box position="sticky" insetBlockStart="400">
              <BarPreview
                type={type}
                content={{
                  text: text,
                  ctaText: ctaText,
                  ctaLink: ctaLink,
                  endDatetime: endDatetime,
                  expiredText: expiredText,
                  // Email fields
                  placeholder: emailPlaceholder,
                  buttonText: emailButtonText,
                  successMessage: emailSuccessMessage,
                  // Cookie fields
                  acceptText: acceptText,
                  declineText: declineText,
                  privacyLink: privacyLink,
                  privacyText: privacyText,
                  // Shipping fields
                  threshold: parseFloat(shippingThreshold) || 50,
                  currency: shippingCurrency,
                  messageTemplate: shippingMessageTemplate,
                  shippingSuccessMessage: shippingSuccessMessage,
                }}
                style={{
                  position: position,
                  bgColor: bgColor,
                  textColor: textColor,
                  fontSize: fontSize,
                  buttonBgColor: buttonBgColor,
                  buttonTextColor: buttonTextColor,
                  progressColor: progressColor,
                  progressBgColor: progressBgColor,
                }}
                settings={{
                  dismissible: dismissible,
                  hideWhenExpired: hideWhenExpired,
                  showDecline: showDecline,
                  showProgressBar: showProgressBar,
                }}
              />

              {/* Status Card */}
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">Status</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: enabled && !isCountdownExpired ? "#008060" : isCountdownExpired ? "#ffc453" : "#8c9196",
                        }}
                      />
                      <Text as="span" variant="bodyMd">
                        {isCountdownExpired ? "Expired" : enabled ? "Active" : "Draft"}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </Box>

              {/* Type Info Card */}
              {type === "countdown" && (
                <Box paddingBlockStart="400">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">Countdown Info</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {isCountdownExpired ? (
                          hideWhenExpired
                            ? "This countdown has expired and the bar is hidden. Update the end date to reactivate."
                            : `This countdown has expired and is showing: "${expiredText}"`
                        ) : (
                          <>
                            The countdown timer will update in real-time on your store. When it reaches zero,
                            {hideWhenExpired ? " the bar will automatically hide." : ` it will show: "${expiredText}"`}
                          </>
                        )}
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>
              )}

              {/* Danger Zone */}
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd" tone="critical">Danger Zone</Text>
                    <Button tone="critical" onClick={() => setShowDeleteModal(true)}>Delete this bar</Button>
                  </BlockStack>
                </Card>
              </Box>
            </Box>
          </Layout.Section>
        </Layout>

        <Divider />
        <InlineStack align="end" gap="300">
          <Button onClick={() => navigate("/app")}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>Save changes</Button>
        </InlineStack>
      </BlockStack>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete announcement bar?"
        primaryAction={{ content: "Delete", destructive: true, onAction: handleDelete }}
        secondaryActions={[{ content: "Cancel", onAction: () => setShowDeleteModal(false) }]}
      >
        <Modal.Section>
          <Text as="p">Are you sure you want to delete "{bar.name}"? This action cannot be undone.</Text>
        </Modal.Section>
      </Modal>
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
