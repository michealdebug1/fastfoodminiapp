import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Database, OrderStatus } from "@food-platform/shared";
import { OrderQuickActions } from "@/components/orders/order-quick-actions";
import { OrderLifecycleStepper } from "@/components/orders/order-lifecycle-stepper";
import { RealtimeStatus } from "@/components/orders/realtime-orders";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminArea } from "@/lib/auth/access";
import { formatDateTime, formatNumber, formatUzs } from "@/lib/format";
import { resolveLocale } from "@/i18n/config";
import {
  ORDER_PAGE_SIZE,
  escapeLikePattern,
  localizedOrderText,
  parseOrderStatus,
} from "@/lib/management/orders";
import { createClient } from "@/lib/supabase/server";

type PaymentState = "paid" | "pending" | "failed" | "none";

type OrderRow = {
  id: string;
  number: string;
  customer: string;
  createdAt: string;
  placedAt: string;
  status: OrderStatus;
  total: string;
  fulfillment: "pickup";
  itemCount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
    extras: { id: string; label: string }[];
  }[];
  paymentState: PaymentState;
  paymentMethod: Database["public"]["Enums"]["payment_method"];
};

type OrderQueue =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

const orderQueues: OrderQueue[] = [
  "all",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const paymentTones = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  none: "neutral",
} as const;

export async function generateMetadata() {
  const t = await getTranslations("OrderList");
  return { title: t("title") };
}

function parseOrderQueue(value?: string): OrderQueue | undefined {
  return orderQueues.includes(value as OrderQueue)
    ? (value as OrderQueue)
    : undefined;
}

