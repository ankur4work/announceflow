import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Box,
  Divider,
  Button,
  Icon,
  Collapsible,
  Badge,
  Link,
  Banner,
  CalloutCard,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  MegaphoneIcon,
  ClockIcon,
  DeliveryIcon,
  EmailIcon,
  LockIcon,
  QuestionCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: typeof MegaphoneIcon;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="300" blockAlign="center">
            {icon && <Icon source={icon} tone="base" />}
            <Text as="h3" variant="headingMd">
              {title}
            </Text>
            {badge && <Badge tone="info">{badge}</Badge>}
          </InlineStack>
          <Icon source={open ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
        </InlineStack>
      </div>
      <Collapsible open={open} id={`section-${title.replace(/\s/g, "-")}`}>
        <Box paddingBlockStart="400">
          <Divider />
          <Box paddingBlockStart="400">{children}</Box>
        </Box>
      </Collapsible>
    </Card>
  );
}

// FAQ Item Component
function FAQItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      paddingBlock="300"
      borderBlockEndWidth="025"
      borderColor="border-subdued"
    >
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={QuestionCircleIcon} tone="base" />
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {question}
            </Text>
          </InlineStack>
          <Icon source={open ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
        </InlineStack>
      </div>
      <Collapsible open={open} id={`faq-${question.replace(/\s/g, "-")}`}>
        <Box paddingBlockStart="300" paddingInlineStart="600">
          <Text as="p" variant="bodyMd" tone="subdued">
            {children}
          </Text>
        </Box>
      </Collapsible>
    </Box>
  );
}

// Step Item Component
function StepItem({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <InlineStack gap="400" blockAlign="start" wrap={false}>
      <Box
        background="bg-fill-info"
        borderRadius="full"
        minWidth="32px"
        padding="100"
      >
        <Text as="span" variant="bodySm" fontWeight="bold" alignment="center">
          <div style={{ textAlign: "center", width: "24px" }}>{number}</div>
        </Text>
      </Box>
      <BlockStack gap="100">
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {title}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          {description}
        </Text>
      </BlockStack>
    </InlineStack>
  );
}

