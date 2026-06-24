import type { Event, EventTemplate } from "nostr-tools";
import { MAX_PRACTICE_DURATION_SEC } from "@/lib/practice-events";
import { PRACTICE_HASHTAGS } from "@/lib/constants";
import {
  uploadToBlossom,
  uploadThumbnailToBlossom,
  hashFileSha256,
} from "@/lib/blossom-upload";
import { normalizeMediaUrl, blossomAndCdnUrls } from "@/lib/media-url";
import { publishPrimalMirror } from "@/lib/practice-primal-mirror";
import { signEventWithIdentity } from "@/lib/event-sign";
import { type Nip46SignerHooks, withNip46Signer } from "@/lib/nip46-auth";
import { fetchWithTimeout, throwIfAborted } from "@/lib/promise-timeout";
import type { PracticeIdentity } from "@/lib/practice-identity";

const KIND_SHORT_VIDEO = 22;
const DAY_TITLE = /\bDay\s+\d+\b/i;
export const PROBE_TIMEOUT_MS = 45_000;
const PUBLISH_RELAY_TIMEOUT_MS = 60_000;

export type VideoProbe = {
  durationSec: number;
  width: number;
  height: number;
};

export type PublishStep =
  | "connecting"
  | "hashing"
  | "signing-upload"
  | "uploading"
  | "signing-event"
  | "publishing";

export type PublishProgress = {
  step: PublishStep;
  uploadPct?: number;
  hashPct?: number;
};

export type PublishResult = {
  eventId: string;
  title: string;
};

export function validatePracticeTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Enter a title like “Day 42”.";
  if (!DAY_TITLE.test(trimmed)) {
    return "Title must include “Day” and a number (e.g. Day 42).";
  }
  return null;
}

export function probeVideo(file: File, signal?: AbortSignal): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.playsInline = true;
    video.muted = true;

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
      fn();
    };

    const onAbort = () =>
      finish(() => reject(new DOMException("Aborted", "AbortError")));

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Timed out reading video metadata. Try MP4 format, trim the clip, or re-select the file."
          )
        )
      );
    }, PROBE_TIMEOUT_MS);

    signal?.addEventListener("abort", onAbort, { once: true });

    video.onloadedmetadata = () => {
      finish(() =>
        resolve({
          durationSec: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        })
      );
    };
    video.onerror = () => {
      finish(() =>
        reject(
          new Error(
            "Could not read this video. Try MP4 format or a shorter clip."
          )
        )
      );
    };
    video.src = url;
    video.load();
  });
}

/** Grab a JPEG frame from a local video file (best-effort; used before publish). */
export function captureVideoThumbnail(
  file: File,
  signal?: AbortSignal,
  seekSec = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const THUMB_MAX_WIDTH = 1280;
    const SEEK_TIMEOUT_MS = 12_000;

    let settled = false;
    let snapped = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(seekTimer);
      signal?.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
      fn();
    };

    const onAbort = () =>
      finish(() => reject(new DOMException("Aborted", "AbortError")));

    const timer = setTimeout(() => {
      finish(() => reject(new Error("Timed out capturing thumbnail.")));
    }, PROBE_TIMEOUT_MS);

    signal?.addEventListener("abort", onAbort, { once: true });

    const snap = () => {
      if (snapped) return;
      snapped = true;
      requestAnimationFrame(() => {
        try {
          const srcW = video.videoWidth;
          const srcH = video.videoHeight;
          if (!srcW || !srcH) {
            finish(() =>
              reject(new Error("Video dimensions unavailable for thumbnail."))
            );
            return;
          }
          const scale =
            srcW > THUMB_MAX_WIDTH ? THUMB_MAX_WIDTH / srcW : 1;
          const w = Math.max(1, Math.round(srcW * scale));
          const h = Math.max(1, Math.round(srcH * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            finish(() => reject(new Error("Could not create thumbnail canvas.")));
            return;
          }
          ctx.drawImage(video, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                finish(() => reject(new Error("Thumbnail encoding failed.")));
                return;
              }
              finish(() => resolve(blob));
            },
            "image/jpeg",
            0.85
          );
        } catch (err) {
          finish(() =>
            reject(err instanceof Error ? err : new Error(String(err)))
          );
        }
      });
    };

    const seekTimer = setTimeout(() => {
      if (!snapped && video.readyState >= 2) {
        snap();
      }
    }, SEEK_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      const target =
        Number.isFinite(dur) && dur > 0
          ? Math.min(seekSec, Math.max(0.1, dur * 0.05))
          : seekSec;
      video.currentTime = target;
    };
    video.onseeked = snap;
    video.onloadeddata = () => {
      if (!snapped && video.readyState >= 2 && video.currentTime === 0) {
        snap();
      }
    };
    video.onerror = () => {
      finish(() => reject(new Error("Could not read video for thumbnail.")));
    };

    video.src = url;
    video.load();
  });
}

