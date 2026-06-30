"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/i18n/context";
import {
  beginNostrConnectSession,
  NIP46_CONNECT_TIMEOUT_MS,
  waitForNostrConnectSession,
  type Nip46RelayStatus,
} from "@/lib/nip46-auth";
import type { PracticeIdentity } from "@/lib/practice-identity";

type Props = {
  onConnected: (identity: PracticeIdentity) => void;
  onError: (message: string | null) => void;
};

export function NostrConnectQrPanel({ onConnected, onError }: Props) {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectionUri, setConnectionUri] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [copied, setCopied] = useState(false);
  const [relayStatus, setRelayStatus] = useState<Nip46RelayStatus | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);

  onConnectedRef.current = onConnected;
  onErrorRef.current = onError;
  tRef.current = t;

  const startSession = useCallback(() => {
    setSessionKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timedOut = false;
    const ac = new AbortController();
    const timeout = window.setTimeout(() => {
      timedOut = true;
      if (!ac.signal.aborted) ac.abort();
    }, NIP46_CONNECT_TIMEOUT_MS);

    setWaiting(true);
    setQrDataUrl(null);
    setConnectionUri(null);
    setCopied(false);
    setRelayStatus(null);
    onErrorRef.current(null);

    const { clientSecretKey, connectionUri: uri } = beginNostrConnectSession();
    setConnectionUri(uri);

    void QRCode.toDataURL(uri, {
      margin: 2,
      width: 220,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (mounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (mounted) {
          onErrorRef.current(tRef.current("signIn.qrConnectFailed"));
        }
      });

    void waitForNostrConnectSession(
      clientSecretKey,
      uri,
      ac.signal,
      undefined,
      (status) => {
        if (mounted) setRelayStatus(status);
      }
    )
      .then((identity) => {
        if (mounted) onConnectedRef.current(identity);
      })
      .catch((e) => {
        if (!mounted) return;
        if (!timedOut && ac.signal.aborted) return;
        const msg =
          e instanceof Error ? e.message : tRef.current("signIn.qrConnectFailed");
        onErrorRef.current(msg);
      })
      .finally(() => {
        if (mounted) setWaiting(false);
      });

    return () => {
      mounted = false;
      ac.abort();
      window.clearTimeout(timeout);
    };
  }, [sessionKey]);

  async function copyUri() {
    if (!connectionUri) return;
    try {
      await navigator.clipboard.writeText(connectionUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onErrorRef.current(tRef.current("signIn.qrCopyFailed"));
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-dojo-ink/50 p-5 text-center">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={t("signIn.qrAlt")}
          className="mx-auto rounded-lg bg-white p-2"
          width={220}
          height={220}
        />
      ) : (
        <div className="mx-auto flex h-[220px] w-[220px] flex-col items-center justify-center gap-3 rounded-lg bg-white/5 text-sm text-dojo-mist/50">
          <span>{t("common.loading")}</span>
          <button
            type="button"
            onClick={startSession}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {t("signIn.qrRefresh")}
          </button>
        </div>
      )}
      <p className="mt-4 text-sm text-dojo-mist/80">{t("signIn.qrScanHint")}</p>
      {waiting ? (
        <p className="mt-2 text-xs text-dojo-gold">{t("signIn.qrWaiting")}</p>
      ) : (
        <p className="mt-2 text-xs text-dojo-mist/55">{t("signIn.qrExpired")}</p>
      )}
      {relayStatus && waiting && (
        <p className="mt-2 text-xs text-dojo-mist/45">
          {relayStatus.connected.length > 0
            ? t("signIn.qrRelayOk", { count: relayStatus.connected.length })
            : t("signIn.qrRelayPending")}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={startSession}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
        >
          {t("signIn.qrRefresh")}
        </button>
        {connectionUri && (
          <button
            type="button"
            onClick={() => void copyUri()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {copied ? t("signIn.qrCopied") : t("signIn.qrCopyLink")}
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-dojo-mist/45">{t("signIn.qrPrimalHint")}</p>
    </div>
  );
}
