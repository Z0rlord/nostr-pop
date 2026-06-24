"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { practiceVideoShareUrl } from "@/lib/media-url";

type Props = {
  eventId: string;
  title: string;
  compact?: boolean;
};

export function SharePracticeVideo({
  eventId,
  title: _title,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const [shared, setShared] = useState(false);
  const shareUrl = practiceVideoShareUrl(eventId);

  function flashCopied() {
    setShared(true);
    window.setTimeout(() => setShared(false), 2500);
  }

  async function copyUrl(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      return false;
    }
  }

  async function share() {
    await copyUrl();

    if (typeof navigator.share === "function") {
      try {
        const payload = { url: shareUrl };
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    flashCopied();
  }

  const label = shared ? t("share.copied") : t("share.cta");

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void share()}
        className="text-xs text-dojo-gold hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="rounded-full border border-dojo-gold/40 bg-dojo-gold/10 px-4 py-2 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/20 transition-colors"
    >
      {label}
    </button>
  );
}
