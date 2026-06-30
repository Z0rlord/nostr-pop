"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { isValidNostrIdentityInput } from "@/lib/nostr";
import type { PracticeIdentity } from "@/lib/practice-identity";

type Props = {
  onSignedIn: (identity: PracticeIdentity) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

type Step = "npub" | "code";

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function rateLimitMessage(base: string, retryAfterSec?: number): string {
  if (!retryAfterSec || retryAfterSec <= 0) return base;
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `${base} Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function DmCodeSignIn({ onSignedIn, onError, disabled }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("npub");
  const [npub, setNpub] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [senderNpub, setSenderNpub] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expired = secondsLeft !== null && secondsLeft <= 0;

  useEffect(() => {
    if (step !== "code" || !expiresAt) {
      setSecondsLeft(null);
      return;
    }

    function tick() {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt! - Date.now()) / 1000)));
    }

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step, expiresAt]);

  function showError(message: string | null) {
    setLocalError(message);
    onError(message);
  }

  async function requestCode() {
    const trimmed = npub.trim();
    if (!isValidNostrIdentityInput(trimmed)) {
      showError(t("signIn.invalidNpub"));
      return;
    }
    setLoading(true);
    showError(null);
    try {
      const res = await fetch("/api/auth/dm-login/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: trimmed }),
      });
      const data = (await res.json()) as {
        error?: string;
        challenge?: string;
        senderNpub?: string;
        expiresAt?: number;
        expiresInSec?: number;
        retryAfterSec?: number;
      };
      if (!res.ok) {
        throw new Error(
          rateLimitMessage(data.error || t("signIn.dmRequestFailed"), data.retryAfterSec)
        );
      }
      if (!data.challenge) {
        throw new Error(t("signIn.dmRequestFailed"));
      }
      setChallenge(data.challenge);
      setSenderNpub(data.senderNpub || null);
      setExpiresAt(
        data.expiresAt ?? Date.now() + (data.expiresInSec ?? 900) * 1000
      );
      setStep("code");
      setCode("");
    } catch (e) {
      showError(e instanceof Error ? e.message : t("signIn.dmRequestFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!challenge || expired) return;
    if (code.length < 6) {
      showError(t("signIn.dmCodeIncomplete"));
      return;
    }
    setLoading(true);
    showError(null);
    try {
      const res = await fetch("/api/auth/dm-login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub: npub.trim(),
          code: code.trim(),
          challenge,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        pubkeyHex?: string;
        npub?: string;
        sessionToken?: string;
        sessionExpiresAt?: number;
        retryAfterSec?: number;
      };
      if (!res.ok) {
        throw new Error(
          rateLimitMessage(data.error || t("signIn.dmVerifyFailed"), data.retryAfterSec)
        );
      }
      if (!data.pubkeyHex || !data.npub || !data.sessionToken || !data.sessionExpiresAt) {
        throw new Error(t("signIn.dmVerifyFailed"));
      }
      onSignedIn({
        pubkeyHex: data.pubkeyHex,
        npub: data.npub,
        source: "dm",
        dmSession: {
          token: data.sessionToken,
          expiresAt: data.sessionExpiresAt,
        },
      });
    } catch (e) {
      showError(e instanceof Error ? e.message : t("signIn.dmVerifyFailed"));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("npub");
    setChallenge(null);
    setSenderNpub(null);
    setExpiresAt(null);
    setSecondsLeft(null);
    setCode("");
    showError(null);
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !loading && !disabled && !expired && code.length >= 6) {
      e.preventDefault();
      void verifyCode();
    }
  }

  return (
    <div className="space-y-4">
      {localError && (
        <p
          className="rounded-lg bg-dojo-crimson/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {localError}
        </p>
      )}

      {step === "npub" ? (
        <>
          <label htmlFor="dm-login-npub" className="sr-only">
            {t("join.npubLabel")}
          </label>
          <input
            id="dm-login-npub"
            type="text"
            value={npub}
            onChange={(e) => setNpub(e.target.value)}
            placeholder={t("join.npubPlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled || loading}
          />
          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={disabled || loading || !npub.trim()}
            className="w-full rounded-full border border-dojo-gold/40 bg-dojo-gold/10 px-4 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
          >
            {loading ? t("signIn.dmSending") : t("signIn.dmSendCode")}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-dojo-mist/60">{t("signIn.dmCodeSent", { npub: npub.trim() })}</p>
          <p className="text-xs text-dojo-gold/75">{t("signIn.dmCodeValidFor")}</p>
          <p className="text-xs text-dojo-mist/50">
            {t("signIn.dmSenderHint", {
              sender: senderNpub ? `${senderNpub.slice(0, 20)}…` : "DojoPop Login",
            })}
          </p>
          <p className="text-xs text-dojo-mist/45">{t("signIn.dmPrimalHint")}</p>
          {senderNpub && (
            <a
              href={`https://primal.net/p/${senderNpub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-dojo-gold hover:underline"
            >
              {t("signIn.dmOpenBot")}
            </a>
          )}
          {secondsLeft !== null && (
            <p
              className={`text-xs ${expired ? "text-red-300" : "text-dojo-gold/80"}`}
              aria-live="polite"
            >
              {expired
                ? t("signIn.dmCodeExpired")
                : t("signIn.dmCodeExpiresIn", { time: formatCountdown(secondsLeft) })}
            </p>
          )}
          <label htmlFor="dm-login-code" className="sr-only">
            {t("signIn.dmCodeLabel")}
          </label>
          <input
            id="dm-login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={handleCodeKeyDown}
            placeholder={t("signIn.dmCodePlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
            disabled={disabled || loading || expired}
          />
          <button
            type="button"
            onClick={() => void verifyCode()}
            disabled={disabled || loading || code.length < 6 || expired}
            className="w-full rounded-full bg-dojo-crimson px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t("signIn.dmVerifying") : t("signIn.dmVerifyCta")}
          </button>
          {expired ? (
            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={disabled || loading}
              className="w-full rounded-full border border-dojo-gold/40 bg-dojo-gold/10 px-4 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
            >
              {loading ? t("signIn.dmSending") : t("signIn.dmResendCode")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={reset}
            disabled={loading}
            className="w-full text-xs text-dojo-mist/55 hover:text-dojo-gold disabled:opacity-50"
          >
            {t("signIn.dmStartOver")}
          </button>
        </>
      )}
    </div>
  );
}
