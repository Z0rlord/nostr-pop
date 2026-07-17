import "websocket-polyfill";

import { NWCClient } from "@getalby/sdk/nwc";

/** Outgoing streak rewards — prefers STREAK_NWC_CONNECTION_SECRET, falls back to membership NWC. */
export function streakNwcConfigured(): boolean {
  return Boolean(streakNwcConnectionSecret());
}

function streakNwcConnectionSecret(): string | undefined {
  const dedicated = process.env.STREAK_NWC_CONNECTION_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.NWC_CONNECTION_SECRET?.trim() || undefined;
}

export async function withStreakNwcClient<T>(
  fn: (client: NWCClient) => Promise<T>
): Promise<T> {
  const secret = streakNwcConnectionSecret();
  if (!secret) {
    throw new Error(
      "STREAK_NWC_CONNECTION_SECRET (or NWC_CONNECTION_SECRET) is not set"
    );
  }
  const client = new NWCClient({ nostrWalletConnectUrl: secret });
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}

export async function streakNwcCanPayInvoice(): Promise<boolean> {
  if (!streakNwcConfigured()) return false;
  try {
    const info = await withStreakNwcClient((client) => client.getInfo());
    return info.methods.includes("pay_invoice");
  } catch {
    return false;
  }
}
