import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  parseIso6709,
  roughLocationFromGps,
  type RoughLocation,
} from "@/lib/geolocation";

const execFileAsync = promisify(execFile);

export type PreparedVideo = {
  token: string;
  sha256: string;
  bytes: number;
  mime: string;
  filename: string;
  roughLocation?: RoughLocation;
  metadataStripped: boolean;
};

type StoredPrepared = PreparedVideo & {
  filePath: string;
  expiresAt: number;
};

const PREPARED_TTL_MS = 20 * 60 * 1000;
const prepared = new Map<string, StoredPrepared>();

function preparedDir(): string {
  const base = process.env.MEMBERSHIP_DATA_DIR || path.join(os.tmpdir(), "dojopop");
  return path.join(base, "prepared-media");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [token, entry] of Array.from(prepared.entries())) {
    if (entry.expiresAt <= now) {
      prepared.delete(token);
      void fs.unlink(entry.filePath).catch(() => {});
    }
  }
}

async function ffprobeAvailable(): Promise<boolean> {
  try {
    await execFileAsync("ffprobe", ["-version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function readGpsFromFfprobe(filePath: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", filePath],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout) as {
      format?: { tags?: Record<string, string> };
    };
    const tags = data.format?.tags || {};
    const candidates = [
      tags.location,
      tags["com.apple.quicktime.location.ISO6709"],
      tags["com.apple.quicktime.location.name"],
    ].filter(Boolean) as string[];
    for (const raw of candidates) {
      const parsed = parseIso6709(raw);
      if (parsed) return parsed;
    }
  } catch {
    /* no gps */
  }
  return null;
}

async function stripMetadata(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    await execFileAsync(
      "ffmpeg",
      ["-y", "-i", inputPath, "-map_metadata", "-1", "-c", "copy", outputPath],
      { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 }
    );
    return true;
  } catch {
    try {
      await execFileAsync(
        "ffmpeg",
        ["-y", "-i", inputPath, "-map_metadata", "-1", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", outputPath],
        { timeout: 300_000, maxBuffer: 4 * 1024 * 1024 }
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hasher = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hasher.update(chunk));
    stream.on("end", () => resolve(hasher.digest("hex")));
    stream.on("error", reject);
  });
}

export async function preparePracticeVideo(
  inputBuffer: Buffer,
  originalName: string,
  mime: string
): Promise<PreparedVideo> {
  cleanupExpired();
  const dir = await preparedDir();
  await ensureDir(dir);

  const token = randomBytes(16).toString("hex");
  const ext = path.extname(originalName) || ".mp4";
  const inputPath = path.join(dir, `${token}-in${ext}`);
  const outputPath = path.join(dir, `${token}-out${ext}`);
  await fs.writeFile(inputPath, inputBuffer);

  let roughLocation: RoughLocation | undefined;
  let metadataStripped = false;
  let uploadPath = inputPath;

  if (await ffprobeAvailable()) {
    const gps = await readGpsFromFfprobe(inputPath);
    if (gps) {
      roughLocation = await roughLocationFromGps(gps.lat, gps.lon);
    }
    if (await stripMetadata(inputPath, outputPath)) {
      uploadPath = outputPath;
      metadataStripped = true;
    }
  }

  const sha256 = await sha256File(uploadPath);
  const stat = await fs.stat(uploadPath);
  const expiresAt = Date.now() + PREPARED_TTL_MS;

  prepared.set(token, {
    token,
    sha256,
    bytes: stat.size,
    mime: metadataStripped ? "video/mp4" : mime || "video/mp4",
    filename: originalName.replace(/\.[^.]+$/, "") + (metadataStripped ? ".mp4" : ext),
    roughLocation,
    metadataStripped,
    filePath: uploadPath,
    expiresAt,
  });

  void fs.unlink(inputPath).catch(() => {});

  return {
    token,
    sha256,
    bytes: stat.size,
    mime: metadataStripped ? "video/mp4" : mime || "video/mp4",
    filename: originalName.replace(/\.[^.]+$/, "") + (metadataStripped ? ".mp4" : ext),
    roughLocation,
    metadataStripped,
  };
}

export async function readPreparedVideo(
  token: string
): Promise<{ buffer: Buffer; meta: PreparedVideo } | null> {
  cleanupExpired();
  const entry = prepared.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }
  try {
    const buffer = await fs.readFile(entry.filePath);
    const { filePath: _fp, expiresAt: _exp, ...meta } = entry;
    return { buffer, meta };
  } catch {
    return null;
  }
}

export function getPreparedVideoFile(
  token: string
): { filePath: string; meta: PreparedVideo } | null {
  cleanupExpired();
  const entry = prepared.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }
  const { filePath, expiresAt: _exp, ...meta } = entry;
  return { filePath, meta };
}

export function consumePreparedVideo(token: string): void {
  const entry = prepared.get(token);
  if (!entry) return;
  prepared.delete(token);
  void fs.unlink(entry.filePath).catch(() => {});
}
