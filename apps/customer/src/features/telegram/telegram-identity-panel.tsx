"use client";

import { LoaderCircle, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getTelegramWebApp, loadTelegramWebApp } from "@/lib/telegram";

type IdentityErrorKey =
  | "errors.generic"
  | "errors.unavailable"
  | "errors.telegramVerification"
  | "errors.session"
  | "errors.rateLimited"
  | "errors.consent"
  | "errors.alreadyLinked"
  | "errors.challenge"
  | "errors.notVerified"
  | "errors.identityConflict"
  | "errors.notLinked"
  | "errors.recoveryNotEnabled"
  | "errors.recoveryUnavailable"
  | "errors.recoveryMismatch"
  | "errors.invalidCode"
  | "errors.profileMismatch"
  | "errors.identityRequired";

interface TelegramIdentity {
  firstName: string | null;
  linked: boolean;
  currentProfileMatches: boolean;
  recoveryAvailable: boolean;
}

type ContactStatus = "pending" | "verified" | "expired" | "linked";
type RecoveryMode = "recover" | "enroll" | null;
type SuccessKey = "linked" | "recoveryEnabled" | "success";
type IdentityView =
  | { kind: "checking" }
  | { kind: "outside" }
  | { kind: "ready"; identity: TelegramIdentity }
  | { kind: "error"; messageKey: IdentityErrorKey };

const errorMessageKeys: Record<string, IdentityErrorKey> = {
  identity_unavailable: "errors.unavailable",
  telegram_verification_failed: "errors.telegramVerification",
  telegram_verification_required: "errors.identityRequired",
  session_invalid: "errors.session",
  session_required: "errors.session",
  rate_limited: "errors.rateLimited",
  consent_required: "errors.consent",
  identity_already_linked: "errors.alreadyLinked",
  challenge_not_found: "errors.challenge",
  contact_not_verified: "errors.notVerified",
  identity_conflict: "errors.identityConflict",
  identity_not_linked: "errors.notLinked",
  recovery_not_enabled: "errors.recoveryNotEnabled",
  recovery_unavailable: "errors.recoveryUnavailable",
  recovery_account_mismatch: "errors.recoveryMismatch",
  invalid_code: "errors.invalidCode",
  profile_mismatch: "errors.profileMismatch",
  invalid_request: "errors.generic",
  invalid_origin: "errors.generic",
  unauthorized: "errors.generic",
};

