import type { Event, EventTemplate } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha2.js";
import { BLOSSOM_URL } from "@/lib/constants";
import { normalizeMediaUrl } from "@/lib/media-url";
import { NIP46_SIGN_TIMEOUT_MS } from "@/lib/nip46-auth";
import {
  fetchWithTimeout,
  throwIfAborted,
  withTimeout,
} from "@/lib/promise-timeout";

const CLIENT_HASH_TIMEOUT_MS = 120_000;
const SERVER_HASH_TIMEOUT_MS = 300_000;
const HASH_FETCH_TIMEOUT_MS = 30_000;
const HASH_READ_CHUNK_TIMEOUT_MS = 45_000;
const HASH_SLICE_TIMEOUT_MS = 45_000;
const UPLOAD_HEAD_TIMEOUT_MS = 30_000;
const UPLOAD_PUT_TIMEOUT_MS = 600_000;
/** Membership check + Blossom HEAD preflight (small request). */
const UPLOAD_PROXY_URL = "/api/blossom/upload";
/** Large video bodies go direct to Blossom — avoids Cloudflare ~100 MB limit on dojopop.live. */
const BLOSSOM_PUT_URL = `${BLOSSOM_URL.replace(/\/$/, "")}/upload`;
const HASH_URL = "/api/blossom/hash";

export type HashProgressHooks = {
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
  /** When set, iOS MOV / client failures fall back to server-side hashing. */
  npub?: string;
};

function digestHex(digest: Uint8Array): string {
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } })
      .scheduler;
    if (sched?.yield) {
      void sched.yield().then(resolve);
      return;
    }
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => resolve(), { timeout: 16 });
      return;
    }
    setTimeout(resolve, 0);
  });
}

function isLikelyProblematicIosVideo(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMov =
    /\.mov$/i.test(file.name) ||
    file.type === "video/quicktime" ||
    file.type === "video/mov";
  return isIOS && isMov;
}

function parseHashApiError(status: number, text: string): string {
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    /* use raw */
  }
  return text.slice(0, 240) || `HTTP ${status}`;
}

function hashViaServer(
  file: File,
  npub: string,
  hooks?: HashProgressHooks
): Promise<string> {
  return new Promise((resolve, reject) => {
    throwIfAborted(hooks?.signal);
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    const url = `${HASH_URL}?npub=${encodeURIComponent(npub)}`;

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    hooks?.signal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      xhr.abort();
      reject(
        new Error(
          "Server hashing timed out. Use Wi‑Fi, try MP4 format, or re-select the video."
        )
      );
    }, SERVER_HASH_TIMEOUT_MS);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && hooks?.onProgress) {
        hooks.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { sha256?: string };
          if (!data.sha256) {
            reject(new Error("Server hash response was invalid."));
            return;
          }
          hooks?.onProgress?.(100);
          resolve(data.sha256);
        } catch {
          reject(new Error("Server hash response was invalid."));
        }
        return;
      }
      reject(
        new Error(
          `Server hashing failed (${xhr.status}): ${parseHashApiError(xhr.status, xhr.responseText)}`
        )
      );
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      reject(new Error("Network error during server hashing. Stay on Wi‑Fi and try again."));
    };
    xhr.onabort = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      if (hooks?.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      reject(new Error("Server hashing was interrupted."));
    };

    xhr.open("POST", url);
    xhr.send(form);
  });
}

/**
 * Streamed SHA-256 via blob URL + fetch reader.
 * Avoids blob.slice().arrayBuffer() which hangs on iOS MOV picks.
 */
