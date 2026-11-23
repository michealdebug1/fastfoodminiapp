import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, WalletCards } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderLifecycleStepper } from "@/components/orders/order-lifecycle-stepper";
import { PaymentAction } from "@/components/orders/payment-action";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminArea } from "@/lib/auth/access";
import { formatDateTime, formatUzs } from "@/lib/format";
import { getOrderDetails } from "@/lib/management/orders";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale, type Locale } from "@/i18n/config";

export async function generateMetadata() {
  const t = await getTranslations("OrderDetail");
  return { title: t("eyebrow") };
}

function localizedText(value: unknown, locale: Locale, fallback: string) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = record[locale];
    if (typeof preferred === "string" && preferred.trim()) return preferred;
    for (const key of ["uz", "ru"] as const) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return fallback;
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const staff = await requireAdminArea("orders", supabase);
  const details = await getOrderDetails(supabase, staff.restaurantId, id);
  if (!details) notFound();

  const t = await getTranslations("OrderDetail");
  const tPayment = await getTranslations("PaymentStatus");
  const tProvider = await getTranslations("PaymentProvider");
  const locale = resolveLocale(await getLocale());

  const { order } = details;
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", order.restaurant_id)
    .maybeSingle();
  if (restaurantError) {
    throw new Error("Unable to load restaurant pickup details", {
      cause: restaurantError,
    });
  }
  const address = order.addresses;
  const reference = order.public_number ?? order.id.slice(0, 8).toUpperCase();
  const customerName = address?.recipient_name?.trim() || t("guest");
  const cancellation = [...details.history]
    .reverse()
    .find((entry) => entry.new_status === "cancelled");
  const fulfillmentLabel =
    order.fulfillment_type === "pickup" ? t("pickup") : t("delivery");

  return (
    <>
      <PageHeading
        action={
          <Link href="/orders">
            <Button>
              <ArrowLeft aria-hidden="true" size={15} />
              {t("backToOrders")}
            </Button>
          </Link>
        }
        description={t("placedAt", {
          date: formatDateTime(order.created_at, locale),
        })}
        eyebrow={t("eyebrow")}
        title={t("title", { reference })}
      />
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-xs text-admin-muted">
            {t("lastUpdated", {
              date: formatDateTime(order.updated_at, locale),
            })}
          </span>
        </div>
        {order.fulfillment_type === "pickup" ? (
          <OrderActions
            fulfillment={order.fulfillment_type}
            orderId={order.id}
            status={order.status}
          />
        ) : (
          <p className="text-xs text-admin-muted">{t("legacyDeliveryReadOnly")}</p>
        )}
      </div>
      {order.fulfillment_type === "pickup" ? (
        <Card className="mb-5">
          <CardContent className="space-y-4 pt-4">
            <OrderLifecycleStepper
              previousStatus={cancellation?.previous_status}
              status={order.status}
            />
            {order.status === "cancelled" ? (
              <div className="border-t pt-3 text-xs">
                <p className="font-semibold text-admin-red">
                  {t("cancelledTitle")}
                </p>
                <p className="mt-1 text-admin-muted">
                  {order.cancelled_at
                    ? t("cancelledAt", {
                        date: formatDateTime(order.cancelled_at, locale),
                      })
                    : t("cancelledDescription")}
                </p>
                {cancellation?.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">
                    {cancellation.note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold">{t("items")}</h2>
                <p className="mt-1 text-xs text-admin-muted">
                  {t("itemsDescription")}
                </p>
              </div>
            </CardHeader>
            <div className="divide-y px-5 pb-2 pt-3">
              {details.items.map((item) => (
                <div className="py-4 first:pt-1" key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {localizedText(
                          item.product_name,
                          locale,
                          t("productUnavailable"),
                        )}
                      </p>
                      <p className="mt-1 text-xs text-admin-muted">
                        {item.quantity} ×{" "}
                        {formatUzs(String(item.unit_price), locale)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold">
                      {formatUzs(String(item.line_total), locale)}
                    </p>
                  </div>
                  {item.options.length > 0 && (
                    <ul className="mt-3 space-y-1 border-l-2 pl-3 text-xs text-admin-muted">
                      {item.options.map((option) => (
                        <li className="flex justify-between gap-3" key={option.id}>
                          <span>
                            {localizedText(
                              option.option_name,
                              locale,
                              t("productUnavailable"),
                            )}
                            :{" "}
                            {localizedText(
                              option.value_name,
                              locale,
                              t("productUnavailable"),
                            )}
                          </span>
                          {option.price_delta > 0 && (
                            <span className="whitespace-nowrap">
                              +{formatUzs(String(option.price_delta), locale)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t bg-slate-50/60 px-5 py-4 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-admin-muted">{t("subtotal")}</span>
                <span>{formatUzs(String(order.subtotal), locale)}</span>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-admin-muted">{t("discount")}</span>
                  <span>−{formatUzs(String(order.discount_total), locale)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-admin-muted">{t("deliveryFee")}</span>
                  <span>{formatUzs(String(order.delivery_fee), locale)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t pt-3 text-sm font-semibold">
                <span>{t("total")}</span>
                <span>{formatUzs(String(order.total), locale)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <h2 className="text-sm font-semibold">{t("statusHistory")}</h2>
                <p className="mt-1 text-xs text-admin-muted">
                  {t("statusHistoryDescription")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {details.history.length === 0 ? (
                <p className="py-5 text-xs text-admin-muted">
                  {t("noHistory")}
                </p>
              ) : (
                <ol className="space-y-4">
                  {details.history.map((entry) => (
                    <li className="flex items-start gap-3" key={entry.id}>
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-admin-orange" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.previous_status ? (
                            <StatusBadge status={entry.previous_status} />
                          ) : (
                            <Badge tone="neutral">{t("created")}</Badge>
                          )}
                          <span aria-hidden="true">→</span>
                          <StatusBadge status={entry.new_status} />
                        </div>
                        <p className="mt-1 text-[11px] text-admin-muted">
                          {entry.changed_by ? t("staffMember") : t("systemOrImport")}{" "}
                          · {formatDateTime(entry.created_at, locale)}
                        </p>
                        {entry.note && (
                          <p className="mt-1 text-xs text-slate-600">
                            {entry.note === "Order created"
                              ? t("orderCreatedNote")
                              : entry.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="text-admin-orange" size={16} />
                <h2 className="text-sm font-semibold">
                  {t("customerAndFulfillment")}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <p className="font-semibold">{customerName}</p>
                {address?.phone && (
                  <a
                    className="mt-1 inline-block text-admin-orange hover:underline"
                    href={`tel:${address.phone}`}
                  >
                    {address.phone}
                  </a>
                )}
              </div>
              {order.fulfillment_type === "delivery" && address && (
                <address className="not-italic leading-5 text-admin-muted">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.district ? `${address.district}, ` : ""}
                  {address.city}
                </address>
              )}
              {order.fulfillment_type === "pickup" && (
                <div className="leading-5 text-admin-muted">
                  <p className="font-medium text-slate-700">{t("pickupAt")}</p>
                  <p className="mt-1">
                    {restaurant?.name ?? t("restaurantNameUnavailable")}
                  </p>
                  <p>{restaurant?.address ?? t("pickupAddressUnavailable")}</p>
                  {restaurant?.phone ? (
                    <a
                      className="mt-1 inline-block text-admin-orange hover:underline"
                      href={`tel:${restaurant.phone}`}
                    >
                      {restaurant.phone}
                    </a>
                  ) : null}
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-admin-muted">{t("fulfillment")}</p>
                <p className="mt-1 font-medium">{fulfillmentLabel}</p>
              </div>
              {order.customer_note && (
                <div className="border-t pt-3">
                  <p className="text-admin-muted">{t("customerNote")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">
                    {order.customer_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <WalletCards
                  aria-hidden="true"
                  className="text-admin-orange"
                  size={16}
                />
                <h2 className="text-sm font-semibold">{t("payments")}</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-3 border-b pb-3 text-xs">
                <span className="text-admin-muted">{t("paymentMethod")}</span>
                <span className="font-medium">
                  {tProvider(order.payment_method)}
                </span>
              </div>
              {details.payments.length === 0 ? (
                <p className="py-2 text-xs text-admin-muted">
                  {t("noPayments")}
                </p>
              ) : (
                details.payments.map((payment) => (
                  <div
                    className="flex items-start justify-between gap-3 text-xs"
                    key={payment.id}
                  >
                    <div>
                      <p className="font-medium">{tProvider(payment.provider)}</p>
                      <p className="mt-1 text-admin-muted">
                        {payment.verified_at
                          ? t("verifiedAt", {
                              date: formatDateTime(payment.verified_at, locale),
                            })
                          : t("updatedAt", {
                              date: formatDateTime(payment.created_at, locale),
                            })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        tone={
                          payment.status === "verified"
                            ? "success"
                            : payment.status === "failed" ||
                                payment.status === "cancelled"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {tPayment(payment.status)}
                      </Badge>
                      <p className="mt-2 whitespace-nowrap font-semibold">
                        {formatUzs(String(payment.amount), locale)}
                      </p>
                      <PaymentAction
                        fulfillment={order.fulfillment_type}
                        orderId={order.id}
                        paymentId={payment.id}
                        provider={payment.provider}
                        status={payment.status}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
