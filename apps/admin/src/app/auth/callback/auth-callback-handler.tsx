"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function AuthCallbackHandler() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const t = useTranslations("AuthCallback");

  useEffect(() => {
    let active = true;

    async function completeAuthentication() {
      try {
        const supabase = createClient();
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.slice(1));
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const hashType = hash.get("type");
        let authenticated = false;

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          authenticated = !error && Boolean(data.session);
        } else if (tokenHash && (type === "invite" || type === "recovery")) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          authenticated = !error && Boolean(data.session);
        } else if (
          accessToken &&
          refreshToken &&
          (hashType === "invite" || hashType === "recovery")
        ) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          authenticated = !error && Boolean(data.session);
        } else {
          const { data, error } = await supabase.auth.getSession();
          authenticated = !error && Boolean(data.session);
        }

        if (!authenticated) {
          if (active) setFailed(true);
          return;
        }

        if (active) {
          window.history.replaceState(null, "", "/auth/callback");
          router.replace("/set-password");
        }
      } catch {
        if (active) setFailed(true);
      }
    }

    void completeAuthentication();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-canvas px-5 py-10">
      <section
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-[0_12px_42px_rgba(16,24,40,0.06)]"
      >
        <p className="text-sm font-semibold text-slate-800">
          {failed ? t("failed") : t("verifying")}
        </p>
        {failed ? (
          <a
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-admin-orange px-4 text-sm font-semibold text-white hover:bg-orange-700"
            href="/login"
          >
            {t("returnToSignIn")}
          </a>
        ) : null}
      </section>
    </main>
  );
}
