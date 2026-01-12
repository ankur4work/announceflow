import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useSubmit, useNavigation, useBlocker } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, Text, TextField, Select, Button,
  InlineStack, Box, Divider, Checkbox, Banner, FormLayout, Modal, InlineError,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { getBarById, updateBar, deleteBar } from "../lib/metafields.server";
import type { BarType, BarPosition, FontSize, CTAStyle, Currency } from "../lib/types";
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

  if (!name) {
    return json({ success: false, error: "Name is required" }, { status: 400 });
  }

  // Validation for non-free_shipping types
  if (type !== "free_shipping" && !text) {
    return json({ success: false, error: "Text is required" }, { status: 400 });
  }

  // Free shipping validation
  if (type === "free_shipping") {
    const threshold = parseFloat(shippingThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      return json({ success: false, error: "Shipping threshold must be a positive number" }, { status: 400 });
    }
    if (threshold >= 100000) {
      return json({ success: false, error: "Shipping threshold must be less than 100,000" }, { status: 400 });
    }
  }

  if (type === "countdown") {
    if (!endDatetime) {
      return json({ success: false, error: "End date/time is required for countdown bars" }, { status: 400 });
    }
    const endDate = new Date(endDatetime);
    if (isNaN(endDate.getTime())) {
      return json({ success: false, error: "Invalid date format" }, { status: 400 });
    }
    // For editing, allow past dates only if bar is disabled (to preserve historical data)
    if (enabled && endDate.getTime() <= Date.now()) {
      return json({ success: false, error: "End date must be in the future for enabled bars" }, { status: 400 });
    }
  }

  const result = await updateBar(admin, barId, {
    name, type, enabled,
    content: {
      text: type === "free_shipping" ? progressMessage : text,
      cta_text: type !== "countdown" && type !== "free_shipping" ? (ctaText || undefined) : undefined,
      cta_link: type !== "countdown" && type !== "free_shipping" ? (ctaLink || undefined) : undefined,
      cta_style: type !== "countdown" && type !== "free_shipping" ? ctaStyle : undefined,
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Free shipping state
  const [shippingThreshold, setShippingThreshold] = useState(
    bar.content.free_shipping?.threshold?.toString() || "50"
  );
  const [shippingCurrency, setShippingCurrency] = useState<Currency>(
    bar.content.free_shipping?.currency || "USD"
  );
  const [progressMessage, setProgressMessage] = useState(
    bar.content.free_shipping?.progress_message || "Spend {remaining} more for FREE shipping!"
  );
  const [successMessage, setSuccessMessage] = useState(
    bar.content.free_shipping?.success_message || "Congratulations! You've unlocked FREE shipping!"
  );
  const [progressBarColor, setProgressBarColor] = useState(
    bar.style.progress_bar_color || "#4CAF50"
  );
  const [progressBarBgColor, setProgressBarBgColor] = useState(
    bar.style.progress_bar_bg_color || "#E0E0E0"
  );
  const [showProgressBar, setShowProgressBar] = useState(
    bar.settings.show_progress_bar !== false
  );
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
      // Free shipping fields
      shippingThreshold !== (bar.content.free_shipping?.threshold?.toString() || "50") ||
      shippingCurrency !== (bar.content.free_shipping?.currency || "USD") ||
      progressMessage !== (bar.content.free_shipping?.progress_message || "Spend {remaining} more for FREE shipping!") ||
      successMessage !== (bar.content.free_shipping?.success_message || "Congratulations! You've unlocked FREE shipping!") ||
      progressBarColor !== (bar.style.progress_bar_color || "#4CAF50") ||
      progressBarBgColor !== (bar.style.progress_bar_bg_color || "#E0E0E0") ||
      showProgressBar !== (bar.settings.show_progress_bar !== false);
    setIsDirty(isChanged);
  }, [name, type, text, ctaText, ctaLink, ctaStyle, position, bgColor, textColor, fontSize, enabled, dismissible, endDatetime, expiredText, hideWhenExpired, shippingThreshold, shippingCurrency, progressMessage, successMessage, progressBarColor, progressBarBgColor, showProgressBar, bar]);


  useEffect(() => {
    if (actionData && !actionData.success) {
      shopify.toast.show(actionData.error || "Failed", { isError: true });

    }
  }, [actionData, shopify]);



  const barTypeOptions = [
    { label: "Promotional", value: "promotional" },
    { label: "Announcement", value: "announcement" },
    { label: "Countdown Timer", value: "countdown" },
    { label: "Free Shipping Progress", value: "free_shipping" },
  ];
  const ctaStyleOptions = [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Link", value: "link" }];

  // Currency options for free shipping
  const currencyOptions = [
    { label: "INR (₹)", value: "INR" },
    { label: "USD ($)", value: "USD" },
    { label: "EUR (€)", value: "EUR" },
    { label: "GBP (£)", value: "GBP" },
  ];

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
    if (type !== "free_shipping" && !text.trim()) newErrors.text = "Required";
    if (type !== "countdown" && type !== "free_shipping" && ctaText && !ctaLink) newErrors.ctaLink = "Required with button";
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
    // Free shipping validation
    if (type === "free_shipping") {
      const threshold = parseFloat(shippingThreshold);
      if (isNaN(threshold) || threshold <= 0) {
        newErrors.shippingThreshold = "Threshold must be a positive number";
      } else if (threshold >= 100000) {
        newErrors.shippingThreshold = "Threshold must be less than 100,000";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, text, ctaText, ctaLink, type, endDatetime, enabled, shippingThreshold]);

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
    formData.append("enabled", String(enabled));
    formData.append("dismissible", String(dismissible));
    formData.append("endDatetime", endDatetime);
    formData.append("expiredText", expiredText);
    formData.append("hideWhenExpired", String(hideWhenExpired));
    // Free shipping fields
    formData.append("shippingThreshold", shippingThreshold);
    formData.append("shippingCurrency", shippingCurrency);
    formData.append("progressMessage", progressMessage);
    formData.append("successMessage", successMessage);
    formData.append("progressBarColor", progressBarColor);
    formData.append("progressBarBgColor", progressBarBgColor);
    formData.append("showProgressBar", String(showProgressBar));
    submit(formData, { method: "post" });
  }, [validateForm, submit, shopify, name, type, text, ctaText, ctaLink, ctaStyle, position, bgColor, textColor, fontSize, enabled, dismissible, endDatetime, expiredText, hideWhenExpired, shippingThreshold, shippingCurrency, progressMessage, successMessage, progressBarColor, progressBarBgColor, showProgressBar]);

  const handleDelete = useCallback(() => {
    const formData = new FormData();
    formData.append("intent", "delete");
    submit(formData, { method: "post" });
    setShowDeleteModal(false);
  }, [submit]);

  const handleTypeChange = useCallback((newType: string) => {
    setType(newType as BarType);
    setErrors({});
    if (newType === "countdown" && !text) {
      setText("Sale ends in:");
    } else if (newType !== "countdown" && text === "Sale ends in:") {
      setText("");
    }
    // Set appropriate defaults for free shipping
    if (newType === "free_shipping") {
      setDismissible(false);
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
                    {type !== "free_shipping" && (
                      <TextField
                        label={type === "countdown" ? "Countdown Message" : "Announcement Text"}
                        value={text}
                        onChange={setText}
                        placeholder={type === "countdown" ? "Sale ends in:" : "Free shipping over $50!"}
                        multiline={2}
                        autoComplete="off"
                        error={errors.text}
                        requiredIndicator
                        maxLength={200}
                        showCharacterCount
                        helpText={type === "countdown" ? "Text displayed before the countdown timer" : ""}
                      />
                    )}

                    {/* CTA Fields (non-countdown and non-free_shipping only) */}
                    {type !== "countdown" && type !== "free_shipping" && (
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

                    {/* Free Shipping Fields */}
                    {type === "free_shipping" && (
                      <>
                        <FormLayout.Group>
                          <TextField
                            label="Shipping Threshold Amount"
                            type="number"
                            value={shippingThreshold}
                            onChange={setShippingThreshold}
                            autoComplete="off"
                            error={errors.shippingThreshold}
                            requiredIndicator
                            helpText="Minimum cart value for free shipping"
                          />
                          <Select
                            label="Currency"
                            options={currencyOptions}
                            value={shippingCurrency}
                            onChange={(value) => setShippingCurrency(value as Currency)}
                            helpText="Display currency for threshold"
                          />
                        </FormLayout.Group>
                        <TextField
                          label="Progress Message"
                          value={progressMessage}
                          onChange={setProgressMessage}
                          placeholder="Spend {remaining} more for FREE shipping!"
                          autoComplete="off"
                          helpText="Use {remaining} placeholder for the remaining amount"
                          maxLength={150}
                          showCharacterCount
                        />
                        <TextField
                          label="Success Message"
                          value={successMessage}
                          onChange={setSuccessMessage}
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

                    {/* Progress Bar Colors (Free Shipping only) */}
                    {type === "free_shipping" && (
                      <FormLayout.Group>
                        <ColorPicker
                          label="Progress Bar Color"
                          value={progressBarColor}
                          onChange={setProgressBarColor}
                        />
                        <ColorPicker
                          label="Progress Bar Background"
                          value={progressBarBgColor}
                          onChange={setProgressBarBgColor}
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
                  <Checkbox
                    label="Allow visitors to dismiss"
                    helpText="Show close button to let visitors hide the bar"
                    checked={dismissible}
                    onChange={setDismissible}
                  />
                  {type === "free_shipping" && (
                    <Checkbox
                      label="Show progress bar visual"
                      helpText="Display a visual progress bar showing how close to free shipping"
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
                  freeShipping: type === "free_shipping" ? {
                    threshold: parseFloat(shippingThreshold) || 50,
                    currency: shippingCurrency,
                    progressMessage: progressMessage,
                    successMessage: successMessage,
                  } : undefined,
                }}
                style={{
                  position: position,
                  bgColor: bgColor,
                  textColor: textColor,
                  fontSize: fontSize,
                  progressBarColor: progressBarColor,
                  progressBarBgColor: progressBarBgColor,
                }}
                settings={{
                  dismissible: dismissible,
                  hideWhenExpired: hideWhenExpired,
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
