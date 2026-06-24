"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NostrGuideContent } from "@/components/NostrGuideContent";
import { NostrLoginCallout } from "@/components/NostrLoginCallout";
import { useI18n } from "@/i18n/context";

export default function JoinPage() {
  const { t } = useI18n();
  const [npub, setNpub] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"stripe" | "lightning" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: "stripe" | "lightning") {
    setError(null);
    if (!npub.trim()) {
      setError(t("join.npubRequired"));
      return;
    }
    setLoading(method);
    try {
      const endpoint =
        method === "stripe" ? "/api/stripe/checkout" : "/api/lightning/invoice";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npub: npub.trim(), email: email.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment setup failed");
      }
      if (method === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      if (method === "lightning" && data.invoiceId) {
        window.location.href = `/join/lightning?id=${data.invoiceId}`;
        return;
      }
      throw new Error("Unexpected response");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Header />
      <main className="gradient-hero min-h-[70vh] px-6 py-16">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
          >
            {t("common.back")}
          </Link>
          <h1 className="mt-6 font-display text-3xl text-white">{t("join.title")}</h1>
          <p className="mt-3 text-dojo-mist/70">{t("join.description")}</p>

          <div className="mt-6">
            <NostrLoginCallout variant="join" />
          </div>

          <form
            className="card-glow mt-8 space-y-5 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label htmlFor="npub" className="block text-sm font-medium text-dojo-mist">
                {t("join.npubLabel")} <span className="text-dojo-crimson">{t("common.required")}</span>
              </label>
              <input
                id="npub"
                type="text"
                value={npub}
                onChange={(e) => setNpub(e.target.value)}
                placeholder={t("join.npubPlaceholder")}
                className="mt-2 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
                required
              />
              <p className="mt-2 text-xs text-dojo-mist/50">
                {t("join.npubHint")}{" "}
                <Link href="/nostr" className="text-dojo-gold hover:underline">
                  {t("nostr.npubHow")}
                </Link>
              </p>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dojo-mist">
                {t("join.emailLabel")}{" "}
                <span className="text-dojo-mist/40">{t("common.optional")}</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("join.emailPlaceholder")}
                className="mt-2 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-dojo-crimson/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="grid gap-3 pt-2">
              <button
                type="button"
                onClick={() => pay("stripe")}
                disabled={loading !== null}
                className="w-full rounded-lg bg-dojo-crimson py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading === "stripe" ? t("join.redirecting") : t("join.payStripe")}
              </button>
              <button
                type="button"
                onClick={() => pay("lightning")}
                disabled={loading !== null}
                className="w-full rounded-lg border border-dojo-gold/30 bg-dojo-gold/10 py-3 font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
              >
                {loading === "lightning" ? t("join.creatingInvoice") : t("join.payLightning")}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <NostrGuideContent variant="compact" />
          </div>

          <p className="mt-6 text-center text-xs text-dojo-mist/50">{t("join.billingNote")}</p>
          <p className="mt-3 text-center text-xs text-dojo-mist/50">
            {t("join.termsPrefix")}{" "}
            <Link href="/terms" className="text-dojo-gold hover:underline">
              {t("footer.terms")}
            </Link>{" "}
            {t("join.termsAnd")}{" "}
            <Link href="/privacy" className="text-dojo-gold hover:underline">
              {t("footer.privacy")}
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
