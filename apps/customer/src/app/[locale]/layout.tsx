import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { restaurant } from "@/config/restaurant";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import "@/styles/globals.css";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("title"),
      template: `%s · ${restaurant.name}`,
    },
    description: t("description"),
    applicationName: restaurant.name,
    appleWebApp: {
      capable: true,
      title: restaurant.name,
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport = {
  themeColor: "#fff8ec",
  colorScheme: "light" as const,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables}>
      <body className="min-h-dvh bg-cream-100 text-ink-900 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
