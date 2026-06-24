import { throwIfAborted } from "@/lib/promise-timeout";

/** Cloudflare tunnel body limit — larger files skip server prepare and hash client-side. */
export const PREPARE_MAX_BYTES = 95 * 1024 * 1024;
export const PREPARE_UPLOAD_TIMEOUT_MS = 300_000;
export const PREPARE_DOWNLOAD_TIMEOUT_MS = 300_000;

export type PreparedVideoMeta = {
  token: string;
  sha256: string;
  filename: string;
  mime: string;
  metadataStripped?: boolean;
  roughLocation?: { label: string; geohash: string };
};

export type TransferProgressHooks = {
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
};

function parseApiError(status: number, text: string): string {
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    /* use raw */
  }
  return text.slice(0, 240) || `HTTP ${status}`;
}

function xhrUpload<T>(
  url: string,
  body: FormData,
  parse: (xhr: XMLHttpRequest) => T,
  hooks: TransferProgressHooks | undefined,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    throwIfAborted(hooks?.signal);
    const xhr = new XMLHttpRequest();

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    hooks?.signal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

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
          resolve(parse(xhr));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }
      reject(
        new Error(
          `Prepare failed (${xhr.status}): ${parseApiError(xhr.status, xhr.responseText)}`
        )
      );
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      reject(new Error("Network error during prepare. Use Wi‑Fi and try again."));
    };
    xhr.onabort = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      if (hooks?.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      reject(new Error("Prepare upload was interrupted."));
    };

    xhr.open("POST", url);
    xhr.send(body);
  });
}

function xhrDownloadBlob(
  url: string,
  hooks: TransferProgressHooks | undefined,
  timeoutMs: number,
  timeoutMessage: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    throwIfAborted(hooks?.signal);
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    hooks?.signal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    xhr.onprogress = (event) => {
      if (event.lengthComputable && hooks?.onProgress) {
        hooks.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        hooks?.onProgress?.(100);
        resolve(xhr.response as Blob);
        return;
      }
      reject(
        new Error(
          `Could not download prepared video (${xhr.status}): ${parseApiError(xhr.status, "")}`
        )
      );
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      reject(new Error("Network error downloading prepared video. Use Wi‑Fi and try again."));
    };
    xhr.onabort = () => {
      clearTimeout(timer);
      hooks?.signal?.removeEventListener("abort", onAbort);
      if (hooks?.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      reject(new Error("Prepared video download was interrupted."));
    };

    xhr.open("GET", url);
    xhr.send();
  });
}

/** Upload video for server-side metadata strip + hash (with upload progress). */
export async function prepareVideoOnServer(
  file: File,
  npub: string,
  hooks?: TransferProgressHooks
): Promise<PreparedVideoMeta> {
  const form = new FormData();
  form.append("file", file);
  const url = `/api/blossom/prepare?npub=${encodeURIComponent(npub)}`;

  return xhrUpload(
    url,
    form,
    (xhr) => JSON.parse(xhr.responseText) as PreparedVideoMeta,
    hooks,
    PREPARE_UPLOAD_TIMEOUT_MS,
    "Prepare timed out. Use Wi‑Fi, try MP4 format, or re-select a shorter clip."
  );
}

/** Download metadata-stripped video from server prepare cache. */
export async function downloadPreparedVideo(
  token: string,
  npub: string,
  hooks?: TransferProgressHooks
): Promise<Blob> {
  const url = `/api/blossom/prepared/${token}?npub=${encodeURIComponent(npub)}`;
  return xhrDownloadBlob(
    url,
    hooks,
    PREPARE_DOWNLOAD_TIMEOUT_MS,
    "Downloading prepared video timed out. Use Wi‑Fi and try again."
  );
}
