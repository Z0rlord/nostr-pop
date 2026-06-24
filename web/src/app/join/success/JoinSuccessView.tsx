"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NostrLoginCallout } from "@/components/NostrLoginCallout";
import { useI18n } from "@/i18n/context";

type Props = {
  viaLightning: boolean;
  sessionId?: string;
};

export function JoinSuccessView({ viaLightning, sessionId }: Props) {
  const { t } = useI18n();
  const [activating, setActivating] = useState(Boolean(sessionId && !viaLightning));
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || viaLightning) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Activation failed");
        }
        if (!cancelled && !data.activated) {
          setActivationError(t("joinSuccess.activationPending"));
        }
      } catch (e) {
        if (!cancelled) {
          setActivationError(
            e instanceof Error ? e.message : t("joinSuccess.activationFailed")
          );
        }
      } finally {
        if (!cancelled) setActivating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, viaLightning, t]);

  return (
    <>
      <Header />
      <main className="gradient-hero min-h-[60vh] px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-dojo-gold/20 text-2xl">
            ✓
          </div>
          <h1 className="font-display text-3xl text-white">{t("joinSuccess.title")}</h1>
          <p className="mt-4 text-dojo-mist/70">
            {viaLightning ? t("joinSuccess.paidLightning") : t("joinSuccess.paidStripe")}
          </p>
          {activating && (
            <p className="mt-3 text-sm text-dojo-gold">{t("joinSuccess.activating")}</p>
          )}
          {activationError && (
            <p className="mt-3 text-sm text-amber-200" role="alert">
              {activationError}
            </p>
          )}
          {sessionId && (
            <p className="mt-4 text-xs text-dojo-mist/40">
              Reference: {sessionId.slice(0, 20)}…
            </p>
          )}

          <div className="mt-8 text-left">
            <NostrLoginCallout variant="success" />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/practice"
              className="rounded-full bg-dojo-crimson px-6 py-3 text-white hover:bg-red-700 transition-colors"
            >
              {t("joinSuccess.ctaSignIn")}
            </Link>
            <Link
              href="/watch"
              className="rounded-full border border-white/15 px-6 py-3 text-dojo-mist hover:text-white transition-colors"
            >
              {t("joinSuccess.ctaWatch")}
            </Link>
            <Link
              href="/"
              className="text-sm text-dojo-mist/60 hover:text-white transition-colors sm:self-center"
            >
              {t("joinSuccess.ctaHome")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