export async function hashBlobSha256(
  blob: Blob,
  hooks?: HashProgressHooks
): Promise<string> {
  throwIfAborted(hooks?.signal);
  const total = blob.size;
  if (total === 0) {
    return digestHex(sha256(new Uint8Array()));
  }

  const url = URL.createObjectURL(blob);
  try {
    const response = await fetchWithTimeout(
      url,
      undefined,
      HASH_FETCH_TIMEOUT_MS,
      "Could not read video file for hashing. Try MP4 format or re-select the file.",
      hooks?.signal
    );
    if (!response.ok) {
      throw new Error(`Could not read video file (HTTP ${response.status}).`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return hashBlobSha256Chunked(blob, hooks);
    }

    const hasher = sha256.create();
    let read = 0;
    hooks?.onProgress?.(0);
    await yieldToMain();

    while (true) {
      throwIfAborted(hooks?.signal);
      const { value, done } = await withTimeout(
        reader.read(),
        HASH_READ_CHUNK_TIMEOUT_MS,
        "Hashing stalled reading the video. Try MP4 format, use Wi‑Fi, or re-select the file.",
        hooks?.signal
      );
      if (done) break;
      if (value?.length) {
        hasher.update(value);
        read += value.length;
        hooks?.onProgress?.(Math.min(99, Math.round((read / total) * 100)));
        await yieldToMain();
      }
    }

    hooks?.onProgress?.(100);
    return digestHex(hasher.digest());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fallback when ReadableStream is unavailable. */
async function hashBlobSha256Chunked(
  blob: Blob,
  hooks?: HashProgressHooks
): Promise<string> {
  const chunkBytes = 512 * 1024;
  const hasher = sha256.create();
  let offset = 0;
  const total = blob.size;
  hooks?.onProgress?.(0);

  while (offset < total) {
    throwIfAborted(hooks?.signal);
    const slice = blob.slice(offset, offset + chunkBytes);
    const buf = await withTimeout(
      slice.arrayBuffer(),
      HASH_SLICE_TIMEOUT_MS,
      "Hashing stalled on this video format. Try MP4 or use Wi‑Fi.",
      hooks?.signal
    );
    hasher.update(new Uint8Array(buf));
    offset += chunkBytes;
    hooks?.onProgress?.(Math.min(99, Math.round((Math.min(offset, total) / total) * 100)));
    await yieldToMain();
  }

  hooks?.onProgress?.(100);
  return digestHex(hasher.digest());
}

async function hashFileSha256Client(
  file: File,
  hooks?: HashProgressHooks
): Promise<string> {
  return withTimeout(
    hashBlobSha256(file, hooks),
    CLIENT_HASH_TIMEOUT_MS,
    "Hashing timed out. Try a shorter clip, use Wi‑Fi, or re-select the video file.",
    hooks?.signal
  );
}

export async function hashFileSha256(
  file: File,
  hooks?: HashProgressHooks
): Promise<string> {
  throwIfAborted(hooks?.signal);

  if (hooks?.npub && isLikelyProblematicIosVideo(file)) {
    try {
      return await hashViaServer(file, hooks.npub, hooks);
    } catch (serverErr) {
      if (hooks.signal?.aborted) throw serverErr;
      try {
        return await hashFileSha256Client(file, hooks);
      } catch {
        throw serverErr;
      }
    }
  }

  try {
    return await hashFileSha256Client(file, hooks);
  } catch (clientErr) {
    if (hooks?.signal?.aborted) throw clientErr;
    if (!hooks?.npub) throw clientErr;
    return hashViaServer(file, hooks.npub, hooks);
  }
}

function nostrAuthHeader(event: Event): string {
  return `Nostr ${btoa(JSON.stringify(event))}`;
}

export type BlossomDescriptor = {
  url: string;
  sha256: string;
  type: string;
};

function parseApiError(status: number, text: string): string {
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    /* use raw text */
  }
  return text.slice(0, 240) || `HTTP ${status}`;
}

function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
  onKeepAlive?: () => void,
  signal?: AbortSignal
): Promise<BlossomDescriptor> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const keepAlive =
      onKeepAlive &&
      setInterval(() => {
        onKeepAlive();
      }, 25_000);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    const timer = setTimeout(() => {
      xhr.abort();
      reject(
        new Error(
          "Upload timed out. Stay on Wi‑Fi, keep this page open, and try again."
        )
      );
    }, UPLOAD_PUT_TIMEOUT_MS);

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      clearTimeout(timer);
      if (keepAlive) clearInterval(keepAlive);
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as BlossomDescriptor);
        } catch {
          reject(new Error("Blossom returned an invalid response."));
        }
        return;
      }
      reject(
        new Error(
          `Upload failed (${xhr.status}): ${parseApiError(xhr.status, xhr.responseText)}`
        )
      );
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      if (keepAlive) clearInterval(keepAlive);
      signal?.removeEventListener("abort", onAbort);
      reject(
        new Error(
          "Network error during upload. Stay on Wi‑Fi, keep this page open, and try again. Very large clips may need trimming in Photos before upload."
        )
      );
    };
    xhr.onabort = () => {
      clearTimeout(timer);
      if (keepAlive) clearInterval(keepAlive);
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      reject(new Error("Upload cancelled."));
    };
    xhr.send(body);
  });
}

