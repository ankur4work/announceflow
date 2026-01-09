import type { LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
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
  Checkbox,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Settings() {
  const navigate = useNavigate();

  // Placeholder settings - will be replaced with data from database
  const [defaultPosition, setDefaultPosition] = useState("top");
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [enableCloseButton, setEnableCloseButton] = useState(true);
  const [cookieDuration, setCookieDuration] = useState("24");

  const positionOptions = [
    { label: "Top of page", value: "top" },
    { label: "Bottom of page", value: "bottom" },
  ];

  const cookieOptions = [
    { label: "1 hour", value: "1" },
    { label: "24 hours", value: "24" },
    { label: "7 days", value: "168" },
    { label: "30 days", value: "720" },
    { label: "Never (always show)", value: "0" },
  ];

  const handleSave = () => {
    // TODO: Implement settings save to metafields
    // Settings will be saved to shop.metafields.announceflow.global_settings
  };

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Settings"
    >
      <TitleBar title="Settings">
        <button variant="primary" onClick={handleSave}>
          Save
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.AnnotatedSection
            id="general"
            title="General Settings"
            description="Configure default behavior for your announcement bars."
          >
            <Card>
              <BlockStack gap="400">
                <Select
                  label="Default Position"
                  options={positionOptions}
                  value={defaultPosition}
                  onChange={setDefaultPosition}
                  helpText="Where announcement bars appear by default"
                />
                <Checkbox
                  label="Enable close button"
                  checked={enableCloseButton}
                  onChange={setEnableCloseButton}
                  helpText="Allow visitors to dismiss announcement bars"
                />
                <Select
                  label="Remember dismissal for"
                  options={cookieOptions}
                  value={cookieDuration}
                  onChange={setCookieDuration}
                  helpText="How long to hide the bar after a visitor closes it"
                />
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            id="analytics"
            title="Analytics"
            description="Configure tracking and reporting options."
          >
            <Card>
              <BlockStack gap="400">
                <Checkbox
                  label="Enable analytics tracking"
                  checked={enableAnalytics}
                  onChange={setEnableAnalytics}
                  helpText="Track views and clicks on your announcement bars"
                />
                <Text as="p" variant="bodyMd" tone="subdued">
                  Analytics data helps you understand how visitors interact with
                  your announcement bars.
                </Text>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            id="branding"
            title="Default Branding"
            description="Set default colors and styles for new announcement bars."
          >
            <Card>
              <BlockStack gap="400">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Default branding options coming soon. You can customize each
                  bar individually in the bar editor.
                </Text>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        <Divider />

        <InlineStack align="end" gap="300">
          <Button variant="primary" onClick={handleSave}>
            Save settings
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
