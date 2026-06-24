"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { connectNip07 } from "@/lib/nip07";
import { decodeNpubToHex, isValidNpub } from "@/lib/nostr";
import {
  savePracticeIdentity,
  type PracticeIdentity,
} from "@/lib/practice-identity";
import { connectViaBunkerInput } from "@/lib/nip46-auth";
import { NostrLoginCallout } from "@/components/NostrLoginCallout";
import { NostrConnectQrPanel } from "@/components/NostrConnectQrPanel";
import { NostrQrScanner } from "@/components/NostrQrScanner";
import { PrimalDownloadLinks } from "@/components/PrimalDownloadLinks";
import { DmCodeSignIn } from "@/components/DmCodeSignIn";

type Props = {
  onSignedIn: (identity: PracticeIdentity) => void;
  variant?: "page" | "embedded";
};

export function PracticeSignIn({ onSignedIn, variant = "page" }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [publicNpubInput, setPublicNpubInput] = useState("");
  const [bunkerInput, setBunkerInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<"none" | "show" | "scan">("none");

  function completeSignIn(identity: PracticeIdentity) {
    savePracticeIdentity(identity);
    onSignedIn(identity);
  }

  async function connectExtension() {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectNip07();
      if (!result) {
        setError(t("signIn.noExtensionHelp"));
        return;
      }
      completeSignIn({
        pubkeyHex: result.pubkeyHex,
        npub: result.npub,
        source: "extension",
      });
    } catch {
      setError(t("signIn.connectFailed"));
    } finally {
      setConnecting(false);
    }
  }

  async function connectBunkerLink() {
    setConnecting(true);
    setError(null);
    try {
      const identity = await connectViaBunkerInput(bunkerInput);
      completeSignIn(identity);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("signIn.connectFailed"));
    } finally {
      setConnecting(false);
    }
  }

  function viewPublicLog() {
    setError(null);
    const npub = publicNpubInput.trim();
    if (!isValidNpub(npub) || !decodeNpubToHex(npub)) {
      setError(t("signIn.invalidNpub"));
      return;
    }
    router.push(`/u/${npub}`);
  }

  const isPage = variant === "page";

  return (
    <div className={isPage ? "mx-auto max-w-lg" : ""}>
      {isPage && (
        <>
          <h1 className="font-display text-3xl text-white sm:text-4xl">
            {t("signIn.title")}
          </h1>
          <p className="mt-3 text-dojo-mist/70">{t("signIn.subtitle")}</p>
        </>
      )}

      <div className={isPage ? "mt-8" : ""}>
        <NostrLoginCallout variant="practice" />
      </div>

      <div
        className={`card-glow space-y-5 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8 ${
          isPage ? "mt-6" : "mt-4"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-white">{t("signIn.methodExtension")}</p>
          <p className="mt-1 text-xs text-dojo-mist/55">{t("signIn.methodExtensionHint")}</p>
          <button
            type="button"
            onClick={() => void connectExtension()}
            disabled={connecting}
            className="mt-4 w-full rounded-full bg-dojo-crimson px-6 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {connecting ? t("nostr.connecting") : t("signIn.connectExtension")}
          </button>
        </div>

        <div className="relative py-2 text-center text-xs uppercase tracking-wide text-dojo-mist/40">
          <span className="bg-dojo-slate/60 px-3">{t("signIn.orDivider")}</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-white/10" />
        </div>

        <div>
          <p className="text-sm font-medium text-white">{t("signIn.methodDm")}</p>
          <p className="mt-1 text-xs text-dojo-mist/55">{t("signIn.methodDmHint")}</p>
          <div className="mt-4">
            <DmCodeSignIn
              onSignedIn={completeSignIn}
              onError={setError}
              disabled={connecting}
            />
          </div>
        </div>

        <div className="relative py-2 text-center text-xs uppercase tracking-wide text-dojo-mist/40">
          <span className="bg-dojo-slate/60 px-3">{t("signIn.orDivider")}</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-white/10" />
        </div>

        <div>
          <p className="text-sm font-medium text-white">{t("signIn.methodQr")}</p>
          <p className="mt-1 text-xs text-dojo-mist/55">{t("signIn.methodQrHint")}</p>
          <div className="mt-4">
            <PrimalDownloadLinks />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setQrMode((m) => (m === "show" ? "none" : "show"));
              }}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                qrMode === "show"
                  ? "border-dojo-gold bg-dojo-gold/15 text-dojo-gold"
                  : "border-white/15 text-dojo-mist hover:border-dojo-gold/40 hover:text-white"
              }`}
            >
              {t("signIn.showQr")}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setQrMode((m) => (m === "scan" ? "none" : "scan"));
              }}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                qrMode === "scan"
                  ? "border-dojo-gold bg-dojo-gold/15 text-dojo-gold"
                  : "border-white/15 text-dojo-mist hover:border-dojo-gold/40 hover:text-white"
              }`}
            >
              {t("signIn.scanQr")}
            </button>
          </div>
          {qrMode === "show" && (
            <div className="mt-4">
              <NostrConnectQrPanel
                onConnected={completeSignIn}
                onError={setError}
              />
            </div>
          )}
          {qrMode === "scan" && (
            <div className="mt-4">
              <NostrQrScanner onSignedIn={completeSignIn} onError={setError} />
            </div>
          )}
          <div className="mt-5 rounded-lg border border-white/10 bg-dojo-ink/40 p-4 text-left">
            <p className="text-sm font-medium text-dojo-mist/85">{t("signIn.bunkerTitle")}</p>
            <p className="mt-1 text-xs text-dojo-mist/50">{t("signIn.bunkerHint")}</p>
            <input
              type="text"
              value={bunkerInput}
              onChange={(e) => setBunkerInput(e.target.value)}
              placeholder={t("signIn.bunkerPlaceholder")}
              className="mt-3 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => void connectBunkerLink()}
              disabled={connecting || !bunkerInput.trim()}
              className="mt-3 w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white disabled:opacity-50 transition-colors"
            >
              {connecting ? t("nostr.connecting") : t("signIn.bunkerCta")}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-dojo-crimson/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-dojo-ink/30 p-5">
        <p className="text-sm font-medium text-dojo-mist/80">{t("signIn.viewPublicTitle")}</p>
        <p className="mt-1 text-xs text-dojo-mist/50">{t("signIn.viewPublicHint")}</p>
        <label htmlFor="signin-public-npub" className="sr-only">
          {t("join.npubLabel")}
        </label>
        <input
          id="signin-public-npub"
          type="text"
          value={publicNpubInput}
          onChange={(e) => setPublicNpubInput(e.target.value)}
          placeholder={t("join.npubPlaceholder")}
          className="mt-3 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={viewPublicLog}
          className="mt-3 w-full rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
        >
          {t("signIn.viewPublicCta")}
        </button>
      </div>

      <p className={`text-center text-sm text-dojo-mist/60 ${isPage ? "mt-8" : "mt-6"}`}>
        {t("signIn.noAccount")}{" "}
        <Link href="/join" className="text-dojo-gold hover:underline">
          {t("signIn.joinCta")}
        </Link>
      </p>
      {isPage && (
        <p className="mt-4 text-center text-xs text-dojo-mist/45">
          <Link href="/nostr" className="text-dojo-gold hover:underline">
            {t("nostr.loginGuideLink")}
          </Link>
        </p>
      )}
    </div>
  );
}
