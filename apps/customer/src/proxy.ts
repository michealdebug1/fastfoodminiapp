import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const i18nResponse = handleI18nRouting(request);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    i18nResponse.cookies.set(cookie);
  });

  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = supabaseResponse.headers.get(header);

    if (value) {
      i18nResponse.headers.set(header, value);
    }
  });

  return i18nResponse;
}

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
