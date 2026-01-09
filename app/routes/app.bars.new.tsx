import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, Text, TextField, Select, Button,
  InlineStack, Box, Divider, Checkbox, Banner, FormLayout, InlineError,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { createBar } from "../lib/metafields.server";
import type { BarType, BarPosition, FontSize, CTAStyle } from "../lib/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const validTypes = ["promotional", "announcement", "countdown", "email_signup", "free_shipping"];
  const initialType = validTypes.includes(typeParam || "") ? typeParam : "promotional";
  return json({ initialType });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
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

  if (!name || !text) {
    return json({ success: false, error: "Name and text required" }, { status: 400 });
  }

  if (type === "countdown") {
    if (!endDatetime) {
      return json({ success: false, error: "End date/time is required for countdown bars" }, { status: 400 });
    }
    const endDate = new Date(endDatetime);
    if (isNaN(endDate.getTime())) {
      return json({ success: false, error: "Invalid date format" }, { status: 400 });
    }
    if (endDate.getTime() <= Date.now()) {
      return json({ success: false, error: "End date must be in the future" }, { status: 400 });
    }
  }

  const result = await createBar(admin, {
    name, type, enabled,
    content: {
      text,
      cta_text: type !== "countdown" ? (ctaText || undefined) : undefined,
      cta_link: type !== "countdown" ? (ctaLink || undefined) : undefined,
      cta_style: type !== "countdown" ? ctaStyle : undefined,
      end_datetime: type === "countdown" ? endDatetime : undefined,
      expired_text: type === "countdown" ? (expiredText || "This offer has ended") : undefined,
    },
    style: { position, bg_color: bgColor, text_color: textColor, font_size: fontSize },
    settings: { dismissible, hide_when_expired: type === "countdown" ? hideWhenExpired : undefined },
  });

  if (result.success) return redirect("/app?created=true");
  return json({ success: false, error: result.errors?.join(", ") || "Failed" }, { status: 500 });
};

