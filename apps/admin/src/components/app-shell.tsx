"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import type { StaffRole } from "@food-platform/shared";

function resolvePageKey(pathname: string) {
  if (pathname === "/") return "dashboard";
  if (pathname === "/orders") return "orders";
  if (pathname.startsWith("/orders/")) return "orderDetails";
  if (pathname === "/products") return "products";
  if (pathname.startsWith("/products/")) return "productEditor";
  if (pathname === "/settings") return "settings";
  if (pathname === "/account") return "account";
  return "dashboard";
}

export function AppShell({
  children,
  email,
  restaurantName,
  role,
}: {
  children: React.ReactNode;
  email: string | null;
  restaurantName: string;
  role: StaffRole;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Shell");
  const tn = useTranslations("Navigation");

  const pageKey = resolvePageKey(pathname);
  const title = t(`${pageKey}.title`);
  const description = t(`${pageKey}.description`);

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        email={email}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((value) => !value)}
        restaurantName={restaurantName}
        role={role}
      />
      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]"
        }`}
      >
        <Topbar
          email={email}
          restaurantName={restaurantName}
          role={role}
          title={title}
        />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-9 lg:pt-8">
          <div className="mb-6 flex items-start justify-between gap-3 lg:hidden">
            <div className="flex items-start gap-3">
              <button
                aria-label={tn("open")}
                className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white text-admin-ink shadow-sm"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu aria-hidden="true" size={18} />
              </button>
              <div>
                <p className="text-xs font-medium text-admin-muted">
                  {tn("workspace")} / {title}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-admin-muted">{description}</p>
              </div>
            </div>
            <LocaleSwitcher className="mt-1 shrink-0" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