export default function Help() {
  const navigate = useNavigate();

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Help & Getting Started"
    >
      <TitleBar title="Help & Getting Started" />

      <BlockStack gap="600">
        {/* Getting Started Section */}
        <CalloutCard
          title="Getting Started with AnnounceFlow"
          illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          primaryAction={{
            content: "Create Your First Bar",
            onAction: () => navigate("/app/bars/new"),
          }}
        >
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Follow these simple steps to create your first announcement bar:
            </Text>
            <BlockStack gap="300">
              <StepItem
                number={1}
                title="Create your first bar"
                description="Click 'Create Bar' and choose a bar type that fits your needs."
              />
              <StepItem
                number={2}
                title="Customize colors and content"
                description="Add your message, choose colors, and configure settings."
              />
              <StepItem
                number={3}
                title="Enable the bar"
                description="Toggle the bar to 'Enabled' to make it live."
              />
              <StepItem
                number={4}
                title="Add to your theme"
                description="Go to Online Store > Themes > Customize and add the AnnounceFlow block."
              />
            </BlockStack>
          </BlockStack>
        </CalloutCard>

        {/* Bar Types Guide */}
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">
            Bar Types Guide
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Learn about each bar type and how to use them effectively.
          </Text>

          {/* Promotional Announcement */}
          <CollapsibleSection
            title="Promotional Announcement"
            icon={MegaphoneIcon}
            defaultOpen
          >
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  What it's for
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Display sales, discounts, store updates, or any important
                  announcements to your visitors. This is the most versatile bar
                  type.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Best practices
                </Text>
                <List type="bullet">
                  <List.Item>Keep your message short and clear (under 100 characters)</List.Item>
                  <List.Item>Use contrasting colors for better visibility</List.Item>
                  <List.Item>Include a call-to-action button for promotions</List.Item>
                  <List.Item>Use emojis sparingly to draw attention</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Example use cases
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  "Free shipping on orders over $50!" • "New arrivals just
                  dropped!" • "Use code SAVE20 for 20% off"
                </Text>
              </BlockStack>
            </BlockStack>
          </CollapsibleSection>

          {/* Countdown Timer */}
          <CollapsibleSection title="Countdown Timer" icon={ClockIcon}>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  What it's for
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Create urgency for flash sales, limited-time offers, or event
                  deadlines. The countdown updates in real-time on your store.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Setting the end date
                </Text>
                <List type="bullet">
                  <List.Item>Select a future date and time for your countdown</List.Item>
                  <List.Item>The timer shows days, hours, minutes, and seconds</List.Item>
                  <List.Item>Time is based on the visitor's local timezone</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  What happens when it expires
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  You can choose to either hide the bar completely or show an
                  "expired" message (e.g., "This offer has ended"). Configure
                  this in the bar settings.
                </Text>
              </BlockStack>
            </BlockStack>
          </CollapsibleSection>

          {/* Free Shipping Progress */}
          <CollapsibleSection title="Free Shipping Progress" icon={DeliveryIcon}>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  How it works with cart
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  The bar automatically reads the customer's cart total and shows
                  how much more they need to spend for free shipping. Updates in
                  real-time as items are added or removed.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Setting threshold
                </Text>
                <List type="bullet">
                  <List.Item>Enter your free shipping minimum (e.g., $50)</List.Item>
                  <List.Item>Select your store's currency</List.Item>
                  <List.Item>The bar calculates the remaining amount automatically</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Message templates
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Use {"{remaining}"} in your message to show the remaining
                  amount. Example: "Spend {"{remaining}"} more for FREE shipping!"
                  becomes "Spend $25.00 more for FREE shipping!"
                </Text>
              </BlockStack>
            </BlockStack>
          </CollapsibleSection>

          {/* Email Capture */}
          <CollapsibleSection
            title="Email Capture"
            icon={EmailIcon}
            badge="Premium"
          >
            <BlockStack gap="400">
              <Banner tone="info">
                <p>Email capture is a Premium feature. Upgrade to collect email subscribers.</p>
              </Banner>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  What it collects
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Captures visitor email addresses directly from your announcement
                  bar. Perfect for building your newsletter list or offering
                  discount codes in exchange for signups.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Where emails are stored
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  All collected emails are stored securely in AnnounceFlow. You
                  can view them in the Subscribers page, including which bar
                  captured each subscriber and when they signed up.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  How to export
                </Text>
                <List type="bullet">
                  <List.Item>Go to the Subscribers page</List.Item>
                  <List.Item>Click "Export CSV" to download all subscribers</List.Item>
                  <List.Item>Import the CSV into your email marketing platform</List.Item>
                </List>
              </BlockStack>
            </BlockStack>
          </CollapsibleSection>

          {/* Cookie Consent */}
          <CollapsibleSection title="Cookie Consent" icon={LockIcon}>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  GDPR compliance
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Display a cookie consent banner to comply with GDPR and other
                  privacy regulations. Visitors can accept or decline cookies
                  before browsing your store.
                </Text>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Accept/Decline behavior
                </Text>
                <List type="bullet">
                  <List.Item>Accept: Saves consent and hides the bar</List.Item>
                  <List.Item>Decline: Saves preference, may limit tracking</List.Item>
                  <List.Item>You can hide the Decline button if preferred</List.Item>
                  <List.Item>Consent is remembered for future visits</List.Item>
                </List>
              </BlockStack>

              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Privacy policy link
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Always include a link to your privacy policy. This is required
                  for GDPR compliance. Enter the URL to your privacy policy page
                  (e.g., /pages/privacy-policy).
                </Text>
              </BlockStack>
            </BlockStack>
          </CollapsibleSection>
        </BlockStack>

        {/* FAQ Section */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Frequently Asked Questions
            </Text>
            <Divider />

            <FAQItem question="How do I enable my bar on the storefront?">
              After creating a bar, you need to add the AnnounceFlow block to your
              theme. Go to Online Store &gt; Themes &gt; Customize. In the theme
              editor, click "Add section" and search for "AnnounceFlow" or
              "Announcement Bar". Add the block to your theme's header or footer
              area. Make sure your bar is enabled in the AnnounceFlow dashboard.
            </FAQItem>

            <FAQItem question="Why isn't my bar showing?">
              Check these common issues: (1) Make sure the bar is enabled in the
              dashboard (toggle should be on). (2) Verify the AnnounceFlow block
              is added to your theme. (3) Clear your browser cache and try
              incognito mode. (4) For countdown bars, check if it has expired. (5)
              For cookie consent bars, you may have already accepted/declined.
            </FAQItem>

            <FAQItem question="How do I change colors?">
              When creating or editing a bar, scroll to the "Style" section. You
              can customize: Background color, Text color, Button colors (for
              email capture and cookie consent), Progress bar colors (for free
              shipping). Use the color picker or enter a hex code directly.
            </FAQItem>

            <FAQItem question="What's the difference between Free and Premium?">
              Free plan: 1 announcement bar, includes "Powered by AnnounceFlow"
              branding. Premium plan ($99/month): Unlimited
              bars, email capture functionality, no branding, priority support.
              You can upgrade anytime from the Settings page.
            </FAQItem>

            <FAQItem question="How do I export my email subscribers?">
              Go to the Subscribers page from the navigation menu. Click the
              "Export CSV" button at the top of the page. A CSV file will download
              containing all subscriber emails, signup dates, and source bar
              information. You can import this into Mailchimp, Klaviyo, or any
              email marketing platform.
            </FAQItem>

            <FAQItem question="Can I have multiple bars active at once?">
              Yes! With Premium, you can have multiple bars active simultaneously.
              Each bar can be positioned at the top or bottom of the page. Note
              that having too many bars may affect user experience - we recommend
              1-2 active bars at a time.
            </FAQItem>

            <FAQItem question="How do I delete a bar?">
              Go to the Dashboard and find the bar you want to delete. Click the
              delete icon (trash can) on the right side of the bar row, or click
              on the bar to edit it and use the "Delete" button in the Danger Zone
              section. Deleted bars cannot be recovered.
            </FAQItem>
          </BlockStack>
        </Card>

        {/* Support Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">
                Need More Help?
              </Text>
              <Badge tone="success">24hr Response</Badge>
            </InlineStack>
            <Divider />

            <BlockStack gap="300">
              <Text as="p" variant="bodyMd">
                Our support team is here to help you get the most out of
                AnnounceFlow. We typically respond within 24 hours.
              </Text>

              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    Email:
                  </Text>
                  <Link url="mailto:devteam@sabaiinovations.com" removeUnderline>
                    devteam@sabaiinovations.com
                  </Link>
                </InlineStack>

                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    Response time:
                  </Text>
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Within 24 hours
                  </Text>
                </InlineStack>
              </BlockStack>

              <Box paddingBlockStart="200">
                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    url="mailto:devteam@sabaiinovations.com?subject=AnnounceFlow Support Request"
                    external
                  >
                    Contact Support
                  </Button>
                  <Button
                    url="https://github.com/anthropics/announceflow/issues"
                    external
                  >
                    Report an Issue
                  </Button>
                </InlineStack>
              </Box>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Quick Links */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Quick Links
            </Text>
            <Divider />
            <InlineStack gap="400" wrap>
              <Button onClick={() => navigate("/app/bars/new")}>
                Create New Bar
              </Button>
              <Button onClick={() => navigate("/app/subscribers")}>
                View Subscribers
              </Button>
              <Button onClick={() => navigate("/app/settings")}>
                Settings
              </Button>
              <Button onClick={() => navigate("/app")}>
                Dashboard
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