class IdentityApiError extends Error {
  constructor(readonly messageKey: IdentityErrorKey) {
    super(messageKey);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function postIdentityApi(
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/telegram/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
    cache: "no-store",
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new IdentityApiError("errors.unavailable");
  }
  if (!isRecord(result)) {
    throw new IdentityApiError("errors.unavailable");
  }
  if (!response.ok) {
    const errorCode =
      "error" in result && typeof result.error === "string"
        ? result.error
        : "";
    throw new IdentityApiError(
      errorMessageKeys[errorCode] ?? "errors.generic",
    );
  }
  return result;
}

function isIdentityResponse(
  value: Record<string, unknown>,
): value is Record<string, unknown> & TelegramIdentity {
  return (
    (value.firstName === null || typeof value.firstName === "string") &&
    typeof value.linked === "boolean" &&
    typeof value.currentProfileMatches === "boolean" &&
    typeof value.recoveryAvailable === "boolean"
  );
}

export function TelegramIdentityPanel() {
  const t = useTranslations("TelegramIdentity");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [identityView, setIdentityView] = useState<IdentityView>({
    kind: "checking",
  });
  const [errorKey, setErrorKey] = useState<IdentityErrorKey | null>(null);
  const [success, setSuccess] = useState<SuccessKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<ContactStatus | null>(null);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadTelegramWebApp()
      .then((webApp) => {
        if (!active) return;
        if (!webApp?.initData) {
          setIdentityView({ kind: "outside" });
          return;
        }
        return postIdentityApi("identity", { initData: webApp.initData })
          .then((result) => {
            if (!isIdentityResponse(result)) {
              throw new IdentityApiError("errors.unavailable");
            }
            if (active) setIdentityView({ kind: "ready", identity: result });
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setIdentityView({
          kind: "error",
          messageKey:
            error instanceof IdentityApiError
              ? error.messageKey
              : "errors.generic",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) dialog.showModal();
    else if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  useEffect(() => {
    if (
      !dialogOpen ||
      !challengeToken ||
      identityView.kind !== "ready"
    ) {
      return;
    }

    let active = true;
    let timeout: number | null = null;
    const poll = async () => {
      try {
        const result = await postIdentityApi("contact-status", {
          challengeToken,
        });
        if (!active) return;
        const status =
          result.status === "pending" ||
          result.status === "verified" ||
          result.status === "expired" ||
          result.status === "linked"
            ? result.status
            : null;
        if (!status) throw new IdentityApiError("errors.generic");
        setContactStatus(status);
        setErrorKey(null);
        if (status === "pending") {
          timeout = window.setTimeout(poll, 2_500);
        }
      } catch (error) {
        if (!active) return;
        setErrorKey(
          error instanceof IdentityApiError
            ? error.messageKey
            : "errors.generic",
        );
        timeout = window.setTimeout(poll, 5_000);
      }
    };

    void poll();
    return () => {
      active = false;
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [challengeToken, dialogOpen, identityView.kind]);

  async function ensureCustomerSession() {
    const supabase = createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw new IdentityApiError("errors.session");
    if (sessionData.session) return;

    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      console.error("Unable to create a customer identity session", signInError);
      throw new IdentityApiError("errors.session");
    }
  }

  function showActionError(error: unknown) {
    setErrorKey(
      error instanceof IdentityApiError
        ? error.messageKey
        : "errors.generic",
    );
    setSuccess(null);
  }

  async function startContactShare() {
    setBusy(true);
    setErrorKey(null);
    setSuccess(null);
    try {
      await ensureCustomerSession();
      const result = await postIdentityApi("contact-challenge", {
        consent: true,
      });
      if (
        typeof result.challengeToken !== "string" ||
        typeof result.botUrl !== "string"
      ) {
        throw new IdentityApiError("errors.unavailable");
      }
      setChallengeToken(result.challengeToken);
      setBotUrl(result.botUrl);
      setContactStatus("pending");
    } catch (error) {
      showActionError(error);
    } finally {
      setBusy(false);
    }
  }

  function openBot() {
    if (!botUrl) return;
    const webApp = getTelegramWebApp();
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(botUrl);
    } else {
      window.open(botUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function finalizeLink() {
    if (!challengeToken) return;
    setBusy(true);
    setErrorKey(null);
    try {
      await postIdentityApi("link", { challengeToken });
      setIdentityView((current) =>
        current.kind === "ready"
          ? {
              kind: "ready",
              identity: {
                ...current.identity,
                linked: true,
                currentProfileMatches: true,
                recoveryAvailable: false,
              },
            }
          : current,
      );
      setChallengeToken(null);
      setBotUrl(null);
      setContactStatus(null);
      setSuccess("linked");
    } catch (error) {
      showActionError(error);
    } finally {
      setBusy(false);
    }
  }

  async function startRecovery(mode: Exclude<RecoveryMode, null>) {
    setBusy(true);
    setErrorKey(null);
    setSuccess(null);
    try {
      const path =
        mode === "recover"
          ? "recovery/start"
          : "recovery/enroll/start";
      const result = await postIdentityApi(path, {});
      if (typeof result.phone !== "string") {
        throw new IdentityApiError("errors.unavailable");
      }
      setMaskedPhone(result.phone);
      if (mode === "enroll" && result.alreadyEnabled === true) {
        setIdentityView((current) =>
          current.kind === "ready"
            ? {
                kind: "ready",
                identity: { ...current.identity, recoveryAvailable: true },
              }
            : current,
        );
        setSuccess("recoveryEnabled");
        return;
      }
      setRecoveryMode(mode);
      setRecoveryCode("");
    } catch (error) {
      showActionError(error);
    } finally {
      setBusy(false);
    }
  }

  async function verifyRecoveryCode() {
    if (!recoveryMode) return;
    setBusy(true);
    setErrorKey(null);
    try {
      await postIdentityApi(
        recoveryMode === "recover"
          ? "recovery/verify"
          : "recovery/enroll/verify",
        { code: recoveryCode },
      );
      if (recoveryMode === "recover") {
        setIdentityView((current) =>
          current.kind === "ready"
            ? {
                kind: "ready",
                identity: {
                  ...current.identity,
                  linked: true,
                  currentProfileMatches: true,
                  recoveryAvailable: true,
                },
              }
            : current,
        );
      } else {
        setIdentityView((current) =>
          current.kind === "ready"
            ? {
                kind: "ready",
                identity: { ...current.identity, recoveryAvailable: true },
              }
            : current,
        );
      }
      setRecoveryMode(null);
      setRecoveryCode("");
      setSuccess(
        recoveryMode === "recover" ? "success" : "recoveryEnabled",
      );
    } catch (error) {
      showActionError(error);
    } finally {
      setBusy(false);
    }
  }

  const identity =
    identityView.kind === "ready" ? identityView.identity : null;
  const inTelegram = identityView.kind === "ready" || identityView.kind === "error";
  const displayName =
    identity?.linked && identity.firstName
      ? identity.firstName
      : t("guest");

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label={t("open")}
        aria-haspopup="dialog"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 text-xs font-bold text-ink-700 transition-colors hover:bg-cream-50 sm:px-3"
      >
        <UserRound className="size-4" aria-hidden="true" />
        <span className="max-w-24 truncate">{displayName}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="product-dialog"
        aria-labelledby="telegram-identity-title"
        onClose={() => setDialogOpen(false)}
      >
        <section className="max-h-[85dvh] overflow-y-auto rounded-3xl bg-cream-50 p-5 shadow-float sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="telegram-identity-title"
              className="font-display text-xl font-black text-ink-900"
            >
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              aria-label={t("close")}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-600"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm leading-6 text-ink-600">
            {identityView.kind === "outside" ? (
              <p>{t("notInTelegram")}</p>
            ) : null}
            {identityView.kind === "checking" ? (
              <p className="inline-flex items-center gap-2" role="status">
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t("checking")}
              </p>
            ) : null}

            {inTelegram && identity && !identity.linked ? (
              <>
                <p>{t("unlinked")}</p>
                <p>{t("contactConsent")}</p>
                {!challengeToken ? (
                  <Button
                    onClick={() => void startContactShare()}
                    disabled={busy}
                    className="w-full"
                  >
                    {busy ? t("working") : t("shareContact")}
                  </Button>
                ) : null}
                {contactStatus === "pending" ? (
                  <div className="space-y-3 rounded-2xl bg-white p-4">
                    <p>{t("contactPending")}</p>
                    <Button
                      onClick={openBot}
                      disabled={!botUrl}
                      variant="outline"
                      className="w-full"
                    >
                      {t("openBot")}
                    </Button>
                  </div>
                ) : null}
                {contactStatus === "verified" ? (
                  <div className="space-y-3 rounded-2xl bg-basil-50 p-4">
                    <p>{t("contactVerified")}</p>
                    <Button
                      onClick={() => void finalizeLink()}
                      disabled={busy}
                      className="w-full"
                    >
                      {busy ? t("working") : t("link")}
                    </Button>
                  </div>
                ) : null}
                {contactStatus === "expired" ? (
                  <Button
                    onClick={() => {
                      setChallengeToken(null);
                      setBotUrl(null);
                      setContactStatus(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    {t("restart")}
                  </Button>
                ) : null}
              </>
            ) : null}

            {inTelegram && identity?.linked ? (
              <>
                <p>
                  {identity.firstName
                    ? t("linkedAs", { name: identity.firstName })
                    : t("linked")}
                </p>
                {!identity.currentProfileMatches ? (
                  identity.recoveryAvailable ? (
                    <Button
                      onClick={() => void startRecovery("recover")}
                      disabled={busy || recoveryMode !== null}
                      className="w-full"
                    >
                      {busy ? t("working") : t("startRecovery")}
                    </Button>
                  ) : (
                    <p>{t("recoveryUnavailable")}</p>
                  )
                ) : identity.recoveryAvailable ? (
                  <p>{t("recoveryEnabled")}</p>
                ) : (
                  <>
                    <p>{t("recoveryConsent")}</p>
                    <Button
                      onClick={() => void startRecovery("enroll")}
                      disabled={busy || recoveryMode !== null}
                      variant="outline"
                      className="w-full"
                    >
                      {busy ? t("working") : t("enableRecovery")}
                    </Button>
                  </>
                )}
              </>
            ) : null}

            {recoveryMode && maskedPhone ? (
              <div className="space-y-3 rounded-2xl bg-white p-4">
                <p>{t("codeSent", { phone: maskedPhone })}</p>
                <label className="block space-y-1.5">
                  <span className="font-bold text-ink-800">
                    {t("codeLabel")}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(event) =>
                      setRecoveryCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-line bg-cream-50 px-3 text-base font-bold tracking-[0.3em] text-ink-900 outline-none focus:border-tomato-500"
                  />
                </label>
                <Button
                  onClick={() => void verifyRecoveryCode()}
                  disabled={busy || recoveryCode.length !== 6}
                  className="w-full"
                >
                  {busy ? t("working") : t("verifyCode")}
                </Button>
              </div>
            ) : null}

            {errorKey ? (
              <p
                className="rounded-xl bg-tomato-50 px-3 py-2 text-sm text-tomato-700"
                role="alert"
              >
                {t(errorKey)}
              </p>
            ) : null}
            {identityView.kind === "error" ? (
              <p
                className="rounded-xl bg-tomato-50 px-3 py-2 text-sm text-tomato-700"
                role="alert"
              >
                {t(identityView.messageKey)}
              </p>
            ) : null}
            {success ? (
              <p
                className="rounded-xl bg-basil-50 px-3 py-2 text-sm text-basil-700"
                role="status"
              >
                {t(success)}
              </p>
            ) : null}
          </div>
        </section>
      </dialog>
    </>
  );
}
