"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { PrimalDownloadLinks } from "@/components/PrimalDownloadLinks";
import {
  fetchPracticeSessionsForPubkey,
  MAX_PRACTICE_DURATION_SEC,
  buildPersonalStats,
} from "@/lib/practice-events";
import { formatPublishError } from "@/lib/publish-error";
import { hashFileSha256 } from "@/lib/blossom-upload";
import {
  downloadPreparedVideo,
  PREPARE_MAX_BYTES,
  prepareVideoOnServer,
} from "@/lib/prepare-upload";
import {
  probeVideo,
  publishPracticeVideo,
  suggestDayTitle,
  validatePracticeTitle,
  validateVideoProbe,
  type PublishProgress,
  type PublishResult,
  type VideoProbe,
  type PracticeLocationMeta,
} from "@/lib/practice-publish";
import type { PracticeIdentity } from "@/lib/practice-identity";
import { canSignPractice } from "@/lib/practice-identity";
import { PRACTICE_HASHTAGS, RELAY_URL } from "@/lib/constants";
import { PostPublishWizard } from "@/components/PostPublishWizard";
import { PracticeSignerConnect } from "@/components/PracticeSignerConnect";

type Props = {
  identity: PracticeIdentity;
  onSignOut?: () => void;
  onIdentityChange?: (identity: PracticeIdentity) => void;
};

type MembershipStatus = {
  active: boolean;
  registered: boolean;
  status?: string;
};

type UploadCooldownStatus = {
  allowed: boolean;
  waitSeconds: number;
  nextAllowedAt: number | null;
};

const LARGE_FILE_MB = 50;

function formatWait(seconds: number): string {
  const sec = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.ceil((sec % 3600) / 60);
  if (hours >= 2) return `${hours} hours`;
  if (hours === 1 && minutes === 0) return "1 hour";
  if (hours === 1) return `1 hour ${minutes} min`;
  if (minutes >= 2) return `${minutes} minutes`;
  if (minutes === 1) return "1 minute";
  return `${sec} seconds`;
}

