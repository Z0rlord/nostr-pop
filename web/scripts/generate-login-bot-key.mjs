#!/usr/bin/env node
/**
 * Generate a dedicated DojoPop login-bot key (separate from founder NOSTR_NSEC).
 *
 *   node web/scripts/generate-login-bot-key.mjs
 *
 * Add to Doppler (dojopop / prd_zorie):
 *   DOJOPOP_LOGIN_NSEC=<nsec>
 *   DOJOPOP_LOGIN_NPUB=<npub>
 *   DM_LOGIN_SECRET=<random 32+ char string for login token HMAC>
 */
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { nip19 } from "nostr-tools";
import { randomBytes } from "node:crypto";

const sk = generateSecretKey();
const npub = nip19.npubEncode(getPublicKey(sk));
const nsec = nip19.nsecEncode(sk);
const dmSecret = randomBytes(32).toString("base64url");

console.log("DojoPop login bot — add to Doppler (never commit values):\n");
console.log(`DOJOPOP_LOGIN_NSEC=${nsec}`);
console.log(`DOJOPOP_LOGIN_NPUB=${npub}`);
console.log(`DM_LOGIN_SECRET=${dmSecret}`);
console.log("\nFollow this npub in Primal so login DMs are easy to find.");
