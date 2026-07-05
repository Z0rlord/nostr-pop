"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type {
  FilmPurchaseTier,
  YogaSutraTierConfig,
  YogaSutraTrailerConfig,
} from "@/lib/films/yoga-sutra";

const ACCESS_TOKEN_KEY = "dojopop-film-yoga-sutra-token";
const NPUB_KEY = "dojopop-film-yoga-sutra-npub";

interface YogaSutraFilmPageProps {
  trailer?: YogaSutraTrailerConfig;
  synopsis: string;
  tiers: YogaSutraTierConfig[];
}

function TrailerPlayer({ trailer }: { trailer: YogaSutraTrailerConfig }) {
  if (trailer.type === "vimeo" && trailer.vimeoId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${trailer.vimeoId}?title=0&byline=0&portrait=0`}
          title="Yoga Sutra trailer"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (trailer.type === "video" && trailer.url) {
    return (
      <video
        src={trailer.url}
        controls
        playsInline
        className="aspect-video w-full rounded-lg bg-black"
      />
    );
  }

  return null;
}

interface StreamState {
  url: string;
  loading: boolean;
  error: string | null;
}

interface AccessState {
  unlocked: boolean;
  tier?: FilmPurchaseTier;
  expiresAt?: string;
  canDownload: boolean;
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function YogaSutraFilmPage({
  trailer,
  synopsis,
  tiers,
}: YogaSutraFilmPageProps) {
  const searchParams = useSearchParams();
  const [npub, setNpub] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<{
    method: "stripe" | "lightning";
    tier: FilmPurchaseTier;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessState>({
    unlocked: false,
    canDownload: false,
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
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

  const loadDownload = useCallback(
    async (opts: { npub?: string; token?: string }) => {
      const params = new URLSearchParams();
      if (opts.npub) params.set("npub", opts.npub);
      if (opts.token) params.set("token", opts.token);
      const res = await fetch(`/api/films/yoga-sutra/download?${params}`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
      } else {
        setDownloadUrl(null);
      }
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
        setAccess({
          unlocked: true,
          tier: data.tier,
          expiresAt: data.expiresAt,
          canDownload: Boolean(data.canDownload),
        });
        await loadStream(opts);
        if (data.canDownload) {
          await loadDownload(opts);
        }
        return true;
      }
      setAccess({ unlocked: false, canDownload: false });
      return false;
    },
    [loadStream, loadDownload]
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

  async function pay(method: "stripe" | "lightning", tier: FilmPurchaseTier) {
    setError(null);
    if (method === "lightning" && !npub.trim()) {
      setError("Nostr npub required for Lightning unlock");
      return;
    }
    setLoading({ method, tier });
    try {
      const endpoint =
        method === "stripe"
          ? "/api/films/yoga-sutra/stripe/checkout"
          : "/api/films/yoga-sutra/lightning/invoice";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
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

  const buyTier = tiers.find((t) => t.tier === "buy");
  const rentTier = tiers.find((t) => t.tier === "rent");

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
            Own the film permanently with download, or rent a 48-hour stream.
            Pay with Lightning or card.
          </p>

          <div className="card-glow mt-8 overflow-hidden rounded-2xl border border-white/5 bg-dojo-slate/60">
            {access.unlocked && stream.url ? (
              <div className="p-4">
                <p className="mb-3 text-sm font-medium text-dojo-gold">
                  {access.tier === "buy"
                    ? "Full film — own + download"
                    : "Full film — 48-hour stream"}
                </p>
                {access.tier === "rent" && access.expiresAt && (
                  <p className="mb-3 text-xs text-dojo-mist/60">
                    Access expires {formatExpiry(access.expiresAt)}
                  </p>
                )}
                <video
                  src={stream.url}
                  controls
                  playsInline
                  className="aspect-video w-full rounded-lg bg-black"
                />
                {access.canDownload && downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="mt-4 inline-flex rounded-lg border border-dojo-gold/30 bg-dojo-gold/10 px-4 py-2 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 transition-colors"
                  >
                    Download film
                  </a>
                )}
              </div>
            ) : access.unlocked && stream.loading ? (
              <div className="flex aspect-video items-center justify-center p-8 text-dojo-mist/60">
                Loading stream…
              </div>
            ) : (
              <div className="p-4">
                <p className="mb-3 text-sm text-dojo-mist/60">Trailer</p>
                {trailer ? (
                  <TrailerPlayer trailer={trailer} />
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

          <section className="card-glow mt-8 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8">
            <h2 className="text-sm font-medium text-dojo-mist/60">Synopsis</h2>
            <p className="mt-3 text-dojo-mist/80 leading-relaxed">{synopsis}</p>
          </section>

          {!access.unlocked && (
            <form
              className="card-glow mt-8 space-y-6 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
              onSubmit={(e) => e.preventDefault()}
            >
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

              <div className="grid gap-4 sm:grid-cols-2">
                {buyTier && (
                  <div className="rounded-xl border border-dojo-gold/20 bg-dojo-ink/40 p-5">
                    <h2 className="text-lg font-medium text-white">
                      {buyTier.label}
                    </h2>
                    <p className="mt-1 text-sm text-dojo-mist/60">
                      {buyTier.description}
                    </p>
                    <p className="mt-4 text-2xl font-medium text-dojo-gold">
                      ${buyTier.usd.toFixed(2)}
                    </p>
                    <p className="text-sm text-dojo-mist/50">
                      {buyTier.sats.toLocaleString()} sats
                    </p>
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => pay("stripe", "buy")}
                        disabled={loading !== null}
                        className="w-full rounded-lg bg-dojo-crimson py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {loading?.method === "stripe" && loading.tier === "buy"
                          ? "Redirecting…"
                          : "Buy with card"}
                      </button>
                      <button
                        type="button"
                        onClick={() => pay("lightning", "buy")}
                        disabled={loading !== null}
                        className="w-full rounded-lg border border-dojo-gold/30 bg-dojo-gold/10 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
                      >
                        {loading?.method === "lightning" && loading.tier === "buy"
                          ? "Creating invoice…"
                          : "Buy with Lightning"}
                      </button>
                    </div>
                  </div>
                )}

                {rentTier && (
                  <div className="rounded-xl border border-white/10 bg-dojo-ink/40 p-5">
                    <h2 className="text-lg font-medium text-white">
                      {rentTier.label}
                    </h2>
                    <p className="mt-1 text-sm text-dojo-mist/60">
                      {rentTier.description}
                    </p>
                    <p className="mt-4 text-2xl font-medium text-dojo-gold">
                      ${rentTier.usd.toFixed(2)}
                    </p>
                    <p className="text-sm text-dojo-mist/50">
                      {rentTier.sats.toLocaleString()} sats
                    </p>
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => pay("stripe", "rent")}
                        disabled={loading !== null}
                        className="w-full rounded-lg bg-dojo-crimson py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {loading?.method === "stripe" && loading.tier === "rent"
                          ? "Redirecting…"
                          : "Rent with card"}
                      </button>
                      <button
                        type="button"
                        onClick={() => pay("lightning", "rent")}
                        disabled={loading !== null}
                        className="w-full rounded-lg border border-dojo-gold/30 bg-dojo-gold/10 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
                      >
                        {loading?.method === "lightning" && loading.tier === "rent"
                          ? "Creating invoice…"
                          : "Rent with Lightning"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {access.unlocked && accessToken && (
            <p className="mt-6 text-center text-xs text-dojo-mist/50">
              {access.tier === "buy"
                ? "Access saved on this device. Return anytime to stream or download."
                : "48-hour stream access saved on this device."}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
