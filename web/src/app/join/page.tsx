"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function JoinPage() {
  const [npub, setNpub] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"stripe" | "lightning" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: "stripe" | "lightning") {
    setError(null);
    if (!npub.trim()) {
      setError("Enter your Nostr npub to continue.");
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
      throw new Error("Unexpected response from server");
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
            ← Back
          </Link>
          <h1 className="mt-6 font-display text-3xl text-white">
            Join DojoPop
          </h1>
          <p className="mt-3 text-dojo-mist/70">
            $0.99/month. Register your npub, pick a payment method, and get on
            the members list for relay access.
          </p>

          <form
            className="card-glow mt-8 space-y-5 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label htmlFor="npub" className="block text-sm font-medium text-dojo-mist">
                Nostr npub <span className="text-dojo-crimson">*</span>
              </label>
              <input
                id="npub"
                type="text"
                value={npub}
                onChange={(e) => setNpub(e.target.value)}
                placeholder="npub1…"
                className="mt-2 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dojo-mist">
                Email <span className="text-dojo-mist/40">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                {loading === "stripe" ? "Redirecting…" : "Pay with Stripe — $0.99/mo"}
              </button>
              <button
                type="button"
                onClick={() => pay("lightning")}
                disabled={loading !== null}
                className="w-full rounded-lg border border-dojo-gold/30 bg-dojo-gold/10 py-3 font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
              >
                {loading === "lightning"
                  ? "Creating invoice…"
                  : "Pay with Lightning"}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-dojo-mist/50">
            Stripe subscriptions renew monthly. Lightning pays one month at a
            time (~1,000 sats at current rates).
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
