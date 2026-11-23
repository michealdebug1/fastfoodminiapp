import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Coins,
  Timer,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RealtimeStatus } from "@/components/orders/realtime-orders";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { resolveLocale } from "@/i18n/config";
import { requireAdminArea } from "@/lib/auth/access";
import {
  getDashboardData,
  parseDashboardPeriod,
  type DashboardData,
} from "@/lib/dashboard/data";
import {
  formatNumber,
  formatShortDateTime,
  formatTime,
  formatUzs,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type RecentOrder = DashboardData["recent_orders"][number];

export async function generateMetadata() {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requestedPeriod } = await searchParams;
  const period = parseDashboardPeriod(requestedPeriod);
  const supabase = await createClient();
  const staff = await requireAdminArea("dashboard", supabase);
  const t = await getTranslations("Dashboard");
  const tStatus = await getTranslations("OrderStatus");
  const locale = resolveLocale(await getLocale());
  const dashboard = await getDashboardData(
    supabase,
    staff.restaurantId,
    period,
  );

  const [
    pendingQueueResult,
    confirmedQueue,
    preparingQueue,
    readyQueue,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "confirmed"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "preparing"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "ready_for_pickup"),
  ]);

  const queryError =
    pendingQueueResult.error ??
    confirmedQueue.error ??
    preparingQueue.error ??
    readyQueue.error;
  if (queryError) {
    throw new Error("Unable to load live order queue", {
      cause: queryError,
    });
  }

  const pickupScoped = dashboard.fulfillment_scope === "pickup";
  const completedToday = dashboard.metrics.completed_orders_today;
  const pendingQueue = pendingQueueResult.count ?? 0;

  const metrics = [
    ...(pickupScoped
      ? [
          {
            label: t("ordersToday"),
            value: formatNumber(dashboard.metrics.orders_today, locale),
            detail: t("ordersTodayDetail"),
            icon: ClipboardList,
            iconTone: "bg-slate-50 text-slate-500",
          },
          {
            label: t("grossValue"),
            value: formatUzs(dashboard.metrics.gross_order_value_today, locale),
            detail: t("grossValueDetail"),
            icon: Coins,
            iconTone: "bg-admin-orange-soft text-admin-orange",
          },
          {
            label: t("collectedRevenue"),
            value: formatUzs(dashboard.metrics.collected_revenue_today, locale),
            detail: t("collectedRevenueDetail"),
            icon: WalletCards,
            iconTone: "bg-admin-green-soft text-admin-green",
          },
          {
            label: t("completedToday"),
            value: formatNumber(completedToday, locale),
            detail: t("completedTodayDetail"),
            icon: CheckCircle2,
            iconTone: "bg-admin-green-soft text-admin-green",
          },
        ]
      : []),
    {
      label: t("pendingOrders"),
      value: formatNumber(pendingQueue, locale),
      detail: t("pendingOrdersDetail"),
      icon: Timer,
      iconTone: "bg-admin-amber-soft text-admin-amber",
    },
  ];

  const queue = [
    {
      status: "pending" as const,
      label: t("queuePending"),
      count: pendingQueue,
    },
    {
      status: "confirmed" as const,
      label: t("queueConfirmed"),
      count: confirmedQueue.count ?? 0,
    },
    {
      status: "preparing" as const,
      label: t("queuePreparing"),
      count: preparingQueue.count ?? 0,
    },
    {
      status: "ready_for_pickup" as const,
      label: t("queueReady"),
      count: readyQueue.count ?? 0,
    },
  ];
  const queueTotal = queue.reduce((sum, item) => sum + item.count, 0);
  const updatedAt = formatTime(dashboard.generated_at, locale);
  const maxUnits = Math.max(
    ...dashboard.popular_products.map((product) => product.units_ordered),
    1,
  );
  const recentOrderColumns: TableColumn<RecentOrder>[] = [
    {
      key: "order",
      header: t("order"),
      render: (order) => (
        order.id ? (
          <Link
            aria-label={`${t("viewOrder")} #${order.reference}`}
            className="font-semibold text-admin-orange hover:underline"
            href={`/orders/${order.id}`}
          >
            #{order.reference}
          </Link>
        ) : (
          <span className="font-semibold">#{order.reference}</span>
        )
      ),
    },
    {
      key: "customer",
      header: t("customer"),
      render: (order) => order.customer?.trim() || t("guest"),
    },
    {
      key: "created",
      header: t("created"),
      render: (order) => formatShortDateTime(order.created_at, locale),
    },
    {
      key: "status",
      header: t("status"),
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "value",
      header: t("orderValue"),
      className: "text-right",
      render: (order) => (
        <span className="whitespace-nowrap font-semibold">
          {formatUzs(order.total, locale)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeading
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RealtimeStatus />
            <DashboardControls period={dashboard.period} />
          </div>
        }
        description={t("description")}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <RealtimeStatus />
          <p className="text-xs text-admin-muted">
            {t("updatedAt", { time: updatedAt, timezone: "Asia/Tashkent" })}
          </p>
        </div>
        <DashboardControls period={dashboard.period} />
      </div>
      <div className="mb-5 hidden justify-end lg:flex">
        <p className="mr-auto self-center text-xs text-admin-muted">
          {t("updatedAt", { time: updatedAt, timezone: "Asia/Tashkent" })}
        </p>
      </div>

      {!pickupScoped ? (
        <Card className="mb-4 border-admin-amber/30 bg-admin-amber-soft/40">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-admin-ink">
              {t("pickupAnalyticsUnavailable")}
            </p>
            <p className="mt-1 text-xs text-admin-muted">
              {t("pickupAnalyticsPending")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section
        aria-label={t("metricsLabel")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {metrics.map(({ label, value, detail, icon: Icon, iconTone }) => (
          <Card className="p-4 sm:p-5" key={label}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-admin-muted">{label}</p>
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
              >
                <Icon aria-hidden="true" size={16} />
              </span>
            </div>
            <p className="mt-4 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {value}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-admin-muted">
              {detail}
            </p>
          </Card>
        ))}
      </section>

      <div
        className={`mt-4 grid gap-4 ${
          pickupScoped
            ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]"
            : ""
        }`}
      >
        {pickupScoped ? (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
              <div>
                <h2 className="text-sm font-semibold">{t("salesAnalytics")}</h2>
                <p className="mt-1 text-xs text-admin-muted">
                  {dashboard.period === "daily"
                    ? t("salesDailyDescription")
                    : t("salesWeeklyDescription")}
                </p>
              </div>
              <Badge tone="neutral">UZS</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              <SalesChart period={dashboard.period} sales={dashboard.sales} />
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div>
                <h2 className="text-sm font-semibold">{t("liveQueue")}</h2>
                <p className="mt-1 text-xs text-admin-muted">
                  {t("liveQueueDescription")}
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-admin-orange hover:text-orange-700"
                href="/orders?queue=all"
              >
                {t("viewOrders")}
                <ArrowUpRight aria-hidden="true" size={14} />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {queueTotal === 0 ? (
                <EmptyState
                  description={t("queueClearDescription")}
                  title={t("queueClear")}
                />
              ) : (
                <ul className="divide-y">
                  {queue.map((item) => (
                    <li key={item.status}>
                      <Link
                        className={`flex items-center justify-between gap-3 rounded-lg py-2.5 transition hover:text-admin-orange ${
                          item.status === "pending"
                            ? "-mx-3 bg-amber-50 px-3"
                            : ""
                        }`}
                        href={`/orders?status=${item.status}`}
                      >
                        <span className="flex items-center gap-2 text-xs font-medium">
                          <StatusBadge status={item.status} />
                          <span className="text-admin-muted">{item.label}</span>
                        </span>
                        <span className="text-sm font-semibold">
                          {formatNumber(item.count, locale)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {pickupScoped ? (
            <Card>
              <CardHeader className="pb-3">
                <div>
                  <h2 className="text-sm font-semibold">
                    {t("popularProducts")}
                  </h2>
                  <p className="mt-1 text-xs text-admin-muted">
                    {t("popularProductsDescription")}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {dashboard.popular_products.length === 0 ? (
                  <EmptyState
                    description={t("noProductSalesDescription")}
                    title={t("noProductSales")}
                  />
                ) : (
                  <ol className="divide-y">
                    {dashboard.popular_products.map((product, index) => (
                      <li
                        className="py-3 first:pt-1 last:pb-0"
                        key={`${product.name ?? ""}-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-500">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-xs font-semibold text-admin-ink">
                                {product.name?.trim() || t("nameUnavailable")}
                              </p>
                              <p className="whitespace-nowrap text-xs font-semibold">
                                {formatUzs(
                                  product.revenue_contribution,
                                  locale,
                                )}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div
                                aria-label={t("unitsOrdered", {
                                  count: product.units_ordered,
                                })}
                                className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                                role="img"
                              >
                                <span
                                  className="block h-full rounded-full bg-admin-orange"
                                  style={{
                                    width: `${Math.max(
                                      8,
                                      (product.units_ordered / maxUnits) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="w-16 shrink-0 text-right text-[10px] text-admin-muted">
                                {t("units", { count: product.units_ordered })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {pickupScoped ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-4">
            <div>
              <h2 className="text-sm font-semibold">{t("recentOrders")}</h2>
              <p className="mt-1 text-xs text-admin-muted">
                {t("recentOrdersDescription")}
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-admin-orange hover:text-orange-700"
              href="/orders?queue=all"
            >
              {t("allOrders")} <ArrowUpRight aria-hidden="true" size={14} />
            </Link>
          </CardHeader>
          <DataTable
            columns={recentOrderColumns}
            emptyDescription={t("noOrdersDescription")}
            emptyTitle={t("noOrders")}
            getRowKey={(order) => order.reference}
            rows={dashboard.recent_orders}
          />
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <h2 className="text-sm font-semibold">{t("orderActivity")}</h2>
              <p className="mt-1 text-xs text-admin-muted">
                {t("orderActivityDescription")}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {dashboard.recent_status_changes.length === 0 ? (
              <EmptyState
                description={t("noActivityDescription")}
                title={t("noActivity")}
              />
            ) : (
              <ol className="space-y-4">
                {dashboard.recent_status_changes.map((activity) => (
                  <li
                    className="flex items-start gap-3"
                    key={`${activity.reference}-${activity.created_at}`}
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-admin-orange" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold">
                          #{activity.reference}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {t("changedStatus")}
                        </span>
                        <StatusBadge status={activity.new_status} />
                      </div>
                      <p className="mt-1 text-[11px] text-admin-muted">
                        {activity.previous_status
                          ? tStatus(activity.previous_status)
                          : t("newOrder")}
                        <span aria-hidden="true"> → </span>
                        {tStatus(activity.new_status)}
                        <span className="px-1.5">·</span>
                        {formatShortDateTime(activity.created_at, locale)}
                      </p>
                    </div>
                    {activity.new_status === "completed" ? (
                      <ArrowUpRight
                        aria-hidden="true"
                        className="text-admin-green"
                        size={14}
                      />
                    ) : activity.new_status === "cancelled" ? (
                      <ArrowDownRight
                        aria-hidden="true"
                        className="text-admin-red"
                        size={14}
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        </div>
      ) : null}
    </>
  );
}