export function validateVideoProbe(
  probe: VideoProbe,
  maxSec = MAX_PRACTICE_DURATION_SEC
): string | null {
  if (!Number.isFinite(probe.durationSec) || probe.durationSec <= 0) {
    return "Could not determine video length.";
  }
  if (probe.durationSec > maxSec) {
    return `Video is ${Math.ceil(probe.durationSec)}s — practice clips must be ${maxSec}s or shorter. Trim the clip and try again.`;
  }
  return null;
}

async function publishToRelay(signed: Event, signal?: AbortSignal): Promise<void> {
  const res = await fetchWithTimeout(
    "/api/practice/publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: signed }),
    },
    PUBLISH_RELAY_TIMEOUT_MS,
    "Publishing timed out. Your video may still upload — wait a minute and check your log.",
    signal
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Publish failed (${res.status})`);
  }
}

async function publishPracticeAndMirror(
  signed: Event,
  signal: AbortSignal | undefined,
  sign: (template: EventTemplate) => Promise<Event>
): Promise<void> {
  await publishToRelay(signed, signal);
  try {
    await publishPrimalMirror(signed, sign);
  } catch {
    // Kind 22 is canonical; Primal mirror is best-effort for profile Media tab.
  }
}

export type PracticeLocationMeta = {
  roughLocation?: string;
  geohash?: string;
};

function buildPracticeEventTemplate(
  title: string,
  probe: VideoProbe,
  video: { url: string; sha256: string; type: string; thumbUrl?: string },
  location?: PracticeLocationMeta
): EventTemplate {
  const trimmedTitle = title.trim();
  const now = Math.floor(Date.now() / 1000);
  const { durationSec, width, height } = probe;

  const ext = video.type.includes("quicktime") ? "qt" : "mp4";
  const urls = blossomAndCdnUrls(video.sha256, ext);

  const imeta: string[] = [
    "imeta",
    `url ${normalizeMediaUrl(urls.primary) || urls.primary}`,
    `x ${video.sha256}`,
    `m ${video.type}`,
    `duration ${Math.round(durationSec)}`,
  ];
  if (urls.fallback) {
    imeta.push(`fallback ${normalizeMediaUrl(urls.fallback) || urls.fallback}`);
  }
  if (width > 0 && height > 0) {
    imeta.push(`dim ${width}x${height}`);
  }
  if (video.thumbUrl) {
    imeta.push(
      `image ${normalizeMediaUrl(video.thumbUrl) || video.thumbUrl}`
    );
  }

  const tags: string[][] = [
    ["title", trimmedTitle],
    imeta,
    ["published_at", String(now)],
    ["duration", String(Math.round(durationSec))],
    ...PRACTICE_HASHTAGS.map((tag) => ["t", tag]),
    ["alt", `Short practice video: ${trimmedTitle}`],
  ];
  if (location?.geohash) {
    tags.push(["g", location.geohash]);
  }
  if (location?.roughLocation) {
    tags.push(["location", location.roughLocation]);
  }

  return {
    kind: KIND_SHORT_VIDEO,
    created_at: now,
    tags,
    content: location?.roughLocation
      ? `${trimmedTitle}\n📍 ${location.roughLocation}`
      : trimmedTitle,
  };
}

async function resolveProbeAndHash(
  params: {
    file: File;
    videoProbe?: VideoProbe;
    sha256Hash?: string;
    npub?: string;
    location?: PracticeLocationMeta;
    signal?: AbortSignal;
    onProgress?: (progress: PublishProgress) => void;
  }
): Promise<{ probe: VideoProbe; sha256Hash: string }> {
  throwIfAborted(params.signal);
  const onStep = (step: PublishStep, extra?: Partial<PublishProgress>) =>
    params.onProgress?.({ step, ...extra });

  const probe = params.videoProbe ?? (await probeVideo(params.file, params.signal));
  const probeError = validateVideoProbe(probe);
  if (probeError) throw new Error(probeError);

  if (params.sha256Hash) {
    return { probe, sha256Hash: params.sha256Hash };
  }

  onStep("hashing", { hashPct: 0 });
  const sha256Hash = await hashFileSha256(params.file, {
    npub: params.npub,
    signal: params.signal,
    onProgress: (hashPct) => onStep("hashing", { hashPct }),
  });
  return { probe, sha256Hash };
}

type PracticeMediaUpload = {
  url: string;
  sha256: string;
  type: string;
  thumbUrl?: string;
};

async function uploadPracticeMedia(
  file: File,
  signAuth: (template: EventTemplate) => Promise<Event>,
  opts: {
    sha256Hash: string;
    signal?: AbortSignal;
    onUploading: () => void;
    onUploadProgress: (pct: number) => void;
    onUploadKeepAlive?: () => void;
  }
): Promise<PracticeMediaUpload> {
  const video = await uploadToBlossom(file, signAuth, {
    signal: opts.signal,
    sha256Hash: opts.sha256Hash,
    onUploading: opts.onUploading,
    onUploadProgress: opts.onUploadProgress,
    onUploadKeepAlive: opts.onUploadKeepAlive,
  });

  let thumbUrl: string | undefined;
  try {
    const jpeg = await captureVideoThumbnail(file, opts.signal);
    const thumb = await uploadThumbnailToBlossom(jpeg, signAuth, {
      signal: opts.signal,
      onUploadKeepAlive: opts.onUploadKeepAlive,
    });
    const urls = blossomAndCdnUrls(thumb.sha256, "jpeg");
    thumbUrl = normalizeMediaUrl(urls.primary) || urls.primary;
  } catch {
    // Best effort — matches pipeline behavior when ffmpeg thumb fails.
  }

  return { ...video, thumbUrl };
}

async function publishWithSigner(
  params: {
    file: File;
    title: string;
    videoProbe?: VideoProbe;
    sha256Hash?: string;
    npub?: string;
    location?: PracticeLocationMeta;
    signal?: AbortSignal;
    onProgress?: (progress: PublishProgress) => void;
    nip46Hooks?: Nip46SignerHooks;
    nip46Session?: NonNullable<PracticeIdentity["nip46"]>;
  },
  sign?: (template: EventTemplate) => Promise<Event>
): Promise<PublishResult> {
  throwIfAborted(params.signal);
  const onStep = (step: PublishStep, extra?: Partial<PublishProgress>) =>
    params.onProgress?.({ step, ...extra });
  const titleError = validatePracticeTitle(params.title);
  if (titleError) throw new Error(titleError);

  const uploadHooks = {
    signal: params.signal,
    onUploading: () => onStep("uploading", { uploadPct: 0 }),
    onUploadProgress: (uploadPct: number) => onStep("uploading", { uploadPct }),
  };

  if (params.nip46Session) {
    let probe = params.videoProbe;
    let sha256Hash = params.sha256Hash;

    if (!probe || !sha256Hash) {
      if (!probe && !sha256Hash) {
        const resolved = await resolveProbeAndHash(params);
        probe = resolved.probe;
        sha256Hash = resolved.sha256Hash;
      } else if (!sha256Hash) {
        throw new Error(
          "Video is still being prepared. Wait for hashing to finish, or re-select the file."
        );
      } else {
        throw new Error(
          "Video length could not be verified. Re-select the file and try again."
        );
      }
    }

    onStep("connecting");

    let result: PublishResult | undefined;
    await withNip46Signer(
      params.nip46Session,
      async (signer) => {
        onStep("signing-upload");
        const video = await uploadPracticeMedia(
          params.file,
          (template) => signer.signEvent(template),
          {
            ...uploadHooks,
            sha256Hash: sha256Hash!,
            onUploadKeepAlive: () => {
              void signer.ping().catch(() => {});
            },
          }
        );

        const template = buildPracticeEventTemplate(params.title, probe!, video, params.location);
        onStep("signing-event");
        const signed = await signer.signEvent(template);
        onStep("publishing");
        await publishPracticeAndMirror(signed, params.signal, (t) => signer.signEvent(t));
        result = { eventId: signed.id, title: params.title.trim() };
      },
      params.nip46Hooks,
      "publish"
    );
    if (!result) throw new Error("Publish did not return an event id.");
    return result;
  }

  const { probe, sha256Hash } = await resolveProbeAndHash(params);

  if (!sign) throw new Error("Signer required");
  onStep("signing-upload");
  const video = await uploadPracticeMedia(params.file, sign, {
    ...uploadHooks,
    sha256Hash,
  });
  const template = buildPracticeEventTemplate(params.title, probe, video, params.location);
  onStep("signing-event");
  const signed = await sign(template);
  onStep("publishing");
  await publishPracticeAndMirror(signed, params.signal, sign);
  return { eventId: signed.id, title: params.title.trim() };
}

export async function publishPracticeVideo(params: {
  identity: PracticeIdentity;
  file: File;
  title: string;
  videoProbe?: VideoProbe;
  sha256Hash?: string;
  location?: PracticeLocationMeta;
  signal?: AbortSignal;
  onProgress?: (progress: PublishProgress) => void;
  nip46Hooks?: Nip46SignerHooks;
}): Promise<PublishResult> {
  return publishWithSigner(
    {
      ...params,
      npub: params.identity.npub,
      location: params.location,
      nip46Session:
        params.identity.source === "nip46" ? params.identity.nip46 : undefined,
    },
    params.identity.source === "nip46"
      ? undefined
      : (template) => signEventWithIdentity(params.identity, template)
  );
}

/** Suggested next day number from existing sessions (optional). */
export function suggestDayTitle(latestDayNumber?: number): string {
  if (latestDayNumber === undefined || latestDayNumber < 1) return "Day 1";
  return `Day ${latestDayNumber + 1}`;
}
