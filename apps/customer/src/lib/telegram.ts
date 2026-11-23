import type { TelegramWebApp } from "@/types/telegram";

/**
 * Safe access to the Telegram WebApp bridge. Returns `null` in a normal browser
 * or during server rendering, so every consumer can stay optional.
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

let telegramWebAppLoad: Promise<TelegramWebApp | null> | null = null;

export function loadTelegramWebApp(): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const existing = getTelegramWebApp();
  if (existing) return Promise.resolve(existing);
  if (telegramWebAppLoad) return telegramWebAppLoad;

  telegramWebAppLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => resolve(getTelegramWebApp());
    script.onerror = () => {
      telegramWebAppLoad = null;
      reject(new Error("Telegram WebApp bridge failed to load."));
    };
    document.head.appendChild(script);
  });

  return telegramWebAppLoad;
}
