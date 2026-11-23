"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings2,
  Utensils,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { StaffRole } from "@food-platform/shared";
import { signOutAction } from "@/app/actions/auth";
import {
  canAccessArea,
  getStaffHomePath,
  type AdminArea,
} from "@/lib/auth/permissions";

const navigation: {
  href: string;
  key: "dashboard" | "orders" | "products" | "settings" | "account";
  icon: LucideIcon;
  area: AdminArea;
}[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard, area: "dashboard" },
  { href: "/orders", key: "orders", icon: ClipboardList, area: "orders" },
  { href: "/products", key: "products", icon: Utensils, area: "products" },
  {
    href: "/settings",
    key: "settings",
    icon: Settings2,
    area: "settings",
  },
  { href: "/account", key: "account", icon: UserRound, area: "account" },
];

type SidebarProps = {
  collapsed: boolean;
  email: string | null;
  mobileOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  restaurantName: string;
  role: StaffRole;
};

export function Sidebar({
  collapsed,
  email,
  mobileOpen,
  onClose,
  onToggle,
  restaurantName,
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const tShell = useTranslations("Shell");
  const tCommon = useTranslations("Common");

  return (
    <>
      {mobileOpen && (
        <button
          aria-label={t("close")}
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col border-r bg-white transition-transform duration-200 lg:translate-x-0 ${
          collapsed ? "lg:w-[76px]" : "lg:w-[252px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center justify-between border-b px-4">
          <Link
            aria-label={t("home")}
            className="flex min-w-0 items-center gap-3"
            href={getStaffHomePath(role)}
            onClick={onClose}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-admin-orange text-white shadow-sm">
              <Utensils aria-hidden="true" size={19} strokeWidth={2.2} />
            </span>
            <span className={collapsed ? "lg:hidden" : ""}>
              <span className="block truncate text-sm font-bold tracking-tight">
                {tCommon("brand")}
              </span>
              <span className="mt-0.5 block text-[11px] text-admin-muted">
                {t("restaurantWorkspace")}
              </span>
            </span>
          </Link>
          <button
            aria-label={t("close")}
            className="flex size-8 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-canvas lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav aria-label={t("label")} className="flex-1 space-y-1 px-3 py-5">
          <p
            className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            {t("workspace")}
          </p>
          {navigation
            .filter(({ area }) => canAccessArea(role, area))
            .map(({ href, key, icon: Icon }) => {
              const label = t(key);
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-admin-orange-soft text-admin-orange"
                      : "text-slate-600 hover:bg-slate-50 hover:text-admin-ink"
                  }`}
                  href={href}
                  key={href}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    aria-hidden="true"
                    className={active ? "text-admin-orange" : "text-slate-400"}
                    size={18}
                    strokeWidth={1.9}
                  />
                  <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="border-t p-3">
          <div
            className={`mb-3 rounded-lg bg-slate-50 p-3 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <p className="truncate text-xs font-semibold text-slate-700">
              {restaurantName}
            </p>
            <p className="mt-1 truncate text-[11px] leading-4 text-admin-muted">
              {email}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              aria-label={tShell("signOut")}
              className={`mb-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-admin-red ${
                collapsed ? "lg:justify-center lg:px-0" : ""
              }`}
              onClick={onClose}
              type="submit"
            >
              <LogOut aria-hidden="true" size={16} />
              <span className={collapsed ? "lg:hidden" : ""}>
                {tShell("signOut")}
              </span>
            </button>
          </form>
          <button
            aria-label={collapsed ? t("expand") : t("collapse")}
            className="hidden h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-admin-muted hover:bg-slate-50 hover:text-admin-ink lg:flex"
            onClick={onToggle}
            type="button"
          >
            {collapsed ? (
              <ChevronRight aria-hidden="true" size={16} />
            ) : (
              <>
                <ChevronLeft aria-hidden="true" size={16} />
                <span>{t("collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