export default function NewBar() {
  const { initialType } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();

  const [name, setName] = useState("");
  const [type, setType] = useState<BarType>((initialType as BarType) || "promotional");
  const [text, setText] = useState(initialType === "countdown" ? "Sale ends in:" : "");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [ctaStyle, setCtaStyle] = useState<CTAStyle>("primary");
  const [position, setPosition] = useState<BarPosition>("top");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [enabled, setEnabled] = useState(false);
  const [dismissible, setDismissible] = useState(true);
  const [endDatetime, setEndDatetime] = useState("");
  const [expiredText, setExpiredText] = useState("This offer has ended");
  const [hideWhenExpired, setHideWhenExpired] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [countdownValues, setCountdownValues] = useState({ days: "00", hours: "00", minutes: "00", seconds: "00" });

  useEffect(() => {
    if (actionData && !actionData.success) {
      shopify.toast.show(actionData.error || "Failed", { isError: true });
      setIsSaving(false);
    }
  }, [actionData, shopify]);

  // Live countdown preview
  useEffect(() => {
    if (type !== "countdown" || !endDatetime) {
      setCountdownValues({ days: "12", hours: "08", minutes: "45", seconds: "30" });
      return;
    }

    const endDate = new Date(endDatetime);
    if (isNaN(endDate.getTime())) {
      setCountdownValues({ days: "00", hours: "00", minutes: "00", seconds: "00" });
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = endDate.getTime() - now;

      if (diff <= 0) {
        setCountdownValues({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownValues({
        days: days.toString().padStart(2, "0"),
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [type, endDatetime]);

  const barTypeOptions = [
    { label: "Promotional", value: "promotional" },
    { label: "Announcement", value: "announcement" },
    { label: "Countdown Timer", value: "countdown" },
  ];
  const fontSizeOptions = [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }];
  const ctaStyleOptions = [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Link", value: "link" }];

  // Get minimum datetime (now + 1 minute)
  const minDatetime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Required";
    if (!text.trim()) newErrors.text = "Required";
    if (type !== "countdown" && ctaText && !ctaLink) newErrors.ctaLink = "Required with button";
    if (type === "countdown") {
      if (!endDatetime) {
        newErrors.endDatetime = "End date and time is required";
      } else {
        const endDate = new Date(endDatetime);
        if (isNaN(endDate.getTime())) {
          newErrors.endDatetime = "Invalid date format";
        } else if (endDate.getTime() <= Date.now()) {
          newErrors.endDatetime = "End date must be in the future";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, text, ctaText, ctaLink, type, endDatetime]);

  const handleSave = useCallback(() => {
    if (!validateForm()) { shopify.toast.show("Please fix the errors", { isError: true }); return; }
    setIsSaving(true);
    const formData = new FormData();
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
    submit(formData, { method: "post" });
  }, [validateForm, submit, shopify, name, type, text, ctaText, ctaLink, ctaStyle, position, bgColor, textColor, fontSize, enabled, dismissible, endDatetime, expiredText, hideWhenExpired]);

  const handleTypeChange = useCallback((newType: string) => {
    setType(newType as BarType);
    // Clear type-specific errors when switching
    setErrors((prev) => {
      const { endDatetime: _, ctaLink: __, ...rest } = prev;
      return rest;
    });
    // Set default text hints based on type
    if (newType === "countdown" && !text) {
      setText("Sale ends in:");
    } else if (newType !== "countdown" && text === "Sale ends in:") {
      setText("");
    }
  }, [text]);

  const fontPx = fontSize === "small" ? "12px" : fontSize === "large" ? "18px" : "14px";

  // Format the selected datetime for display
  const formattedEndDate = useMemo(() => {
    if (!endDatetime) return null;
    const date = new Date(endDatetime);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [endDatetime]);

  return (
    <Page backAction={{ content: "Dashboard", onAction: () => navigate("/app") }} title="Create Announcement Bar">
      <TitleBar title="Create Announcement Bar">
        <button variant="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
      </TitleBar>
      <BlockStack gap="500">
        {actionData && !actionData.success && <Banner tone="critical"><p>{actionData.error}</p></Banner>}
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

                    {/* CTA Fields (non-countdown only) */}
                    {type !== "countdown" && (
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
                                // Clear error when user starts typing
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
                            {formattedEndDate
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
                      <Box>
                        <Text as="span" variant="bodyMd">Background Color</Text>
                        <Box paddingBlockStart="200">
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              style={{ width: 40, height: 40, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}
                            />
                            <TextField label="BG" labelHidden value={bgColor} onChange={setBgColor} autoComplete="off" />
                          </InlineStack>
                        </Box>
                      </Box>
                      <Box>
                        <Text as="span" variant="bodyMd">Text Color</Text>
                        <Box paddingBlockStart="200">
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              style={{ width: 40, height: 40, border: "1px solid #ccc", borderRadius: 4, cursor: "pointer" }}
                            />
                            <TextField label="Text" labelHidden value={textColor} onChange={setTextColor} autoComplete="off" />
                          </InlineStack>
                        </Box>
                      </Box>
                    </FormLayout.Group>
                    <Select
                      label="Font Size"
                      options={fontSizeOptions}
                      value={fontSize}
                      onChange={(v) => setFontSize(v as FontSize)}
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
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>

          {/* Preview Sidebar */}
          <Layout.Section variant="oneThird">
            <Box position="sticky" insetBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Live Preview</Text>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <Box padding="300" borderRadius="100" background="bg-fill-info">
                      <div
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                          padding: "12px 16px",
                          borderRadius: "4px",
                          fontSize: fontPx,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                          position: "relative",
                        }}
                      >
                        <span style={{ fontWeight: 500, textAlign: "center" }}>{text || "Your message here"}</span>

                        {/* Countdown Preview */}
                        {type === "countdown" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontVariantNumeric: "tabular-nums" }}>
                            {[
                              { value: countdownValues.days, label: "D" },
                              { value: countdownValues.hours, label: "H" },
                              { value: countdownValues.minutes, label: "M" },
                              { value: countdownValues.seconds, label: "S" },
                            ].map((unit, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                                <span
                                  style={{
                                    backgroundColor: "rgba(0,0,0,0.2)",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 700,
                                    minWidth: "32px",
                                    textAlign: "center",
                                    fontSize: "calc(" + fontPx + " + 2px)",
                                  }}
                                >
                                  {unit.value}
                                </span>
                                {i < 3 && (
                                  <span style={{ marginLeft: "4px", marginRight: "4px", fontWeight: 700, opacity: 0.7 }}>:</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CTA Preview */}
                        {type !== "countdown" && ctaText && (
                          <span
                            style={{
                              backgroundColor: ctaStyle === "primary" ? textColor : "transparent",
                              color: ctaStyle === "primary" ? bgColor : textColor,
                              padding: ctaStyle === "link" ? 0 : "6px 12px",
                              borderRadius: 4,
                              border: ctaStyle === "secondary" ? "1px solid currentColor" : "none",
                              textDecoration: ctaStyle === "link" ? "underline" : "none",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {ctaText}
                          </span>
                        )}

                        {/* Dismiss Preview */}
                        {dismissible && (
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", opacity: 0.7, cursor: "pointer" }}>
                            ✕
                          </span>
                        )}
                      </div>
                    </Box>
                  </Box>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued">Position: {position === "top" ? "Top of page" : "Bottom of page"}</Text>
                    {type === "countdown" && endDatetime && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Ends: {formattedEndDate}
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>

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
                          backgroundColor: enabled ? "#008060" : "#8c9196",
                        }}
                      />
                      <Text as="span" variant="bodyMd">{enabled ? "Will be active" : "Draft (not visible)"}</Text>
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
                        The countdown timer will update in real-time on your store. When it reaches zero,
                        {hideWhenExpired ? " the bar will automatically hide." : ` it will show: "${expiredText}"`}
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>
              )}
            </Box>
          </Layout.Section>
        </Layout>

        <Divider />
        <InlineStack align="end" gap="300">
          <Button onClick={() => navigate("/app")}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>Create bar</Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