function paginationHref(
  page: number,
  status?: string,
  queue?: OrderQueue,
  query?: string,
) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  else if (queue && queue !== "all") params.set("queue", queue);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/orders?${search}` : "/orders";
}

function OrderItemsSummary({
  items,
  emptyLabel,
  locale,
}: {
  items: OrderRow["items"];
  emptyLabel: string;
  locale: ReturnType<typeof resolveLocale>;
}) {
  if (items.length === 0) {
    return <span className="text-xs text-admin-muted">{emptyLabel}</span>;
  }
  return (
    <ul className="min-w-[220px] space-y-1.5 text-[11px] leading-4">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex justify-between gap-2">
            <span className="font-medium text-slate-700">
              {item.quantity} × {item.name}
            </span>
            <span className="whitespace-nowrap text-admin-muted">
              {formatUzs(item.lineTotal, locale)}
            </span>
          </div>
          {item.extras.length > 0 ? (
            <ul className="mt-0.5 space-y-0.5 pl-3 text-admin-muted">
              {item.extras.map((extra) => (
                <li key={extra.id}>+ {extra.label}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    queue?: string;
  }>;
}) {
  const params = await searchParams;
  const pageNumber = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(pageNumber) && pageNumber > 0
      ? Math.min(pageNumber, 10_000)
      : 1;
  const status = parseOrderStatus(params.status);
  const queue = status
    ? undefined
    : (parseOrderQueue(params.queue) ?? "pending");
  const query = (params.q ?? "").trim().slice(0, 80);

  const t = await getTranslations("OrderList");
  const tPayment = await getTranslations("PaymentStatus");
  const tProvider = await getTranslations("PaymentProvider");
  const tDetail = await getTranslations("OrderDetail");
  const tStatus = await getTranslations("OrderStatus");
  const locale = resolveLocale(await getLocale());

  const supabase = await createClient();
  const staff = await requireAdminArea("orders", supabase);
  let matchingOrderIds: string[] | null = null;
  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    const [numberMatches, nameMatches, phoneMatches] = await Promise.all([
      supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", staff.restaurantId)
        .eq("fulfillment_type", "pickup")
        .ilike("public_number", pattern),
      supabase
        .from("orders")
        .select("id, addresses:addresses!inner(recipient_name)")
        .eq("restaurant_id", staff.restaurantId)
        .eq("fulfillment_type", "pickup")
        .ilike("addresses.recipient_name", pattern),
      supabase
        .from("orders")
        .select("id, addresses:addresses!inner(phone)")
        .eq("restaurant_id", staff.restaurantId)
        .eq("fulfillment_type", "pickup")
        .ilike("addresses.phone", pattern),
    ]);
    const searchError =
      numberMatches.error ?? nameMatches.error ?? phoneMatches.error;
    if (searchError) {
      throw new Error("Unable to search restaurant orders", {
        cause: searchError,
      });
    }
    matchingOrderIds = [
      ...new Set([
        ...(numberMatches.data ?? []).map(({ id }) => id),
        ...(nameMatches.data ?? []).map(({ id }) => id),
        ...(phoneMatches.data ?? []).map(({ id }) => id),
      ]),
    ];
  }

  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, public_number, status, created_at, total, payment_method, fulfillment_type, addresses:addresses!orders_address_id_fkey(recipient_name), order_items(quantity), payments(status, provider)",
      { count: "exact" },
    )
    .eq("restaurant_id", staff.restaurantId)
    .eq("fulfillment_type", "pickup")
    .order("created_at", { ascending: false });

  if (status) ordersQuery = ordersQuery.eq("status", status);
  else if (queue === "pending") ordersQuery = ordersQuery.eq("status", "pending");
  else if (queue === "confirmed") {
    ordersQuery = ordersQuery.eq("status", "confirmed");
  } else if (queue === "preparing") {
    ordersQuery = ordersQuery.eq("status", "preparing");
  } else if (queue === "ready") {
    ordersQuery = ordersQuery.eq("status", "ready_for_pickup");
  } else if (queue === "completed") {
    ordersQuery = ordersQuery.eq("status", "completed");
  } else if (queue === "cancelled") {
    ordersQuery = ordersQuery.eq("status", "cancelled");
  }
  if (matchingOrderIds !== null && matchingOrderIds.length > 0) {
    ordersQuery = ordersQuery.in("id", matchingOrderIds);
  }

  const orderResult =
    matchingOrderIds !== null && matchingOrderIds.length === 0
      ? null
      : await ordersQuery.range(
          (page - 1) * ORDER_PAGE_SIZE,
          page * ORDER_PAGE_SIZE - 1,
        );
  if (orderResult?.error) {
    throw new Error("Unable to load restaurant orders", {
      cause: orderResult.error,
    });
  }
  const data = orderResult?.data ?? [];
  const count = orderResult?.count ?? 0;

  const orderIds = data.map(({ id }) => id);
  const itemResult = orderIds.length
    ? await supabase
        .from("order_items")
        .select(
          "id, order_id, product_name, quantity, line_total, created_at, order_item_options(id, option_name, value_name)",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : null;
  if (itemResult?.error) {
    throw new Error("Unable to load order item summaries", {
      cause: itemResult.error,
    });
  }
  const orderItemsById = new Map<string, NonNullable<typeof itemResult>["data"]>();
  for (const item of itemResult?.data ?? []) {
    const current = orderItemsById.get(item.order_id) ?? [];
    orderItemsById.set(item.order_id, [...current, item]);
  }

  const summaries = await Promise.all([
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
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "completed"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup")
      .eq("status", "cancelled"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", staff.restaurantId)
      .eq("fulfillment_type", "pickup"),
  ]);
  const summaryError = summaries.find((summary) => summary.error)?.error;
  if (summaryError) {
    throw new Error("Unable to load order status totals", {
      cause: summaryError,
    });
  }

  function paymentLabel(state: PaymentState) {
    switch (state) {
      case "paid":
        return t("paymentPaid");
      case "pending":
        return t("paymentPending");
      case "failed":
        return t("paymentFailed");
      default:
        return t("paymentNone");
    }
  }

  const rows: OrderRow[] = (data ?? []).map((order) => {
    const payments = order.payments ?? [];
    const paymentState: PaymentState = payments.some(
      (payment) => payment.status === "verified",
    )
      ? "paid"
      : payments.some(
            (payment) =>
              payment.status === "pending" || payment.status === "processing",
          )
        ? "pending"
        : payments.some(
              (payment) =>
                payment.status === "failed" ||
                payment.status === "cancelled",
            )
          ? "failed"
          : "none";

    return {
      id: order.id,
      number: order.public_number ?? order.id.slice(0, 8).toUpperCase(),
      customer:
        order.addresses?.recipient_name?.trim() || t("guest"),
      createdAt: order.created_at,
      placedAt: formatDateTime(order.created_at, locale),
      status: order.status,
      total: String(order.total),
      fulfillment: "pickup",
      itemCount: (order.order_items ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      items: (orderItemsById.get(order.id) ?? []).map((item) => ({
        id: item.id,
        name: localizedOrderText(
          item.product_name,
          locale,
          tDetail("productUnavailable"),
        ),
        quantity: item.quantity,
        lineTotal: item.line_total,
        extras: (item.order_item_options ?? []).map((option) => ({
          id: option.id,
          label: `${localizedOrderText(
            option.option_name,
            locale,
            tDetail("productUnavailable"),
          )}: ${localizedOrderText(
            option.value_name,
            locale,
            tDetail("productUnavailable"),
          )}`,
        })),
      })),
      paymentState,
      paymentMethod: order.payment_method,
    };
  });

  const columns: TableColumn<OrderRow>[] = [
    {
      key: "number",
      header: t("order"),
      render: (row) => (
        <Link
          className="font-semibold text-admin-orange hover:underline"
          href={`/orders/${row.id}`}
        >
          #{row.number}
        </Link>
      ),
    },
    {
      key: "customer",
      header: t("customer"),
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.customer}</p>
          <p className="mt-0.5 text-[11px] text-admin-muted">
            {t("itemCount", { count: row.itemCount })} · {t("pickup")}
          </p>
        </div>
      ),
    },
    {
      key: "placed",
      header: t("placed"),
      render: (row) => (
        <div className="whitespace-nowrap">
          <p>{row.placedAt}</p>
          <p className="mt-1 text-[10px] text-admin-muted">
            {t("waitingFor", {
              duration: getWaitingDuration(row.createdAt),
            })}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      header: t("items"),
      className: "min-w-[240px]",
      render: (row) => (
        <OrderItemsSummary
          emptyLabel={t("itemsUnavailable")}
          items={row.items}
          locale={locale}
        />
      ),
    },
    {
      key: "status",
      header: t("status"),
      render: (row) => (
        <div className="min-w-28 space-y-2">
          <StatusBadge status={row.status} />
          {row.status !== "cancelled" ? (
            <OrderLifecycleStepper status={row.status} />
          ) : (
            <p className="text-[10px] font-semibold text-admin-red">
              {tStatus("cancelled")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "total",
      header: t("total"),
      render: (row) => (
        <div>
          <p className="whitespace-nowrap font-semibold">
            {formatUzs(row.total, locale)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-admin-muted">
            <Badge tone={paymentTones[row.paymentState]}>
              {paymentLabel(row.paymentState)}
            </Badge>
            <span>{tProvider(row.paymentMethod)}</span>
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end">
          <OrderQuickActions
            fulfillment={row.fulfillment}
            orderId={row.id}
            status={row.status}
          />
        </div>
      ),
    },
  ];

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / ORDER_PAGE_SIZE));
  const summaryCounts = summaries.map((summary) => summary.count ?? 0);
  const tabLabels: Record<OrderQueue, string> = {
    all: t("allOrders"),
    pending: t("incoming"),
    confirmed: t("confirmed"),
    preparing: t("preparing"),
    ready: t("readyForPickup"),
    completed: t("completed"),
    cancelled: tStatus("cancelled"),
  };
  const tabCounts: Record<OrderQueue, number> = {
    all: summaryCounts[6] ?? 0,
    pending: summaryCounts[0] ?? 0,
    confirmed: summaryCounts[1] ?? 0,
    preparing: summaryCounts[2] ?? 0,
    ready: summaryCounts[3] ?? 0,
    completed: summaryCounts[4] ?? 0,
    cancelled: summaryCounts[5] ?? 0,
  };
  const filterStatuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "completed",
    "cancelled",
  ];
  const isFiltered = Boolean(
    query || status || (queue && queue !== "all" && queue !== "pending"),
  );
  const now = Date.now();
  function getWaitingDuration(createdAt: string) {
    const minutes = Math.floor(
      Math.max(0, now - new Date(createdAt).getTime()) / 60_000,
    );
    if (minutes === 0) return t("justNow");
    if (minutes < 60) return t("elapsedMinutes", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) return t("elapsedDays", { count: Math.floor(hours / 24) });
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0
      ? t("elapsedHoursOnly", { hours })
      : t("elapsedHours", { hours, minutes: remainingMinutes });
  }

  return (
    <>
      <PageHeading
        action={
          <div className="flex items-center gap-2">
            <RealtimeStatus />
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-admin-line bg-white px-3 text-xs font-semibold shadow-sm hover:bg-slate-50"
              href="/orders?status=pending"
            >
              <ClipboardList aria-hidden="true" size={15} />
              {t("incomingQueue")}
            </Link>
          </div>
        }
        description={t("description")}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />
      <div className="mb-4 flex justify-end gap-2 lg:hidden">
        <RealtimeStatus />
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-admin-line bg-white px-3 text-xs font-semibold shadow-sm hover:bg-slate-50"
          href="/orders?status=pending"
        >
          <ClipboardList aria-hidden="true" size={15} />
          {t("incomingQueue")}
        </Link>
      </div>
      <section
        aria-label={t("statusOverview")}
        className="mb-4 overflow-x-auto"
      >
        <nav aria-label={t("tabsLabel")} className="flex min-w-max gap-2">
          {orderQueues.map((tab) => (
            <Link
              aria-current={
                (!status && queue === tab) ||
                (status === "pending" && tab === "pending")
                  ? "page"
                  : undefined
              }
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                (!status && queue === tab) ||
                (status === "pending" && tab === "pending")
                  ? "border-admin-orange bg-admin-orange-soft text-admin-orange"
                  : "border-admin-line bg-white text-slate-600 hover:bg-slate-50"
              }`}
              href={paginationHref(1, undefined, tab, query)}
              key={tab}
            >
              {tabLabels[tab]}
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">
                {formatNumber(tabCounts[tab], locale)}
              </span>
            </Link>
          ))}
        </nav>
      </section>
      <Card className="overflow-hidden">
        <form className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-end lg:justify-between">
          {queue && (
            <input name="queue" type="hidden" value={queue} />
          )}
          <div>
            <h2 className="text-sm font-semibold">{t("restaurantOrders")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("matchingOrders", { count: count ?? 0 })}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_180px_auto]">
            <label className="relative">
              <span className="sr-only">{t("searchLabel")}</span>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <Input
                className="pl-9"
                defaultValue={query}
                name="q"
                placeholder={t("searchPlaceholder")}
              />
            </label>
            <label>
              <span className="sr-only">{t("statusFilterLabel")}</span>
              <select
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm focus:border-admin-orange focus:outline-none"
                defaultValue={status ?? ""}
                name="status"
              >
                <option value="">{t("allStatuses")}</option>
                {filterStatuses.map((option) => (
                  <option key={option} value={option}>
                    {tStatus(option)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">{t("search")}</Button>
          </div>
        </form>
        <div className="hidden lg:block">
          <DataTable
            columns={columns}
            emptyDescription={
              isFiltered
                ? t("emptyFilteredDescription")
                : t("emptyDescription")
            }
            emptyTitle={
              isFiltered
                ? t("emptyFilteredTitle")
                : t("emptyTitle")
            }
            getRowKey={(row) => row.id}
            getRowClassName={(row) =>
              row.status === "pending" ? "bg-amber-50/60 hover:bg-amber-50" : ""
            }
            rows={rows}
          />
        </div>
        {rows.length === 0 ? (
          <div className="lg:hidden">
            <EmptyState
              description={
                isFiltered
                  ? t("emptyFilteredDescription")
                  : t("emptyDescription")
              }
              title={
                isFiltered
                  ? t("emptyFilteredTitle")
                  : t("emptyTitle")
              }
            />
          </div>
        ) : (
          <ul aria-label={t("mobileListLabel")} className="divide-y lg:hidden">
            {rows.map((row) => {
              const duration = getWaitingDuration(row.createdAt);
              return (
                <li
                  className={`space-y-3 p-4 ${
                    row.status === "pending" ? "bg-amber-50/60" : ""
                  }`}
                  key={row.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        aria-label={`${t("viewOrder")} #${row.number}`}
                        className="font-semibold text-admin-orange hover:underline"
                        href={`/orders/${row.id}`}
                      >
                        #{row.number}
                      </Link>
                      <p className="mt-1 truncate text-sm font-medium">
                        {row.customer}
                      </p>
                      <p className="mt-0.5 text-[11px] text-admin-muted">
                        {t("itemCount", { count: row.itemCount })} · {t("pickup")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {formatUzs(row.total, locale)}
                      </p>
                      <p className="mt-1 text-[10px] text-admin-muted">
                        {row.placedAt}
                      </p>
                    </div>
                  </div>
                  <OrderItemsSummary
                    emptyLabel={t("itemsUnavailable")}
                    items={row.items}
                    locale={locale}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge status={row.status} />
                    <span
                      aria-label={t("waitingFor", { duration })}
                      className="text-[11px] font-medium text-admin-muted"
                    >
                      {t("waitingFor", { duration })}
                    </span>
                  </div>
                  {row.status !== "cancelled" ? (
                    <OrderLifecycleStepper status={row.status} />
                  ) : (
                    <p className="text-xs font-semibold text-admin-red">
                      {tStatus("cancelled")}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[10px] text-admin-muted">
                    <Badge tone={paymentTones[row.paymentState]}>
                      {paymentLabel(row.paymentState)}
                    </Badge>
                    <span>{tProvider(row.paymentMethod)}</span>
                  </p>
                  <div className="flex justify-end border-t pt-3">
                    <OrderQuickActions
                      fulfillment={row.fulfillment}
                      orderId={row.id}
                      status={row.status}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-admin-muted">
            {t("page", { page: formatNumber(page, locale), total: formatNumber(pageCount, locale) })}
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <span
                aria-disabled="true"
                className="inline-flex h-8 items-center rounded-lg border px-3 font-medium text-slate-400"
              >
                {t("previous")}
              </span>
            ) : (
              <Link
                className="inline-flex h-8 items-center rounded-lg border bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                href={paginationHref(page - 1, status, queue, query)}
              >
                {t("previous")}
              </Link>
            )}
            {page >= pageCount ? (
              <span
                aria-disabled="true"
                className="inline-flex h-8 items-center rounded-lg border px-3 font-medium text-slate-400"
              >
                {t("next")}
              </span>
            ) : (
              <Link
                className="inline-flex h-8 items-center rounded-lg border bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                href={paginationHref(page + 1, status, queue, query)}
              >
                {t("next")}
              </Link>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
