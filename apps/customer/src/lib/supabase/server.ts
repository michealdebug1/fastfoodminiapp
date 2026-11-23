import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@food-platform/shared";
import { getSupabasePublicConfig } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes(
              "Cookies can only be modified in a Server Action or Route Handler",
            )
          ) {
            return;
          }

          throw error;
        }
      },
    },
  });
}