export function PracticeVideoPublish({ identity, onSignOut, onIdentityChange }: Props) {
  const { t } = useI18n();
  const fileInputId = useId();
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [uploadCooldown, setUploadCooldown] = useState<UploadCooldownStatus | null>(null);
  const [title, setTitle] = useState("Day 1");
  const [file, setFile] = useState<File | null>(null);
  const [videoProbe, setVideoProbe] = useState<VideoProbe | null>(null);
  const [fileSha256, setFileSha256] = useState<string | null>(null);
  const [hashPct, setHashPct] = useState(0);
  const [probing, setProbing] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [primalAuthUrl, setPrimalAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [publishedResult, setPublishedResult] = useState<PublishResult | null>(null);
  const [publishedDurationSec, setPublishedDurationSec] = useState<number | undefined>();
  const [showPrimalGuide, setShowPrimalGuide] = useState(false);
  const [locationMeta, setLocationMeta] = useState<PracticeLocationMeta | undefined>();
  const [metadataStripped, setMetadataStripped] = useState(false);
  const publishAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/membership/status?npub=${encodeURIComponent(identity.npub)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setMembership(data as MembershipStatus);
      })
      .catch(() => {
        if (!cancelled) setMembership(null);
      });
    return () => {
      cancelled = true;
    };
  }, [identity.npub]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/practice/upload-status?npub=${encodeURIComponent(identity.npub)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setUploadCooldown({
            allowed: Boolean((data as UploadCooldownStatus).allowed),
            waitSeconds: Number((data as UploadCooldownStatus).waitSeconds) || 0,
            nextAllowedAt: (data as UploadCooldownStatus).nextAllowedAt ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setUploadCooldown(null);
      });
    return () => {
      cancelled = true;
    };
  }, [identity.npub, wizardOpen]);

  useEffect(() => {
    let cancelled = false;
    fetchPracticeSessionsForPubkey(identity.pubkeyHex)
      .then((sessions) => {
        if (cancelled) return;
        const stats = buildPersonalStats(sessions);
        setTitle(suggestDayTitle(stats.latestDayNumber));
      })
      .catch(() => {
        /* keep default title */
      });
    return () => {
      cancelled = true;
    };
  }, [identity.pubkeyHex]);

  const memberActive = membership?.active === true;
  const cooldownBlocked =
    uploadCooldown !== null && uploadCooldown.allowed === false;
  const canPublish = memberActive && !cooldownBlocked && canSignPractice(identity);
  const titleError = title.trim() ? validatePracticeTitle(title) : null;
  const videoError = videoProbe ? validateVideoProbe(videoProbe) : null;
  const fileMb = file ? file.size / (1024 * 1024) : 0;

  function publishDisabledReason(): string | null {
    if (cooldownBlocked && uploadCooldown) {
      return t("publish.disabledCooldown", {
        wait: formatWait(uploadCooldown.waitSeconds),
      });
    }
    if (titleError) return titleError;
    if (videoError) return videoError;
    if (!file) return t("publish.disabledPickVideo");
    if (hashing) return t("publish.preparingVideo", { pct: String(hashPct) });
    if (file && !fileSha256) return t("publish.preparingVideo", { pct: "0" });
    return null;
  }

  function publishButtonLabel(): string {
    if (publishing) {
      return publishProgress
        ? progressLabel(publishProgress)
        : t("publish.uploading");
    }
    if (cooldownBlocked && uploadCooldown) {
      return t("publish.ctaCooldown", {
        wait: formatWait(uploadCooldown.waitSeconds),
      });
    }
    if (hashing) {
      return t("publish.preparingVideo", { pct: String(hashPct) });
    }
    return t("publish.cta");
  }

  const disabledReason = publishDisabledReason();

  async function onFileSelected(next: File | null) {
    publishAbortRef.current?.abort();
    setFile(next);
    setVideoProbe(null);
    setFileSha256(null);
    setHashPct(0);
    setWizardOpen(false);
    setPublishedResult(null);
    setLocationMeta(undefined);
    setMetadataStripped(false);
    setError(null);
    if (!next) return;

    const fileAbort = new AbortController();
    publishAbortRef.current = fileAbort;

    setProbing(true);
    try {
      const probe = await probeVideo(next, fileAbort.signal);
      setVideoProbe(probe);
      const probeErr = validateVideoProbe(probe);
      if (probeErr) {
        setError(probeErr);
        return;
      }

      setProbing(false);
      setHashing(true);

      const canUseServerPrepare = next.size <= PREPARE_MAX_BYTES;
      if (canUseServerPrepare) {
        try {
          const prepared = await prepareVideoOnServer(next, identity.npub, {
            signal: fileAbort.signal,
            onProgress: (pct) => setHashPct(Math.round(pct * 0.45)),
          });
          setFileSha256(prepared.sha256);
          setMetadataStripped(Boolean(prepared.metadataStripped));
          if (prepared.roughLocation) {
            setLocationMeta({
              roughLocation: prepared.roughLocation.label,
              geohash: prepared.roughLocation.geohash,
            });
          }

          if (prepared.metadataStripped) {
            const blob = await downloadPreparedVideo(prepared.token, identity.npub, {
              signal: fileAbort.signal,
              onProgress: (pct) => setHashPct(45 + Math.round(pct * 0.55)),
            });
            const stripped = new File([blob], prepared.filename, {
              type: prepared.mime,
            });
            setFile(stripped);
          } else {
            setHashPct(100);
          }
          return;
        } catch (e) {
          if (fileAbort.signal.aborted) return;
          /* fall through to client-side hash */
        }
      }

      const hash = await hashFileSha256(next, {
        npub: identity.npub,
        signal: fileAbort.signal,
        onProgress: (pct) => setHashPct(pct),
      });
      setFileSha256(hash);
    } catch (e) {
      if (fileAbort.signal.aborted) return;
      setError(formatPublishError(e, t("publish.probeFailed")));
    } finally {
      setProbing(false);
      setHashing(false);
      if (publishAbortRef.current === fileAbort) {
        publishAbortRef.current = null;
      }
    }
  }

  function progressLabel(progress: PublishProgress): string {
    const key = `publish.step_${progress.step}` as const;
    const label = t(key);
    if (progress.step === "hashing" && progress.hashPct !== undefined) {
      return t("publish.preparingVideo", { pct: String(progress.hashPct) });
    }
    if (progress.step === "uploading" && progress.uploadPct !== undefined) {
      return `${label} ${progress.uploadPct}%`;
    }
    return label;
  }

  function cancelPublish() {
    publishAbortRef.current?.abort();
    publishAbortRef.current = null;
    setPublishing(false);
    setPublishProgress(null);
    setPrimalAuthUrl(null);
    setError(t("publish.cancelled"));
  }

  async function onPublish() {
    if (!file || !canPublish || titleError || videoError) return;
    if (!fileSha256) {
      setError(t("publish.hashIncomplete"));
      return;
    }
    if (!videoProbe) {
      setError(t("publish.probeIncomplete"));
      return;
    }

    const abort = new AbortController();
    publishAbortRef.current = abort;

    setPublishing(true);
    setPublishProgress(null);
    setPrimalAuthUrl(null);
    setError(null);
    setWizardOpen(false);
    setPublishedResult(null);
    try {
      const result = await publishPracticeVideo({
        identity,
        file,
        title,
        videoProbe,
        sha256Hash: fileSha256,
        signal: abort.signal,
        onProgress: setPublishProgress,
        nip46Hooks: {
          onAuthUrl: (url) => setPrimalAuthUrl(url),
        },
        location: locationMeta,
      });
      setPublishedDurationSec(videoProbe.durationSec);
      setPublishedResult(result);
      setWizardOpen(true);
      setFile(null);
      setVideoProbe(null);
      setFileSha256(null);
      setHashPct(0);
      fetchPracticeSessionsForPubkey(identity.pubkeyHex)
        .then((sessions) => {
          const stats = buildPersonalStats(sessions);
          setTitle(suggestDayTitle(stats.latestDayNumber));
        })
        .catch(() => {
          /* keep current title */
        });
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(formatPublishError(e, t("publish.failed")));
      }
    } finally {
      if (publishAbortRef.current === abort) {
        publishAbortRef.current = null;
      }
      setPublishing(false);
      setPublishProgress(null);
    }
  }

  return (
    <>
      {publishedResult && (
        <PostPublishWizard
          open={wizardOpen}
          eventId={publishedResult.eventId}
          title={publishedResult.title}
          durationSec={publishedDurationSec}
          npub={identity.npub}
          onClose={() => setWizardOpen(false)}
        />
      )}
    <section
      id="publish"
      className="card-glow scroll-mt-24 rounded-2xl border border-dojo-gold/25 bg-dojo-gold/5 p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-white">{t("publish.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-dojo-mist/70">{t("publish.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrimalGuide((v) => !v)}
          className="shrink-0 text-sm text-dojo-gold hover:underline"
        >
          {showPrimalGuide ? t("publish.hidePrimalGuide") : t("publish.showPrimalGuide")}
        </button>
      </div>

      {showPrimalGuide && (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-dojo-ink/40 p-5">
          <PrimalDownloadLinks variant="card" />
          <ol className="list-decimal space-y-2 pl-5 text-sm text-dojo-mist/75">
            <li>{t("publish.primalStep1")}</li>
            <li>{t("publish.primalStep2", { max: String(MAX_PRACTICE_DURATION_SEC) })}</li>
            <li>
              {t("publish.primalStep3", {
                tags: PRACTICE_HASHTAGS.map((x) => `#${x}`).join(" "),
              })}
            </li>
            <li>{t("publish.primalStep4", { relay: RELAY_URL })}</li>
          </ol>
        </div>
      )}

      {!membership ? null : !memberActive ? (
        <div className="mt-6 rounded-xl border border-dojo-crimson/30 bg-dojo-crimson/10 p-5 text-sm text-dojo-mist">
          <p>{t("publish.membershipRequired")}</p>
          <Link
            href="/join"
            className="mt-3 inline-block rounded-full bg-dojo-crimson px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            {t("signIn.joinCta")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {onIdentityChange && (
            <PracticeSignerConnect
              identity={identity}
              onIdentityChange={onIdentityChange}
            />
          )}
          {cooldownBlocked && uploadCooldown && (
            <div className="rounded-xl border border-dojo-gold/30 bg-dojo-gold/10 p-5 text-sm text-dojo-mist">
              <p>{t("publish.dailyLimit", { wait: formatWait(uploadCooldown.waitSeconds) })}</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="practice-title" className="text-sm font-medium text-white">
                {t("publish.titleLabel")}
              </label>
              <p className="mt-1 text-xs text-dojo-mist/50">{t("publish.titleHint")}</p>
              <input
                id="practice-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-dojo-ink px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-dojo-gold/50 focus:outline-none"
                autoComplete="off"
              />
              {titleError && (
                <p className="mt-2 text-xs text-red-300" role="alert">
                  {titleError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={fileInputId} className="text-sm font-medium text-white">
                {t("publish.videoLabel")}
              </label>
              <p className="mt-1 text-xs text-dojo-mist/50">
                {t("publish.videoHint", { max: String(MAX_PRACTICE_DURATION_SEC) })}
              </p>
              <input
                id={fileInputId}
                type="file"
                accept="video/*"
                onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm text-dojo-mist/70 file:mr-3 file:rounded-full file:border-0 file:bg-dojo-crimson file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-red-700"
              />
              {file && (
                <p className="mt-2 text-xs text-dojo-mist/55">
                  {file.name} · {fileMb.toFixed(1)} MB
                  {videoProbe && (
                    <>
                      {" "}
                      · {Math.ceil(videoProbe.durationSec)}s
                    </>
                  )}
                  {probing && ` · ${t("publish.checkingVideo")}`}
                  {hashing && ` · ${t("publish.preparingVideo", { pct: String(hashPct) })}`}
                  {!probing && !hashing && fileSha256 && ` · ${t("publish.videoReady")}`}
                </p>
              )}
              {file && fileMb >= LARGE_FILE_MB && (
                <p className="mt-2 text-xs text-dojo-gold/85">
                  {t("publish.largeFileHint", { mb: String(Math.round(fileMb)) })}
                </p>
              )}
              {videoError && !error && (
                <p className="mt-2 text-xs text-red-300" role="alert">
                  {videoError}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-dojo-mist/50">
            {t("publish.tagsHint", {
              tags: PRACTICE_HASHTAGS.map((x) => `#${x}`).join(" "),
            })}
          </p>

          {file && metadataStripped && (
            <p className="text-xs text-dojo-mist/55">{t("publish.metadataStripped")}</p>
          )}
          {locationMeta?.roughLocation && (
            <p className="text-xs text-dojo-gold/85">
              {t("publish.locationTag", { place: locationMeta.roughLocation })}
            </p>
          )}

          {identity.source === "nip46" && (
            <p className="text-xs text-dojo-gold/80">{t("publish.primalApproveHint")}</p>
          )}

          {primalAuthUrl && (publishing || error) && (
            <div className="rounded-xl border border-dojo-gold/40 bg-dojo-gold/10 p-4 text-sm">
              <p className="font-medium text-dojo-gold">{t("publish.primalOpenTitle")}</p>
              <p className="mt-1 text-dojo-mist/75">{t("publish.primalOpenBody")}</p>
              <a
                href={primalAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-full bg-dojo-gold px-5 py-2 text-sm font-medium text-dojo-ink"
              >
                {t("publish.primalOpenCta")}
              </a>
            </div>
          )}

          {publishProgress && (
            <div className="space-y-2">
              <p className="text-sm text-dojo-mist/70">{progressLabel(publishProgress)}</p>
              {publishProgress.step === "hashing" &&
                publishProgress.hashPct !== undefined && (
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-dojo-gold transition-all duration-300"
                      style={{ width: `${publishProgress.hashPct}%` }}
                    />
                  </div>
                )}
              {publishProgress.step === "uploading" &&
                publishProgress.uploadPct !== undefined && (
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-dojo-gold transition-all duration-300"
                      style={{ width: `${publishProgress.uploadPct}%` }}
                    />
                  </div>
                )}
            </div>
          )}

          {error && (
            <div
              className="rounded-lg bg-dojo-crimson/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              <p>{error}</p>
              {identity.source === "nip46" && onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-3 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white hover:border-white/40 transition-colors"
                >
                  {t("publish.signOutRetry")}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void onPublish()}
                disabled={
                  !canPublish ||
                  publishing ||
                  probing ||
                  hashing ||
                  !file ||
                  !fileSha256 ||
                  !!titleError ||
                  !!videoError
                }
                className="rounded-full bg-dojo-crimson px-8 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {publishButtonLabel()}
              </button>
              {publishing && (
                <button
                  type="button"
                  onClick={cancelPublish}
                  className="text-sm text-dojo-mist/60 hover:text-white transition-colors"
                >
                  {t("publish.cancel")}
                </button>
              )}
            </div>
            {disabledReason && !publishing && (
              <p className="text-sm text-dojo-gold/90" role="status">
                {disabledReason}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <PrimalDownloadLinks />
      </div>
    </section>
    </>
  );
}
