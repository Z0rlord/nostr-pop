"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { connectNip07 } from "@/lib/nip07";
import {
  attachNip46Signer,
  canSignPractice,
  type PracticeIdentity,
} from "@/lib/practice-identity";
import { connectViaBunkerInput } from "@/lib/nip46-auth";
import { NostrConnectQrPanel } from "@/components/NostrConnectQrPanel";

type Props = {
  identity: PracticeIdentity;
  onIdentityChange: (identity: PracticeIdentity) => void;
};

export function PracticeSignerConnect({ identity, onIdentityChange }: Props) {
  const { t } = useI18n();
  const [bunkerInput, setBunkerInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  if (canSignPractice(identity)) return null;

  async function connectExtension() {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectNip07();
      if (!result || result.pubkeyHex !== identity.pubkeyHex) {
        setError(t("signIn.signerWrongKey"));
        return;
      }
      onIdentityChange({
        ...identity,
        source: "extension",
      });
    } catch {
      setError(t("signIn.connectFailed"));
    } finally {
      setConnecting(false);
    }
  }

  async function connectBunker() {
    setConnecting(true);
    setError(null);
    try {
      const linked = await connectViaBunkerInput(bunkerInput);
      if (linked.pubkeyHex !== identity.pubkeyHex) {
        setError(t("signIn.signerWrongKey"));
        return;
      }
      if (!linked.nip46) {
        setError(t("signIn.connectFailed"));
        return;
      }
      onIdentityChange(attachNip46Signer(identity, linked.nip46));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("signIn.connectFailed"));
    } finally {
      setConnecting(false);
    }
  }

  function onQrConnected(linked: PracticeIdentity) {
    if (linked.pubkeyHex !== identity.pubkeyHex) {
      setError(t("signIn.signerWrongKey"));
      return;
    }
    if (!linked.nip46) {
      setError(t("signIn.connectFailed"));
      return;
    }
    onIdentityChange(attachNip46Signer(identity, linked.nip46));
  }

  return (
    <div className="rounded-xl border border-dojo-gold/30 bg-dojo-gold/10 p-5 text-sm text-dojo-mist">
      <p className="font-medium text-white">{t("signIn.signerRequiredTitle")}</p>
      <p className="mt-2 text-dojo-mist/75">{t("signIn.signerRequiredBody")}</p>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="w-full rounded-full border border-dojo-gold/40 px-4 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/15 transition-colors"
        >
          {showQr ? t("signIn.hideQr") : t("signIn.showQr")}
        </button>
        {showQr && (
          <NostrConnectQrPanel onConnected={onQrConnected} onError={setError} />
        )}

        <button
          type="button"
          onClick={() => void connectExtension()}
          disabled={connecting}
          className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-dojo-mist hover:border-white/30 hover:text-white disabled:opacity-50 transition-colors"
        >
          {connecting ? t("nostr.connecting") : t("signIn.connectExtension")}
        </button>

        <input
          type="text"
          value={bunkerInput}
          onChange={(e) => setBunkerInput(e.target.value)}
          placeholder={t("signIn.bunkerPlaceholder")}
          className="w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => void connectBunker()}
          disabled={connecting || !bunkerInput.trim()}
          className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white disabled:opacity-50 transition-colors"
        >
          {t("signIn.bunkerCta")}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
