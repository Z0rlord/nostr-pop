"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";
import { useRouter } from "next/navigation";
import { connectViaQrPayload } from "@/lib/nip46-auth";
import { isValidNpub } from "@/lib/nostr";
import { savePracticeIdentity, type PracticeIdentity } from "@/lib/practice-identity";

type Props = {
  onSignedIn: (identity: PracticeIdentity) => void;
  onError: (message: string | null) => void;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

export function NostrQrScanner({ onSignedIn, onError }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scanned = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const handlePayload = useCallback(
    async (raw: string) => {
      if (scanned.current || processing) return;
      scanned.current = true;
      setProcessing(true);
      stopCamera();
      try {
        const value = raw.trim();
        if (value.startsWith("npub1") && isValidNpub(value)) {
          router.push(`/u/${value}`);
          return;
        }
        const identity = await connectViaQrPayload(value);
        savePracticeIdentity(identity);
        onSignedIn(identity);
      } catch (e) {
        scanned.current = false;
        if (e instanceof Error && e.message === "NPUB_ONLY") {
          onError(t("signIn.npubQrNotLogin"));
          return;
        }
        onError(e instanceof Error ? e.message : t("signIn.qrScanFailed"));
      } finally {
        setProcessing(false);
      }
    },
    [onError, onSignedIn, processing, router, stopCamera, t]
  );

  const startCamera = useCallback(async () => {
    setProcessing(false);
    scanned.current = false;
    onError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      onError(t("signIn.cameraDenied"));
    }
  }, [onError, t]);

  useEffect(() => {
    if (!active || !videoRef.current) return;

    const Detector = (
      window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
    ).BarcodeDetector;
    if (!Detector) {
      onError(t("signIn.cameraUnsupported"));
      stopCamera();
      return;
    }

    const detector = new Detector({ formats: ["qr_code"] });
    let raf = 0;

    const tick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        raf = requestAnimationFrame(tick);
        return;
      }
      try {
        const codes = await detector.detect(video);
        const value = codes[0]?.rawValue;
        if (value) {
          await handlePayload(value);
          return;
        }
      } catch {
        /* keep scanning */
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, handlePayload, onError, stopCamera, t]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-3">
      {!active ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={processing}
          className="w-full rounded-full border border-dojo-gold/40 bg-dojo-gold/10 px-6 py-3 font-medium text-dojo-gold hover:bg-dojo-gold/20 disabled:opacity-50 transition-colors"
        >
          {t("signIn.openCamera")}
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            playsInline
            muted
          />
        </div>
      )}
      {active && (
        <button
          type="button"
          onClick={stopCamera}
          className="w-full text-sm text-dojo-mist/60 hover:text-white transition-colors"
        >
          {t("signIn.closeCamera")}
        </button>
      )}
      <p className="text-xs text-dojo-mist/50">{t("signIn.cameraHint")}</p>
    </div>
  );
}
