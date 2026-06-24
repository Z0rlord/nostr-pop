import * as nostr from "nostr-tools";

const { generatePrivateKey, getPublicKey, nip04, SimplePool } = nostr as any;

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
];

// Generate or load Nostr key for a user
export function getNostrKey(userId: string): { privateKey: string; publicKey: string } {
  const storageKey = `nostr_key_${userId}`;
  const storedKey = localStorage.getItem(storageKey);
  
  if (storedKey) {
    return {
      privateKey: storedKey,
      publicKey: getPublicKey(storedKey),
    };
  }
  
  // Generate new key
  const privateKey = generatePrivateKey();
  localStorage.setItem(storageKey, privateKey);
  
  return {
    privateKey,
    publicKey: getPublicKey(privateKey),
  };
}

// Send encrypted DM
export async function sendDM(
  senderPrivateKey: string,
  recipientPublicKey: string,
  message: string
): Promise<string> {
  const pool = new SimplePool();
  const senderPublicKey = getPublicKey(senderPrivateKey);
  
  // Encrypt message
  const encrypted = await nip04.encrypt(senderPrivateKey, recipientPublicKey, message);
  
  // Create event
  const event = {
    kind: 4, // Encrypted DM
    pubkey: senderPublicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", recipientPublicKey]],
    content: encrypted,
  };
  
  // Sign and publish
  const { finalizeEvent } = await import("nostr-tools");
  const privateKeyBytes = hexToBytes(senderPrivateKey);
  const signedEvent = finalizeEvent(event, privateKeyBytes);
  
  await Promise.all(pool.publish(RELAYS, signedEvent));
  pool.close(RELAYS);
  
  return signedEvent.id;
}

// Subscribe to DMs
export function subscribeToDMs(
  userPrivateKey: string,
  onMessage: (event: { id: string; pubkey: string; content: string; created_at: number }) => void
) {
  const pool = new SimplePool();
  const userPublicKey = getPublicKey(userPrivateKey);
  
  const sub = pool.sub(RELAYS, [
    {
      kinds: [4],
      "#p": [userPublicKey], // Messages to this user
      since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
    },
  ]);
  
  sub.on("event", async (event: any) => {
    try {
      // Decrypt
      const decrypted = await nip04.decrypt(userPrivateKey, event.pubkey, event.content);
      onMessage({
        id: event.id,
        pubkey: event.pubkey,
        content: decrypted,
        created_at: event.created_at,
      });
    } catch (err) {
      console.error("Failed to decrypt message:", err);
    }
  });
  
  return () => {
    sub.unsub();
    pool.close(RELAYS);
  };
}

// Get public key from user ID (for demo - in production, store in DB)
export function getUserPublicKey(userId: string): string | null {
  // In production, fetch from database
  // For now, return null - recipient must share their key
  return localStorage.getItem(`nostr_pubkey_${userId}`);
}

// Store public key for a user
export function setUserPublicKey(userId: string, publicKey: string) {
  localStorage.setItem(`nostr_pubkey_${userId}`, publicKey);
}