async function uploadBlobToBlossom(
  blob: Blob,
  contentType: string,
  fileLabel: string,
  signAuth: (template: EventTemplate) => Promise<Event>,
  hooks?: {
    onUploading?: () => void;
    onUploadProgress?: (pct: number) => void;
    onUploadKeepAlive?: () => void;
    sha256Hash?: string;
    signal?: AbortSignal;
  }
): Promise<BlossomDescriptor> {
  throwIfAborted(hooks?.signal);
  const sha256Hash =
    hooks?.sha256Hash ??
    (await hashBlobSha256(blob, {
      signal: hooks?.signal,
      onProgress: () => {},
    }));
  const now = Math.floor(Date.now() / 1000);

  const authEvent = await withTimeout(
    signAuth({
      kind: 24242,
      created_at: now,
      tags: [
        ["t", "upload"],
        ["x", sha256Hash],
        ["expiration", String(now + 600)],
      ],
      content: `Upload ${fileLabel}`,
    }),
    NIP46_SIGN_TIMEOUT_MS,
    "Timed out waiting for upload approval. Open your signer and approve, then try again.",
    hooks?.signal
  );

  const authHeaders = {
    Authorization: nostrAuthHeader(authEvent),
    "X-SHA-256": sha256Hash,
    "X-Content-Length": String(blob.size),
    "X-Content-Type": contentType,
  };

  const head = await fetchWithTimeout(
    UPLOAD_PROXY_URL,
    { method: "HEAD", headers: authHeaders },
    UPLOAD_HEAD_TIMEOUT_MS,
    "Upload check timed out. Check your connection and try again.",
    hooks?.signal
  );
  if (!head.ok && head.status !== 404 && head.status !== 405) {
    const reason = head.headers.get("x-reason");
    let detail = reason || head.statusText;
    if (!reason) {
      try {
        const data = (await head.json()) as { error?: string };
        if (data.error) detail = data.error;
      } catch {
        /* HEAD may have no JSON body */
      }
    }
    throw new Error(`Upload not allowed (${head.status}): ${detail}`);
  }

  hooks?.onUploading?.();
  const descriptor = await putWithProgress(
    BLOSSOM_PUT_URL,
    blob,
    {
      Authorization: authHeaders.Authorization,
      "Content-Type": contentType,
      "Content-Length": String(blob.size),
    },
    hooks?.onUploadProgress,
    hooks?.onUploadKeepAlive,
    hooks?.signal
  );

  if (descriptor.sha256 !== sha256Hash) {
    throw new Error("Blossom returned an unexpected file hash.");
  }
  return {
    ...descriptor,
    url: normalizeMediaUrl(descriptor.url) || descriptor.url,
  };
}

export async function uploadToBlossom(
  file: File,
  signAuth: (template: EventTemplate) => Promise<Event>,
  hooks?: {
    onHashing?: () => void;
    onUploading?: () => void;
    onUploadProgress?: (pct: number) => void;
    /** When set, skip hashing (call hashFileSha256 before opening a NIP-46 signer). */
    sha256Hash?: string;
    /** Ping NIP-46 bunker during long uploads so the relay session stays warm. */
    onUploadKeepAlive?: () => void;
    signal?: AbortSignal;
  }
): Promise<BlossomDescriptor> {
  hooks?.onHashing?.();
  return uploadBlobToBlossom(
    file,
    file.type || "video/mp4",
    file.name,
    signAuth,
    {
      ...hooks,
      sha256Hash: hooks?.sha256Hash,
    }
  );
}

export async function uploadThumbnailToBlossom(
  jpeg: Blob,
  signAuth: (template: EventTemplate) => Promise<Event>,
  hooks?: {
    onUploadKeepAlive?: () => void;
    signal?: AbortSignal;
  }
): Promise<BlossomDescriptor> {
  return uploadBlobToBlossom(jpeg, "image/jpeg", "practice-thumb.jpg", signAuth, hooks);
}
