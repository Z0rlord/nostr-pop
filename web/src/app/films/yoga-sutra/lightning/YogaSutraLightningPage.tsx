"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ACCESS_TOKEN_KEY = "dojopop-film-yoga-sutra-token";
const NPUB_KEY = "dojopop-film-yoga-sutra-npub";

interface InvoiceResponse {
  id: string;
  amountSats: number;
  status: string;
  configured: boolean;
  setupHint?: string;
  qrDataUrl?: string;
  unlocked?: boolean;
  accessToken?: string;
  npub?: string;
}

export default function YogaSutraLightningPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!invoiceId) return;
    const res = await fetch(`/api/films/yoga-sutra/lightning/status/${invoiceId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load invoice");
      return;
    }
    setInvoice(data);
    if (data.status === "paid" || data.unlocked) {
      if (data.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      }
      if (data.npub) {
        localStorage.setItem(NPUB_KEY, data.npub);
      }
      window.location.href = "/films/yoga-sutra";
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId) {
      setError("Missing invoice id");
      return;
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [invoiceId, refresh]);

  return (
    <>
      <Header />
      <main className="gradient-hero min-h-[70vh] px-6 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl text-white">Lightning invoice</h1>
          <p className="mt-2 text-sm text-dojo-mist/60">Yoga Sutra — one-time unlock</p>
          {error && <p className="mt-4 text-red-300">{error}</p>}
          {invoice && (
            <div className="card-glow mt-8 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8">
              <p className="text-2xl font-medium text-dojo-gold">
                {invoice.amountSats.toLocaleString()} sats
              </p>

              {!invoice.configured && (
                <div className="mt-6 rounded-lg bg-dojo-gold/10 p-4 text-left text-sm text-dojo-mist/80">
                  <p className="font-medium text-dojo-gold">Lightning scaffold mode</p>
                  <p className="mt-2">{invoice.setupHint}</p>
                  <p className="mt-2 text-xs text-dojo-mist/50">
                    Invoice ID: {invoice.id}
                  </p>
                </div>
              )}

              {invoice.qrDataUrl && (
                <img
                  src={invoice.qrDataUrl}
                  alt="Lightning invoice QR"
                  className="mx-auto mt-6 rounded-lg bg-white p-3"
                  width={220}
                  height={220}
                />
              )}

              {invoice.configured && (
                <p className="mt-6 text-xs text-dojo-mist/50">
                  Scan the QR or pay from any Lightning wallet.
                </p>
              )}

              <p className="mt-6 text-xs text-dojo-mist/50">
                Status: {invoice.status} — polling every 5s
              </p>
            </div>
          )}
          <Link
            href="/films/yoga-sutra"
            className="mt-8 inline-block text-sm text-dojo-mist/60 hover:text-white"
          >
            ← Back to film
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
