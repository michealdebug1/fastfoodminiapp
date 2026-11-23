import { z } from "zod";

const publicSupabaseConfig = z.object({
  url: z.url(),
  publishableKey: z.string().startsWith("sb_publishable_"),
});

export function getSupabasePublicConfig() {
  return publicSupabaseConfig.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
