import { fetchPracticeSessionsForPubkey } from "@/lib/practice-events";

/** One DojoPop practice upload per member per rolling 24 hours. */
export const PRACTICE_UPLOAD_COOLDOWN_SEC = 24 * 60 * 60;

export class PracticeUploadLimitError extends Error {
  readonly nextAllowedAt: number;

  constructor(message: string, nextAllowedAt: number) {
    super(message);
    this.name = "PracticeUploadLimitError";
    this.nextAllowedAt = nextAllowedAt;
  }
}

export type PracticeUploadCooldown = {
  allowed: boolean;
  lastUploadedAt: number | null;
  nextAllowedAt: number | null;
  waitSeconds: number;
};

export function formatUploadWait(seconds: number): string {
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

export function uploadCooldownMessage(waitSeconds: number): string {
  return `One practice video per day. You can upload again in ${formatUploadWait(waitSeconds)}.`;
}

export async function getPracticeUploadCooldown(
  pubkeyHex: string
): Promise<PracticeUploadCooldown> {
  const sessions = await fetchPracticeSessionsForPubkey(pubkeyHex, 20);
  const last = sessions[0];
  if (!last) {
    return {
      allowed: true,
      lastUploadedAt: null,
      nextAllowedAt: null,
      waitSeconds: 0,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const nextAllowedAt = last.publishedAt + PRACTICE_UPLOAD_COOLDOWN_SEC;
  const waitSeconds = nextAllowedAt - now;

  if (waitSeconds <= 0) {
    return {
      allowed: true,
      lastUploadedAt: last.publishedAt,
      nextAllowedAt: null,
      waitSeconds: 0,
    };
  }

  return {
    allowed: false,
    lastUploadedAt: last.publishedAt,
    nextAllowedAt,
    waitSeconds,
  };
}

export async function assertCanUploadPracticeVideo(pubkeyHex: string): Promise<void> {
  const cooldown = await getPracticeUploadCooldown(pubkeyHex);
  if (cooldown.allowed || !cooldown.nextAllowedAt) return;
  throw new PracticeUploadLimitError(
    uploadCooldownMessage(cooldown.waitSeconds),
    cooldown.nextAllowedAt
  );
}
