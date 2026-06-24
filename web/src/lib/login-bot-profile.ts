import { finalizeEvent, verifyEvent } from "nostr-tools";
import { SimplePool } from "nostr-tools/pool";
import { loadLoginBotSecretKey, loginBotPubkeyHex } from "@/lib/login-bot";

const PROFILE_RELAYS = [
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nos.lol",
];

let publishedThisProcess = false;

export async function ensureLoginBotProfile(): Promise<void> {
  if (publishedThisProcess) return;

  const secretKey = loadLoginBotSecretKey();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://dojopop.live";
  const content = JSON.stringify({
    name: "DojoPop Login",
    display_name: "DojoPop Login",
    about:
      "Automated sign-in codes for dojopop.live practice log. Reply not monitored.",
    picture: `${appUrl}/logo-icon.png`,
    website: appUrl,
  });

  const signed = finalizeEvent(
    {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content,
    },
    secretKey
  );

  if (!verifyEvent(signed) || signed.pubkey !== loginBotPubkeyHex()) {
    throw new Error("Failed to sign login-bot profile.");
  }

  const pool = new SimplePool();
  try {
    const results = await Promise.allSettled(
      pool.publish(PROFILE_RELAYS, signed)
    );
    if (results.some((r) => r.status === "fulfilled")) {
      publishedThisProcess = true;
    }
  } finally {
    pool.close(PROFILE_RELAYS);
  }
}
