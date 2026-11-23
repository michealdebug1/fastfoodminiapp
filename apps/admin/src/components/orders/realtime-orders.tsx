"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getNewPickupOrder } from "@/lib/realtime/order-events";

type RealtimeState = "connecting" | "live" | "polling";
type NewOrderNotice = { count: number; number: string };

const RealtimeContext = createContext<RealtimeState>("connecting");

const POLL_INTERVAL_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 350;

export function useRealtimeState() {
  return useContext(RealtimeContext);
}

/**
 * Keeps the admin order screens current. A Realtime subscription to
 * `public.orders` (scoped to this restaurant) triggers a debounced server
 * refresh; a 30-second polling loop and visibility refresh act as fallbacks
 * when Realtime is unavailable. The database publication is added separately
 * by an approved migration.
 */
export function RealtimeOrdersProvider({
  children,
  restaurantId,
}: {
  children: ReactNode;
  restaurantId: string;
}) {
  const router = useRouter();
  const t = useTranslations("Realtime");
  const [state, setState] = useState<RealtimeState>("connecting");
  const [notice, setNotice] = useState<NewOrderNotice | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const notifiedOrderIds = useRef(new Set<string>());

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let pollTimer: number | null = null;
    let connectionTimer: number | null = null;

    function stopPolling() {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function startPolling() {
      if (!active) return;
      setState("polling");
      if (pollTimer !== null) return;
      pollTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, POLL_INTERVAL_MS);
    }

    function scheduleRefresh() {
      if (!active) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

    function handleOrderChange(payload: {
      eventType: string;
      new: Record<string, unknown>;
    }) {
      if (!active) return;
      scheduleRefresh();

      const newOrder = getNewPickupOrder(payload);
      if (!newOrder || notifiedOrderIds.current.has(newOrder.id)) return;
      if (notifiedOrderIds.current.size >= 100) {
        notifiedOrderIds.current.clear();
      }
      notifiedOrderIds.current.add(newOrder.id);
      setNotice((current) => ({
        count: (current?.count ?? 0) + 1,
        number: newOrder.number ?? newOrder.id.slice(0, 8).toUpperCase(),
      }));
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current);
      }
      noticeTimer.current = window.setTimeout(() => {
        setNotice(null);
        noticeTimer.current = null;
      }, 8_000);
    }

    const channel = supabase
      .channel(`restaurant-orders:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        handleOrderChange,
      )
      .subscribe((status) => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          if (connectionTimer !== null) {
            window.clearTimeout(connectionTimer);
            connectionTimer = null;
          }
          stopPolling();
          setState("live");
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          if (connectionTimer !== null) {
            window.clearTimeout(connectionTimer);
            connectionTimer = null;
          }
          startPolling();
        }
      });

    connectionTimer = window.setTimeout(startPolling, 10_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") router.refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (connectionTimer !== null) window.clearTimeout(connectionTimer);
      stopPolling();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current);
        noticeTimer.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  return (
    <RealtimeContext.Provider value={state}>
      {children}
      {notice ? (
        <aside
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-admin-orange/30 bg-white p-4 shadow-xl"
          role="status"
        >
          <div className="flex items-start gap-3">
            <BellRing
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-admin-orange"
              size={18}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-admin-ink">
                {t("newOrderTitle")}
              </p>
              <p className="mt-1 text-xs text-admin-muted">
                {notice.count === 1
                  ? t("oneNewOrder", { number: notice.number })
                  : t("multipleNewOrders", { count: notice.count })}
              </p>
              <Link
                className="mt-3 inline-flex text-xs font-semibold text-admin-orange hover:underline"
                href="/orders?queue=pending"
                onClick={() => setNotice(null)}
              >
                {t("viewIncomingOrders")}
              </Link>
            </div>
            <button
              aria-label={t("dismissNewOrder")}
              className="rounded-md p-1 text-admin-muted hover:bg-slate-100 hover:text-admin-ink"
              onClick={() => setNotice(null)}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </div>
        </aside>
      ) : null}
    </RealtimeContext.Provider>
  );
}

export function RealtimeStatus({ className = "" }: { className?: string }) {
  const state = useRealtimeState();
  const t = useTranslations("Realtime");

  const tone =
    state === "live"
      ? "border-admin-green/20 bg-admin-green-soft text-admin-green"
      : state === "polling"
        ? "border-admin-amber/20 bg-admin-amber-soft text-admin-amber"
        : "border-admin-line bg-white text-admin-muted";

  return (
    <span
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold ${tone} ${className}`}
      title={t(`${state}Description`)}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          state === "live"
            ? "animate-pulse bg-admin-green motion-reduce:animate-none"
            : state === "polling"
              ? "bg-admin-amber"
              : "bg-slate-400"
        }`}
      />
      {t(state)}
    </span>
  );
}
