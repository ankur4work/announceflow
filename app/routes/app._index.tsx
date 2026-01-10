import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams, useRevalidator } from "@remix-run/react";
import { useEffect, useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  EmptyState,
  InlineStack,
  Badge,
  Box,
  IndexTable,
  Banner,
  Modal,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { PlusIcon, DeleteIcon, EditIcon, ClockIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import { getBarsConfig } from "../lib/metafields.server";
import type { Bar } from "../lib/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const config = await getBarsConfig(admin);
    return json({
      bars: config.bars,
      globalSettings: config.global_settings,
    });
  } catch (error) {
    console.error("Error loading bars:", error);
    return json({ bars: [], globalSettings: {} });
  }
};

export default function Dashboard() {
  const { bars, globalSettings } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();

  const [togglingBars, setTogglingBars] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [barToDelete, setBarToDelete] = useState<Bar | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track loading state during revalidation
  const isLoading = revalidator.state === "loading";

  // Show toast messages based on URL params
  useEffect(() => {
    const created = searchParams.get("created");
    const updated = searchParams.get("updated");
    const deleted = searchParams.get("deleted");
    const error = searchParams.get("error");

    if (created === "true") {
      shopify.toast.show("Announcement bar created successfully");
    } else if (updated === "true") {
      shopify.toast.show("Announcement bar updated successfully");
    } else if (deleted === "true") {
      shopify.toast.show("Announcement bar deleted");
    } else if (error === "not_found") {
      shopify.toast.show("Bar not found", { isError: true });
    }

    // Clear search params after showing toast
    if (created || updated || deleted || error) {
      window.history.replaceState({}, "", "/app");
    }
  }, [searchParams, shopify]);

  // Calculate stats
  const validBars = bars.filter((bar): bar is NonNullable<typeof bar> => bar !== null);
  const activeBars = validBars.filter((bar) => bar.enabled).length;
  const totalViews = validBars.reduce((sum, bar) => sum + (bar.analytics?.views || 0), 0);
  const totalClicks = validBars.reduce((sum, bar) => sum + (bar.analytics?.clicks || 0), 0);
  const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

  // Handle toggle bar enabled
  const handleToggle = useCallback(async (bar: Bar) => {
    setTogglingBars((prev) => new Set(prev).add(bar.id));

    try {
      const response = await fetch(`/api/bars/${bar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !bar.enabled }),
      });

      const result = await response.json();

      if (result.success) {
        shopify.toast.show(result.message || (bar.enabled ? "Bar disabled" : "Bar enabled"));
        revalidator.revalidate();
      } else {
        shopify.toast.show(result.error || "Failed to update bar", { isError: true });
      }
    } catch (error) {
      shopify.toast.show("Failed to update bar", { isError: true });
    } finally {
      setTogglingBars((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bar.id);
        return newSet;
      });
    }
  }, [shopify, revalidator]);

  // Handle delete
  const handleDeleteClick = useCallback((bar: Bar) => {
    setBarToDelete(bar);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!barToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bars/${barToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        shopify.toast.show("Bar deleted successfully");
        revalidator.revalidate();
      } else {
        shopify.toast.show(result.error || "Failed to delete bar", { isError: true });
      }
    } catch (error) {
      shopify.toast.show("Failed to delete bar", { isError: true });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setBarToDelete(null);
    }
  }, [barToDelete, shopify, revalidator]);

  // Get bar type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "countdown":
        return <Badge tone="attention">Countdown</Badge>;
      case "promotional":
        return <Badge tone="success">Promotional</Badge>;
      case "announcement":
        return <Badge tone="info">Announcement</Badge>;
      case "email_signup":
        return <Badge>Email Signup</Badge>;
      case "free_shipping":
        return <Badge tone="success">Free Shipping</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Check if countdown is expired
  const isCountdownExpired = (bar: Bar) => {
    if (bar.type !== "countdown" || !bar.content.end_datetime) return false;
    return new Date(bar.content.end_datetime).getTime() <= Date.now();
  };

  // Get status badge
  const getStatusBadge = (bar: Bar) => {
    if (bar.type === "countdown" && isCountdownExpired(bar)) {
      return <Badge tone="warning">Expired</Badge>;
    }
    return bar.enabled ? (
      <Badge tone="success">Active</Badge>
    ) : (
      <Badge tone="new">Draft</Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const resourceName = {
    singular: "bar",
    plural: "bars",
  };

  const rowMarkup = validBars.map((bar, index) => (
    <IndexTable.Row id={bar.id} key={bar.id} position={index}>
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center">
          <Box
            background="bg-surface-secondary"
            borderRadius="200"
            padding="200"
            minWidth="40px"
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: bar.style.bg_color,
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </Box>
          <BlockStack gap="050">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {bar.name}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {bar.content.text.length > 40
                ? bar.content.text.substring(0, 40) + "..."
                : bar.content.text}
            </Text>
          </BlockStack>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>{getTypeBadge(bar.type)}</IndexTable.Cell>
      <IndexTable.Cell>{getStatusBadge(bar)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {formatDate(bar.updated_at)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          {/* Toggle Button */}
          <Button
            size="slim"
            onClick={() => handleToggle(bar)}
            loading={togglingBars.has(bar.id)}
            disabled={bar.type === "countdown" && isCountdownExpired(bar) && !bar.enabled}
            tone={bar.enabled ? undefined : "success"}
          >
            {bar.enabled ? "Disable" : "Enable"}
          </Button>
          {/* Edit Button */}
          <Button
            size="slim"
            icon={EditIcon}
            onClick={() => navigate(`/app/bars/${bar.id}`)}
            accessibilityLabel={`Edit ${bar.name}`}
          />
          {/* Delete Button */}
          <Button
            size="slim"
            icon={DeleteIcon}
            tone="critical"
            onClick={() => handleDeleteClick(bar)}
            accessibilityLabel={`Delete ${bar.name}`}
          />
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="AnnounceFlow">
        <button variant="primary" onClick={() => navigate("/app/bars/new")}>
          Create announcement bar
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {bars.length === 0 && !isLoading ? (
              <Card>
                <EmptyState
                  heading="Create your first announcement bar"
                  action={{
                    content: "Create announcement bar",
                    onAction: () => navigate("/app/bars/new"),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Announcement bars help you communicate important messages to
                    your customers. Create sales alerts, countdown timers, or
                    promotional messages.
                  </p>
                </EmptyState>
              </Card>
            ) : bars.length === 0 && isLoading ? (
              <Card>
                <BlockStack gap="400">
                  <SkeletonDisplayText size="small" />
                  <SkeletonBodyText lines={3} />
                </BlockStack>
              </Card>
            ) : (
              <Card padding="0">
                <BlockStack>
                  <Box padding="400" paddingBlockEnd="0">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Your Announcement Bars ({bars.length})
                      </Text>
                      <Button
                        icon={PlusIcon}
                        onClick={() => navigate("/app/bars/new")}
                      >
                        Create bar
                      </Button>
                    </InlineStack>
                  </Box>
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={bars.length}
                    headings={[
                      { title: "Name" },
                      { title: "Type" },
                      { title: "Status" },
                      { title: "Last Updated" },
                      { title: "Actions" },
                    ]}
                    selectable={false}
                  >
                    {rowMarkup}
                  </IndexTable>
                </BlockStack>
              </Card>
            )}

            {/* Info Banner */}
            {bars.length > 0 && activeBars > 0 && (
              <Box paddingBlockStart="400">
                <Banner tone="info">
                  <p>
                    <strong>{activeBars} bar{activeBars !== 1 ? "s" : ""}</strong> currently active on your storefront.
                    Make sure you've added the AnnounceFlow block to your theme.
                  </p>
                </Banner>
              </Box>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Quick Stats */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Quick Stats
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Bars
                      </Text>
                      <Badge>{bars.length.toString()}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Active Bars
                      </Text>
                      <Badge tone="success">{activeBars.toString()}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Views
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {totalViews.toLocaleString()}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Click Rate
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {clickRate}%
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Quick Create
                  </Text>
                  <BlockStack gap="200">
                    <Button
                      fullWidth
                      onClick={() => navigate("/app/bars/new")}
                      textAlign="start"
                    >
                      Promotional Bar
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => navigate("/app/bars/new?type=countdown")}
                      textAlign="start"
                      icon={ClockIcon}
                    >
                      Countdown Timer
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Getting Started */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Setup Guide
                  </Text>
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={bars.length > 0 ? "success" : undefined}>1</Badge>
                      <Text as="span" variant="bodyMd" tone={bars.length > 0 ? "success" : undefined}>
                        Create an announcement bar
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={activeBars > 0 ? "success" : undefined}>2</Badge>
                      <Text as="span" variant="bodyMd" tone={activeBars > 0 ? "success" : undefined}>
                        Enable the bar
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge>3</Badge>
                      <Text as="span" variant="bodyMd">
                        Add block to your theme
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge>4</Badge>
                      <Text as="span" variant="bodyMd">
                        Publish and view on store
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setBarToDelete(null);
        }}
        title="Delete announcement bar?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
          loading: isDeleting,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setDeleteModalOpen(false);
              setBarToDelete(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete "{barToDelete?.name}"? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
