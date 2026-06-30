import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptSchoolPayload(
  keyHex: string,
  payload: unknown
): string {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("encryption key must be 32 bytes (64 hex chars)");
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, encrypted]);
  return `enc::${packed.toString("base64")}`;
}

export function decryptSchoolPayload<T>(
  keyHex: string,
  content: string
): T | null {
  if (!content.startsWith("enc::")) return null;
  try {
    const key = Buffer.from(keyHex, "hex");
    const packed = Buffer.from(content.slice(5), "base64");
    const iv = packed.subarray(0, IV_LEN);
    const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = packed.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function generateSchoolKeyHex(): string {
  return randomBytes(32).toString("hex");
}
