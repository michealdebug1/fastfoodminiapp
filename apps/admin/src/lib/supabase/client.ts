"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@food-platform/shared";
import { getSupabasePublicConfig } from "./env";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createBrowserClient<Database>(url, publishableKey, {
    auth: { detectSessionInUrl: false },
  });
}
