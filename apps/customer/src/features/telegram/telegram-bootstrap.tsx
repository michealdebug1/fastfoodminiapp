"use client";

import { useEffect } from "react";
import { loadTelegramWebApp } from "@/lib/telegram";

const CREAM = "#fff8ec";

/**
 * Tells Telegram the Mini App is ready, expands it to the full viewport and
 * matches the native chrome to the cream brand surface. No-op in a browser.
 */
export function TelegramBootstrap() {
  useEffect(() => {
    let active = true;
    void loadTelegramWebApp()
      .then((webApp) => {
        if (!active || !webApp?.initData) return;
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor(CREAM);
        webApp.setBackgroundColor(CREAM);
      })
      .catch(() => {
        console.error("Telegram Mini App bridge failed to load.");
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
