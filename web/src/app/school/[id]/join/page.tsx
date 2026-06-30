"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NostrGuideContent } from "@/components/NostrGuideContent";
import { useI18n } from "@/i18n/context";
import { connectNip07 } from "@/lib/nip07";

export default function SchoolJoinPage({ params }: { params: { id: string } }) {
  const { t } = useI18n();
  const [npub, setNpub] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function connectAndJoin() {
    setStatus("loading");
    setMessage("");
    const identity = await connectNip07();
    if (!identity) {
      setStatus("error");
      setMessage(t("nostr.noExtension"));
      return;
    }
    setNpub(identity.npub);

    const res = await fetch(`/api/schools/${params.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ npub: identity.npub }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || t("schoolJoin.joinFailed"));
      return;
    }
    setStatus("done");
    setMessage(data.message || t("schoolJoin.defaultSuccess"));
  }

  return (
    <>
      <Header />
      <main className="gradient-hero min-h-[60vh] px-6 py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-3xl text-white">{t("schoolJoin.title")}</h1>
          <p className="mt-4 text-dojo-mist/70">{t("schoolJoin.description")}</p>

          <div className="card-glow mt-8 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8">
            {status === "done" ? (
              <>
                <p className="text-dojo-gold text-lg">✓ {message}</p>
                {npub && (
                  <p className="mt-3 font-mono text-xs text-dojo-mist/50 break-all">
                    {npub}
                  </p>
                )}
                <Link
                  href={`/school/${params.id}`}
                  className="mt-6 inline-block text-sm text-dojo-gold hover:underline"
                >
                  {t("schoolJoin.viewLog")}
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={connectAndJoin}
                  disabled={status === "loading"}
                  className="w-full rounded-full bg-dojo-crimson px-6 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {status === "loading" ? t("nostr.connecting") : t("schoolJoin.button")}
                </button>
                {status === "error" && (
                  <p className="mt-4 text-sm text-red-300">{message}</p>
                )}
                <div className="mt-6 text-left">
                  <NostrGuideContent variant="compact" />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
