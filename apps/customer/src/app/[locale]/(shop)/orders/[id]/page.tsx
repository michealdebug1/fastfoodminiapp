import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Banknote, CheckCircle2, MapPin } from "lucide-react";
import type { Json, OrderStatus } from "@food-platform/shared";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusRefresh } from "@/features/orders/components/order-status-refresh";

type OrderMessageKey =
  | "statusPending"
  | "statusConfirmed"
  | "statusPreparing"
  | "statusReady"
  | "statusReadyForPickup"
  | "statusOutForDelivery"
  | "statusDelivered"
  | "statusCompleted"
  | "statusCancelled";

const orderStatusKeys: Record<OrderStatus, OrderMessageKey> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  preparing: "statusPreparing",
  ready: "statusReady",
  ready_for_pickup: "statusReadyForPickup",
  out_for_delivery: "statusOutForDelivery",
  delivered: "statusDelivered",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

function localizedText(value: Json, locale: Locale): string {
  if (typeof value === "string") return value;
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  const localized = value[locale];
  if (typeof localized === "string") return localized;
  const fallback = value.uz ?? value.ru;
  return typeof fallback === "string" ? fallback : "";
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [routeParams, t, format, supabase] = await Promise.all([
    params,
    getTranslations("Order"),
    getFormatter(),
    createClient(),
  ]);
  if (routeParams.locale !== "uz" && routeParams.locale !== "ru") notFound();
  const { id } = routeParams;
  const locale: Locale = routeParams.locale;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error("Unable to verify the customer session", { cause: userError });
  if (!user) redirect("/");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, public_number, customer_id, restaurant_id, status, subtotal, total, currency, payment_method, fulfillment_type, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (orderError) {
    throw new Error("Unable to load the customer order", { cause: orderError });
  }
  if (!order || order.customer_id !== user.id) notFound();

  const [
    { data: items, error: itemsError },
    { data: payments, error: paymentsError },
    { data: history, error: historyError },
    { data: restaurant, error: restaurantError },
  ] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_name, quantity, unit_price, line_total")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("id, status, provider, amount, created_at, verified_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_status_history")
      .select("id, new_status, created_at, note")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("restaurants")
      .select("address, phone")
      .eq("id", order.restaurant_id)
      .maybeSingle(),
  ]);
  if (itemsError) throw new Error("Unable to load the order items", { cause: itemsError });
  if (paymentsError) throw new Error("Unable to load payment status", { cause: paymentsError });
  if (historyError) throw new Error("Unable to load order history", { cause: historyError });
  if (restaurantError) throw new Error("Unable to load pickup information", { cause: restaurantError });

  const itemIds = (items ?? []).map(({ id: itemId }) => itemId);
  const { data: options, error: optionsError } = itemIds.length
    ? await supabase
        .from("order_item_options")
        .select("id, order_item_id, option_name, value_name, price_delta")
        .in("order_item_id", itemIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (optionsError) {
    throw new Error("Unable to load selected product extras", { cause: optionsError });
  }

  const optionsByItem = new Map<string, NonNullable<typeof options>>();
  for (const option of options ?? []) {
    const current = optionsByItem.get(option.order_item_id) ?? [];
    optionsByItem.set(option.order_item_id, [...current, option]);
  }

  const orderNumber = order.public_number ?? order.id.slice(0, 8).toUpperCase();
  const payment = payments?.[0];
  const paymentStatusKey =
    payment?.status === "verified"
      ? "paymentPaid"
      : payment?.status === "pending"
        ? "paymentUnpaid"
        : "paymentOther";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-36 pt-5 sm:px-6 sm:pt-8 motion-safe:animate-[page-enter_250ms_ease-out_both]">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-ink-600 transition-colors hover:bg-cream-200 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("backToMenu")}
      </Link>

      <section className="rounded-3xl border border-basil-200 bg-basil-50 p-5 shadow-soft sm:p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-basil-100 text-basil-600">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-black text-ink-900 sm:text-3xl">
          {t("submitted")}
        </h1>
        {order.status === "pending" ? (
          <p className="mt-2 text-sm leading-6 text-ink-600">
            {t("pendingDescription")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-ink-600">
          {t("orderNumber")}: <strong className="text-ink-900">#{orderNumber}</strong>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-ink-700">
            <Banknote className="size-4" aria-hidden="true" />
            {t("paymentAtRestaurant")}
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-ink-700">
            {t("pickup")}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-black text-ink-900">
            {t("status")}
          </h2>
          <OrderStatusRefresh
            label={t("refreshStatus")}
            refreshingLabel={t("refreshingStatus")}
          />
        </div>
        <p className="mt-2 inline-flex rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-extrabold text-ink-900">
          {t(orderStatusKeys[order.status])}
        </p>
        <p className="mt-3 text-xs text-ink-500">
          {t("createdAt")}:{" "}
          {format.dateTime(new Date(order.created_at), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        {history && history.length > 0 ? (
          <ol className="mt-4 space-y-3 border-l-2 border-line pl-4">
            {history.map((entry) => (
              <li className="relative text-xs" key={entry.id}>
                <span className="absolute -left-[1.34rem] top-1 size-2 rounded-full bg-tomato-500" />
                <p className="font-bold text-ink-800">
                  {t(orderStatusKeys[entry.new_status])}
                </p>
                <time className="mt-0.5 block text-ink-400">
                  {format.dateTime(new Date(entry.created_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <h2 className="font-display text-lg font-black text-ink-900">
          {t("items")}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {(items ?? []).map((item) => (
            <li className="py-3 first:pt-0" key={item.id}>
              <div className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold text-ink-900">
                    {localizedText(item.product_name, locale)}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {item.quantity} × {format.number(item.unit_price, { style: "currency", currency: order.currency })}
                  </p>
                </div>
                <span className="whitespace-nowrap font-bold text-ink-900">
                  {format.number(item.line_total, { style: "currency", currency: order.currency })}
                </span>
              </div>
              {(optionsByItem.get(item.id) ?? []).length > 0 ? (
                <ul className="mt-2 space-y-1 pl-3 text-xs text-ink-500">
                  {(optionsByItem.get(item.id) ?? []).map((option) => (
                    <li key={option.id}>
                      {localizedText(option.option_name, locale)}:{" "}
                      {localizedText(option.value_name, locale)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-lg font-black text-ink-900">
          <span>{t("total")}</span>
          <span>{format.number(order.total, { style: "currency", currency: order.currency })}</span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <h2 className="font-display text-base font-black text-ink-900">
            {t("paymentAtRestaurant")}
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            {payment ? t(paymentStatusKey) : t("paymentNotAvailable")}
          </p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-black text-ink-900">
            <MapPin className="size-4 text-tomato-500" aria-hidden="true" />
            {t("pickupAddress")}
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            {restaurant?.address || t("notAvailable")}
          </p>
          {restaurant?.phone ? (
            <a
              className="mt-2 inline-block text-sm font-bold text-tomato-600 hover:underline"
              href={`tel:${restaurant.phone}`}
            >
              {restaurant.phone}
            </a>
          ) : null}
        </article>
      </section>
    </div>
  );
}
