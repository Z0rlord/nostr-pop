"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface InvoiceResponse {
  id: string;
  amountSats: number;
  status: string;
  configured: boolean;
  setupHint?: string;
  checkoutLink?: string;
  qrDataUrl?: string;
}

export default function LightningPage() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!invoiceId) return;
    const res = await fetch(`/api/lightning/status/${invoiceId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load invoice");
      return;
    }
    setInvoice(data);
    if (data.status === "paid") {
      window.location.href = "/join/success?lightning=1";
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
          {error && (
            <p className="mt-4 text-red-300">{error}</p>
          )}
          {invoice && (
            <div className="card-glow mt-8 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8">
              <p className="text-2xl font-medium text-dojo-gold">
                {invoice.amountSats.toLocaleString()} sats
              </p>
              <p className="mt-2 text-sm text-dojo-mist/60">~$0.99 / month</p>

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

              {invoice.checkoutLink && (
                <a
                  href={invoice.checkoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block rounded-lg bg-dojo-gold/20 px-6 py-3 text-dojo-gold hover:bg-dojo-gold/30 transition-colors"
                >
                  Open BTCPay checkout
                </a>
              )}

              <p className="mt-6 text-xs text-dojo-mist/50">
                Status: {invoice.status} — polling every 5s
              </p>
            </div>
          )}
          <Link
            href="/join"
            className="mt-8 inline-block text-sm text-dojo-mist/60 hover:text-white"
          >
            ← Back to join
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
