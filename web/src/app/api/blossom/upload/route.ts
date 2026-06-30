import { NextRequest, NextResponse } from "next/server";
import {
  assertActiveMemberPubkey,
  parseNostrAuthHeader,
  UploadAuthError,
} from "@/lib/blossom-auth";
import {
  assertCanUploadPracticeVideo,
  PracticeUploadLimitError,
} from "@/lib/practice-upload-limit";
import { normalizeMediaUrl } from "@/lib/media-url";

export const runtime = "nodejs";
export const maxDuration = 300;

function blossomOrigins(): string[] {
  const origins: string[] = [];
  const internal = process.env.BLOSSOM_INTERNAL_URL?.replace(/\/$/, "");
  const publicUrl =
    process.env.NEXT_PUBLIC_BLOSSOM_URL?.replace(/\/$/, "") ||
    "https://blossom.dojopop.live";
  if (internal) origins.push(internal);
  if (!origins.includes(publicUrl)) origins.push(publicUrl);
  return origins;
}

function forwardAuthHeaders(req: NextRequest): Headers {
  const out = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) out.set("Authorization", auth);
  for (const name of ["x-sha-256", "x-content-length", "x-content-type"] as const) {
    const value = req.headers.get(name);
    if (value) out.set(name, value);
  }
  // Blossom builds descriptor URLs from the request — force public HTTPS host.
  out.set("Host", "blossom.dojopop.live");
  out.set("X-Forwarded-Proto", "https");
  return out;
}

function rewriteBlossomDescriptorBody(text: string): string {
  try {
    const data = JSON.parse(text) as { url?: string };
    if (typeof data.url === "string") {
      data.url = normalizeMediaUrl(data.url) || data.url;
    }
    return JSON.stringify(data);
  } catch {
    return text;
  }
}

function apiError(status: number, message: string): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Reason": message,
    },
  });
}

async function authorize(req: NextRequest): Promise<string> {
  const event = parseNostrAuthHeader(req.headers.get("authorization"));
  await assertActiveMemberPubkey(event.pubkey);
  await assertCanUploadPracticeVideo(event.pubkey);
  return event.pubkey;
}

async function fetchBlossomUpload(
  method: "HEAD" | "PUT",
  headers: Headers,
  body?: ReadableStream<Uint8Array> | null
): Promise<Response> {
  let lastError: unknown;

  for (const origin of blossomOrigins()) {
    try {
      const init: RequestInit & { duplex?: "half" } = {
        method,
        headers,
      };
      if (method === "PUT" && body) {
        init.body = body;
        init.duplex = "half";
      }
      return await fetch(`${origin}/upload`, init);
    } catch (e) {
      lastError = e;
      console.error(`blossom ${method} via ${origin} failed:`, e);
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "Could not reach Blossom upload server";
  throw new Error(detail);
}

export async function HEAD(req: NextRequest) {
  try {
    await authorize(req);
    const upstream = await fetchBlossomUpload("HEAD", forwardAuthHeaders(req));
    const headers = new Headers();
    const reason = upstream.headers.get("x-reason");
    if (reason) headers.set("x-reason", reason);
    return new NextResponse(null, { status: upstream.status, headers });
  } catch (e) {
    if (e instanceof PracticeUploadLimitError) {
      return apiError(429, e.message);
    }
    const message =
      e instanceof UploadAuthError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Upload check failed";
    const status = e instanceof UploadAuthError ? 403 : 500;
    return apiError(status, message);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await authorize(req);
    const contentType = req.headers.get("content-type");
    const contentLength = req.headers.get("content-length");
    if (!contentType || !contentLength) {
      return apiError(400, "Missing Content-Type or Content-Length");
    }

    const headers = forwardAuthHeaders(req);
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", contentLength);

    const upstream = await fetchBlossomUpload("PUT", headers, req.body);

    const text = rewriteBlossomDescriptorBody(await upstream.text());
    const outHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    };
    const reason = upstream.headers.get("x-reason");
    if (reason) outHeaders["X-Reason"] = reason;

    return new NextResponse(text, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (e) {
    if (e instanceof PracticeUploadLimitError) {
      return apiError(429, e.message);
    }
    const message =
      e instanceof UploadAuthError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Upload failed";
    const status = e instanceof UploadAuthError ? 403 : 500;
    return apiError(status, message);
  }
}
