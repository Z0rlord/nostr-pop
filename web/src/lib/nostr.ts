export function isValidNpub(npub: string): boolean {
  if (!npub.startsWith("npub1")) return false;
  if (npub.length < 59 || npub.length > 64) return false;
  return /^npub1[a-z0-9]+$/.test(npub);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
