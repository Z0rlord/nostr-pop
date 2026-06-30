"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ACCESS_TOKEN_KEY = "dojopop-film-yoga-sutra-token";
const NPUB_KEY = "dojopop-film-yoga-sutra-npub";

interface YogaSutraFilmPageProps {
  trailerUrl?: string;
  priceSats: number;
  priceUsd: number;
}

interface StreamState {
  url: string;
  loading: boolean;
  error: string | null;
}

export function YogaSutraFilmPage({
  trailerUrl,
  priceSats,
  priceUsd,
}: YogaSutraFilmPageProps) {
  const searchParams = useSearchParams();
  const [npub, setNpub] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"stripe" | "lightning" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamState>({
    url: "",
    loading: false,
    error: null,
  });

  const loadStream = useCallback(
    async (opts: { npub?: string; token?: string }) => {
      setStream({ url: "", loading: true, error: null });
      const params = new URLSearchParams();
      if (opts.npub) params.set("npub", opts.npub);
      if (opts.token) params.set("token", opts.token);
      const res = await fetch(`/api/films/yoga-sutra/stream?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setStream({
          url: "",
          loading: false,
          error: data.error || "Could not load stream",
        });
        return;
      }
      setStream({ url: data.streamUrl, loading: false, error: null });
    },
    []
  );

  const checkAccess = useCallback(
    async (opts: { npub?: string; token?: string }) => {
      const params = new URLSearchParams();
      if (opts.npub) params.set("npub", opts.npub);
      if (opts.token) params.set("token", opts.token);
      const res = await fetch(`/api/films/yoga-sutra/access?${params}`);
      const data = await res.json();
      if (data.unlocked) {
        setUnlocked(true);
        await loadStream(opts);
        return true;
      }
      return false;
    },
    [loadStream]
  );

  const confirmStripeSession = useCallback(
    async (sessionId: string) => {
      const res = await fetch("/api/films/yoga-sutra/stripe/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.unlocked) {
        setError(data.error || "Payment confirmation failed");
        return;
      }
      if (data.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        setAccessToken(data.accessToken);
        await checkAccess({ token: data.accessToken });
      }
    },
    [checkAccess]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedNpub = localStorage.getItem(NPUB_KEY);
    if (storedNpub) setNpub(storedNpub);
    if (storedToken) setAccessToken(storedToken);

    const sessionId = searchParams.get("session_id");
    const unlockedParam = searchParams.get("unlocked");

    (async () => {
      if (sessionId && unlockedParam === "1") {
        await confirmStripeSession(sessionId);
        window.history.replaceState({}, "", "/films/yoga-sutra");
        return;
      }
      if (storedToken) {
        const ok = await checkAccess({ token: storedToken });
        if (ok) return;
      }
      if (storedNpub) {
        await checkAccess({ npub: storedNpub });
      }
    })();
  }, [searchParams, confirmStripeSession, checkAccess]);

  async function pay(method: "stripe" | "lightning") {
    setError(null);
    if (method === "lightning" && !npub.trim()) {
      setError("Nostr npub required for Lightning unlock");
      return;
    }
    setLoading(method);
    try {
      const endpoint =
        method === "stripe"
          ? "/api/films/yoga-sutra/stripe/checkout"
          : "/api/films/yoga-sutra/lightning/invoice";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub: npub.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment setup failed");
      }
      if (npub.trim()) {
        localStorage.setItem(NPUB_KEY, npub.trim());
      }
      if (method === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      if (method === "lightning" && data.invoiceId) {
        window.location.href = `/films/yoga-sutra/lightning?id=${data.invoiceId}`;
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
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
          >
            ← Home
          </Link>
          <h1 className="mt-6 font-display text-3xl text-white sm:text-4xl">
            Yoga Sutra
          </h1>
          <p className="mt-3 max-w-xl text-dojo-mist/70">
            Stream the full film after a one-time purchase. Pay with Lightning or
            card — own it forever on this device or tie access to your Nostr npub.
          </p>

          <div className="card-glow mt-8 overflow-hidden rounded-2xl border border-white/5 bg-dojo-slate/60">
            {unlocked && stream.url ? (
              <div className="p-4">
                <p className="mb-3 text-sm font-medium text-dojo-gold">
                  Full film — thank you for your purchase
                </p>
                <video
                  src={stream.url}
                  controls
                  playsInline
                  className="aspect-video w-full rounded-lg bg-black"
                />
              </div>
            ) : unlocked && stream.loading ? (
              <div className="flex aspect-video items-center justify-center p-8 text-dojo-mist/60">
                Loading stream…
              </div>
            ) : (
              <div className="p-4">
                <p className="mb-3 text-sm text-dojo-mist/60">Trailer</p>
                {trailerUrl ? (
                  <video
                    src={trailerUrl}
                    controls
                    playsInline
                    className="aspect-video w-full rounded-lg bg-black"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-dojo-ink text-sm text-dojo-mist/50">
                    Trailer URL not configured
                  </div>
                )}
              </div>
            )}
            {stream.error && (
              <p className="px-4 pb-4 text-sm text-red-300">{stream.error}</p>
            )}
          </div>

          {!unlocked && (
            <form
              className="card-glow mt-8 space-y-5 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="text-center">
                <p className="text-2xl font-medium text-dojo-gold">
                  {priceSats.toLocaleString()} sats
                </p>
                <p className="mt-1 text-sm text-dojo-mist/60">
                  or ${priceUsd.toFixed(2)} one-time
                </p>
              </div>

              <div>
                <label
                  htmlFor="npub"
                  className="block text-sm font-medium text-dojo-mist"
                >
                  Nostr npub{" "}
                  <span className="text-dojo-mist/40">(required for Lightning)</span>
                </label>
                <input
                  id="npub"
                  type="text"
                  value={npub}
                  onChange={(e) => setNpub(e.target.value)}
                  placeholder="npub1…"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
                />
                <p className="mt-2 text-xs text-dojo-mist/50">
                  Optional for card checkout; ties unlock to your Nostr identity when
                  provided.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-dojo-mist"
                >
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
                  {loading === "stripe" ? "Redirecting…" : "Pay with card (Stripe)"}
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
          )}

          {unlocked && accessToken && (
            <p className="mt-6 text-center text-xs text-dojo-mist/50">
              Access saved on this device. Return anytime to stream again.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
