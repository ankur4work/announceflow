import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "@remix-run/react";
import { useState, useCallback } from "react";
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
  Pagination,
  Modal,
  Spinner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { ExportIcon, DeleteIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import {
  getShopByDomain,
  getSubscribersByShop,
  getSubscriberStats,
  getSubscriberCount,
} from "../lib/db.server";

interface Subscriber {
  id: string;
  email: string;
  bar_id: string;
  subscribed_at: string;
  ip_address: string | null;
}

interface LoaderData {
  isPremium: boolean;
  subscribers: Subscriber[];
  total: number;
  stats: {
    total: number;
    this_week: number;
    this_month: number;
  };
  limit: number;
  offset: number;
  has_more: boolean;
}

const ITEMS_PER_PAGE = 25;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  console.log("[Subscribers] Loading for shop:", shopDomain);

  // Get shop from database, create if doesn't exist
  let shop = await getShopByDomain(shopDomain);

  if (!shop) {
    console.log("[Subscribers] Shop not found, creating:", shopDomain);
    // Import createShop or use prisma directly
    const { createShop } = await import("../lib/db.server");
    try {
      shop = await createShop(shopDomain, session.accessToken || "");
      console.log("[Subscribers] Shop created:", shop.id);
    } catch (e) {
      console.error("[Subscribers] Failed to create shop:", e);
      return json<LoaderData>({
        isPremium: false,
        subscribers: [],
        total: 0,
        stats: { total: 0, this_week: 0, this_month: 0 },
        limit: ITEMS_PER_PAGE,
        offset: 0,
        has_more: false,
      });
    }
  }

  const isPremium = shop.plan === "PREMIUM";

  // Parse pagination from URL
  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  // Fetch data
  const [subscribers, total, stats] = await Promise.all([
    getSubscribersByShop(shop.id, ITEMS_PER_PAGE, offset),
    getSubscriberCount(shop.id),
    getSubscriberStats(shop.id),
  ]);

  // Format subscribers
  const formattedSubscribers: Subscriber[] = subscribers.map((sub) => ({
    id: sub.id,
    email: sub.email,
    bar_id: sub.barId,
    subscribed_at: sub.createdAt.toISOString(),
    ip_address: sub.ipAddress,
  }));

  return json<LoaderData>({
    isPremium,
    subscribers: formattedSubscribers,
    total,
    stats: {
      total: stats.total,
      this_week: stats.thisWeek,
      this_month: stats.thisMonth,
    },
    limit: ITEMS_PER_PAGE,
    offset,
    has_more: offset + subscribers.length < total,
  });
};

export default function Subscribers() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const data = useLoaderData<typeof loader>();
  const { isPremium, subscribers, total, stats, offset, has_more } = data;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subscriberToDelete, setSubscriberToDelete] = useState<Subscriber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Fetch the CSV export
      const response = await fetch("/api/subscribers/export");

      if (!response.ok) {
        // Handle error responses
        if (response.status === 402) {
          console.error("CSV export requires premium plan");
          // Could show a toast/banner here
          return;
        }
        const error = await response.json().catch(() => ({ error: "Export failed" }));
        console.error("Export error:", error);
        return;
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting subscribers:", error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeleteClick = useCallback((subscriber: Subscriber) => {
    setSubscriberToDelete(subscriber);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!subscriberToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/subscribers/${subscriberToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteModalOpen(false);
        setSubscriberToDelete(null);
        revalidator.revalidate();
      } else {
        console.error("Failed to delete subscriber");
      }
    } catch (error) {
      console.error("Error deleting subscriber:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [subscriberToDelete, revalidator]);

  const handlePagination = useCallback(
    (direction: "previous" | "next") => {
      const newOffset =
        direction === "next"
          ? offset + ITEMS_PER_PAGE
          : Math.max(0, offset - ITEMS_PER_PAGE);
      navigate(`/app/subscribers?offset=${newOffset}`);
    },
    [navigate, offset]
  );

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Non-premium view
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
                    url: "/app/settings",
                  }}
                  secondaryAction={{
                    content: "Learn more",
                    url: "https://announceflow.com/features",
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

  // Premium view with actual data
  return (
    <Page
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
      title="Email Subscribers"
      primaryAction={{
        content: isExporting ? "Exporting..." : "Export CSV",
        icon: ExportIcon,
        onAction: handleExport,
        disabled: isExporting || subscribers.length === 0,
      }}
    >
      <TitleBar title="Email Subscribers">
        <button onClick={handleExport} disabled={isExporting || subscribers.length === 0}>
          Export
        </button>
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
                    <Badge tone="info">{`${total} total`}</Badge>
                  </InlineStack>
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text"]}
                    headings={["Email", "Source Bar", "Date", "Actions"]}
                    rows={subscribers.map((sub) => [
                      sub.email,
                      sub.bar_id,
                      formatDate(sub.subscribed_at),
                      <Button
                        key={sub.id}
                        icon={DeleteIcon}
                        variant="plain"
                        tone="critical"
                        onClick={() => handleDeleteClick(sub)}
                        accessibilityLabel={`Delete ${sub.email}`}
                      />,
                    ])}
                  />
                  {total > ITEMS_PER_PAGE && (
                    <Box paddingBlockStart="400">
                      <InlineStack align="center">
                        <Pagination
                          hasPrevious={offset > 0}
                          hasNext={has_more}
                          onPrevious={() => handlePagination("previous")}
                          onNext={() => handlePagination("next")}
                        />
                      </InlineStack>
                    </Box>
                  )}
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
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {stats.total}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      This Week
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {stats.this_week}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      This Month
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {stats.this_month}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSubscriberToDelete(null);
        }}
        title="Delete subscriber?"
        primaryAction={{
          content: isDeleting ? "Deleting..." : "Delete",
          destructive: true,
          onAction: handleDeleteConfirm,
          disabled: isDeleting,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setDeleteModalOpen(false);
              setSubscriberToDelete(null);
            },
          },
        ]}
      >
        <Modal.Section>
          {isDeleting ? (
            <InlineStack align="center">
              <Spinner size="small" />
              <Text as="span">Deleting subscriber...</Text>
            </InlineStack>
          ) : (
            <Text as="p">
              Are you sure you want to delete{" "}
              <strong>{subscriberToDelete?.email}</strong>? This action cannot be
              undone.
            </Text>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
