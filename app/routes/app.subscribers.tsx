import type { LoaderFunctionArgs } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  EmptyState,
  Banner,
  DataTable,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { ExportIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Subscribers() {
  const navigate = useNavigate();

  // Placeholder data - will be replaced with data from database
  const subscribers: any[] = [];
  const isPremium = false;

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    // Will generate and download a CSV file of all subscribers
  };

  if (!isPremium) {
    return (
      <Page
        backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
        title="Email Subscribers"
      >
        <TitleBar title="Email Subscribers" />
        <Layout>
          <Layout.Section>
            <Banner tone="warning">
              <p>
                Email subscriber collection is a premium feature. Upgrade your
                plan to collect and manage email subscribers from your
                announcement bars.
              </p>
            </Banner>
            <Box paddingBlockStart="500">
              <Card>
                <EmptyState
                  heading="Collect email subscribers"
                  action={{
                    content: "Upgrade to Premium",
                    url: "/app/settings", // TODO: Link to pricing/upgrade page
                  }}
                  secondaryAction={{
                    content: "Learn more",
                    url: "https://announceflow.com/features", // TODO: Update with actual URL
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Add email signup forms to your announcement bars and grow
                    your subscriber list. Export subscribers to your favorite
                    email marketing platform.
                  </p>
                </EmptyState>
              </Card>
            </Box>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Premium Features
                </Text>
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Badge tone="success">Included</Badge>
                    <Text as="span" variant="bodyMd">
                      Email signup bars
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Badge tone="success">Included</Badge>
                    <Text as="span" variant="bodyMd">
                      Subscriber management
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Badge tone="success">Included</Badge>
                    <Text as="span" variant="bodyMd">
                      CSV export
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Badge tone="success">Included</Badge>
                    <Text as="span" variant="bodyMd">
                      Email integrations
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Email Subscribers"
      primaryAction={{
        content: "Export",
        icon: ExportIcon,
        onAction: handleExport,
      }}
    >
      <TitleBar title="Email Subscribers">
        <button onClick={handleExport}>Export</button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {subscribers.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No subscribers yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    When visitors sign up through your email signup bars, their
                    information will appear here.
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      All Subscribers
                    </Text>
                    <Badge tone="info">{subscribers.length} total</Badge>
                  </InlineStack>
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Email", "Source Bar", "Date"]}
                    rows={subscribers.map((sub) => [
                      sub.email,
                      sub.barName,
                      sub.createdAt,
                    ])}
                  />
                </BlockStack>
              </Card>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Subscriber Stats
                </Text>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      Total Subscribers
                    </Text>
                    <Text as="span" variant="bodyMd">
                      {subscribers.length}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      This Week
                    </Text>
                    <Text as="span" variant="bodyMd">
                      0
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      This Month
                    </Text>
                    <Text as="span" variant="bodyMd">
                      0
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
