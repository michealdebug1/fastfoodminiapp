"use client";

import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, MapPin, ShoppingBag, Trash2, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Product, RestaurantInfo } from "@/features/menu/types";
import { formatUzs } from "@/lib/format-uzs";
import { createClient } from "@/lib/supabase/client";
import {
  clearIdempotencyKey,
  getIdempotencyKey,
} from "../lib/idempotency-key";
import { getCartLineKey } from "../cart-reducer";
import { useCart } from "../use-cart";
import { CartLineItem } from "./cart-line-item";

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  products: readonly Product[];
  restaurant: RestaurantInfo;
}

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function CartSheet({
  open,
  onClose,
  products,
  restaurant,
}: CartSheetProps) {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackCheckoutKeys = useRef(new Map<string, string>());
  const warnedStorageFailure = useRef(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<{
    fingerprint: string;
    message: string;
  } | null>(null);
  const {
    lines,
    itemCount,
    subtotalUzs,
    isHydrated,
    setQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const detailedLines = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = productById.get(line.productId);
        return product ? [{ line, product }] : [];
      }),
    [lines, productById],
  );
  const fingerprint = useMemo(
    () =>
      JSON.stringify(
        lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          optionValueIds: [...line.optionValueIds].sort(),
        })),
      ),
    [lines],
  );
  const price = (amount: number) => formatUzs(amount, locale);
  const belowMinimum =
    restaurant.minimumOrderAmount > 0 &&
    subtotalUzs < restaurant.minimumOrderAmount;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const visibleCheckoutError =
    checkoutError?.fingerprint === fingerprint ? checkoutError.message : null;

  function setCurrentCheckoutError(message: string | null) {
    setCheckoutError(message ? { fingerprint, message } : null);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  async function handleCheckout() {
    if (checkoutPending) return;
    setCurrentCheckoutError(null);

    if (!isHydrated || lines.length === 0 || detailedLines.length !== lines.length) {
      setCurrentCheckoutError(t("cartChanged"));
      return;
    }
    if (!restaurant.pickupEnabled) {
      setCurrentCheckoutError(t("pickupUnavailable"));
      return;
    }
    if (belowMinimum) {
      setCurrentCheckoutError(
        t("minimumNotMet", { amount: price(restaurant.minimumOrderAmount) }),
      );
      return;
    }

    setCheckoutPending(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        const { error: anonymousSignInError } =
          await supabase.auth.signInAnonymously();
        if (anonymousSignInError) {
          console.error("Unable to establish a customer session", anonymousSignInError);
          setCurrentCheckoutError(t("sessionError"));
          return;
        }
      }

      const { key: idempotencyKey, storageAvailable } = getIdempotencyKey(
        fingerprint,
        getBrowserStorage(),
        fallbackCheckoutKeys.current,
        () => window.crypto.randomUUID(),
      );
      if (!storageAvailable && !warnedStorageFailure.current) {
        warnedStorageFailure.current = true;
        console.warn(
          "Checkout retry protection is limited to this page because browser storage is unavailable.",
        );
      }
      const { data, error } = await supabase.rpc("place_pickup_order", {
        p_idempotency_key: idempotencyKey,
        p_items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          optionValueIds: [...line.optionValueIds],
        })),
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (
          message.includes("unavailable") ||
          message.includes("extra") ||
          message.includes("quantity")
        ) {
          setCurrentCheckoutError(t("menuChanged"));
          return;
        }
        if (message.includes("minimum")) {
          setCurrentCheckoutError(
            t("minimumNotMet", {
              amount: price(restaurant.minimumOrderAmount),
            }),
          );
          return;
        }
        if (message.includes("pickup")) {
          setCurrentCheckoutError(t("pickupUnavailable"));
          return;
        }
        if (message.includes("already being processed")) {
          setCurrentCheckoutError(t("processingDuplicate"));
          return;
        }
        throw error;
      }

      const order = data?.[0];
      if (!order?.order_id) {
        throw new Error("Order creation returned no order record.");
      }

      if (
        !clearIdempotencyKey(
          fingerprint,
          getBrowserStorage(),
          fallbackCheckoutKeys.current,
        ) &&
        !warnedStorageFailure.current
      ) {
        warnedStorageFailure.current = true;
        console.warn(
          "The completed checkout retry key could not be cleared from browser storage.",
        );
      }
      clearCart();
      onClose();
      router.push(`/orders/${order.order_id}?confirmed=1`);
    } catch (error) {
      console.error("Pickup checkout failed", error);
      setCurrentCheckoutError(t("checkoutError"));
    } finally {
      setCheckoutPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="cart-dialog"
      aria-labelledby="cart-sheet-title"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-float sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2
              id="cart-sheet-title"
              className="font-display text-xl font-black text-ink-900"
            >
              {t("title")}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-ink-400">
              {t("count", { count: itemCount })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-600 transition-colors hover:bg-cream-200 hover:text-ink-900"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5">
          {isHydrated && detailedLines.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-cream-200 text-ink-500">
                <ShoppingBag className="size-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-black text-ink-900">
                {t("empty.title")}
              </h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-ink-500">
                {t("empty.description")}
              </p>
              <Button
                className="mt-5"
                onClick={onClose}
                variant="secondary"
                type="button"
              >
                {t("empty.cta")}
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {detailedLines.map(({ line, product }) => {
                const lineKey = getCartLineKey(
                  line.productId,
                  line.optionValueIds,
                );
                return (
                  <CartLineItem
                    key={lineKey}
                    product={product}
                    line={line}
                    disabled={checkoutPending}
                    onIncrease={() =>
                      setQuantity(lineKey, line.quantity + 1)
                    }
                    onDecrease={() =>
                      setQuantity(lineKey, line.quantity - 1)
                    }
                    onRemove={() => removeItem(lineKey)}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {detailedLines.length > 0 ? (
          <div className="safe-bottom border-t border-line bg-surface px-5 pb-4 pt-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink-600">
                {t("subtotal")}
              </span>
              <span className="font-display text-xl font-black text-ink-900">
                {price(subtotalUzs)}
              </span>
            </div>
            {restaurant.address ? (
              <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {restaurant.address}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              {t("paymentAtRestaurant")} · {t("pickup")}
            </p>
            {belowMinimum ? (
              <p className="mt-2 text-center text-xs text-tomato-600" role="status">
                {t("minimumNotMet", {
                  amount: price(restaurant.minimumOrderAmount),
                })}
              </p>
            ) : null}
            {visibleCheckoutError ? (
              <p
                className="mt-2 text-center text-xs text-tomato-600"
                role="alert"
                aria-live="assertive"
              >
                {visibleCheckoutError}
              </p>
            ) : null}
            <Button
              size="lg"
              className="mt-3 w-full"
              disabled={
                checkoutPending ||
                !isHydrated ||
                !restaurant.pickupEnabled ||
                belowMinimum
              }
              onClick={() => void handleCheckout()}
              type="button"
            >
              {checkoutPending ? (
                <>
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {t("submitting")}
                </>
              ) : (
                t("checkout")
              )}
            </Button>
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={clearCart}
                disabled={checkoutPending}
                className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11px] font-bold text-tomato-600 transition-colors hover:bg-tomato-100 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                {t("clear")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
