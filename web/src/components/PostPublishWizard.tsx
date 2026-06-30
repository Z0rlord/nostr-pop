"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { SharePracticeVideo } from "@/components/SharePracticeVideo";
import { formatDuration } from "@/lib/practice-events";
import { practiceVideoShareUrl } from "@/lib/media-url";

type Props = {
  open: boolean;
  eventId: string;
  title: string;
  durationSec?: number;
  npub: string;
  onClose: () => void;
};

export function PostPublishWizard({
  open,
  eventId,
  title,
  durationSec,
  npub,
  onClose,
}: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const shareUrl = practiceVideoShareUrl(eventId);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function viewPracticeLog() {
    onClose();
    const el = document.getElementById("practice-log");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = `/u/${encodeURIComponent(npub)}#practice-log`;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-dojo-ink/80 backdrop-blur-sm" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-publish-title"
        tabIndex={-1}
        className="card-glow relative w-full max-w-md rounded-2xl border border-dojo-gold/30 bg-dojo-ink p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dojo-gold/15 text-2xl text-dojo-gold"
            aria-hidden
          >
            ✓
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="post-publish-title" className="font-display text-2xl text-white">
              {t("publish.wizardTitle")}
            </h2>
            <p className="mt-1 text-sm text-dojo-mist/70">{t("publish.wizardSubtitle")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-dojo-gold/5 p-4">
          <p className="font-display text-xl text-white">{title}</p>
          {durationSec !== undefined && durationSec > 0 && (
            <p className="mt-1 text-sm text-dojo-mist/60">
              {t("publish.wizardDuration", { duration: formatDuration(Math.round(durationSec)) })}
            </p>
          )}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block truncate text-sm text-dojo-gold hover:underline"
          >
            {shareUrl}
          </a>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SharePracticeVideo eventId={eventId} title={title} />
          <Link
            href={`/v/${eventId}`}
            className="inline-flex items-center justify-center rounded-full bg-dojo-crimson px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            {t("publish.wizardViewVideo")}
          </Link>
          <button
            type="button"
            onClick={viewPracticeLog}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-dojo-mist hover:border-white/35 hover:text-white transition-colors"
          >
            {t("publish.wizardViewLog")}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-dojo-gold/30 px-5 py-3 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/10 transition-colors"
        >
          {t("publish.wizardDone")}
        </button>
      </div>
    </div>
  );
}
