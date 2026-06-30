import "websocket-polyfill";

import { NWCClient } from "@getalby/sdk/nwc";

const INVOICE_EXPIRY_SEC = 30 * 60;

export function nwcConfigured(): boolean {
  return Boolean(process.env.NWC_CONNECTION_SECRET?.trim());
}

function connectionSecret(): string {
  const secret = process.env.NWC_CONNECTION_SECRET?.trim();
  if (!secret) {
    throw new Error("NWC_CONNECTION_SECRET is not set");
  }
  return secret;
}

export async function withNwcClient<T>(
  fn: (client: NWCClient) => Promise<T>
): Promise<T> {
  const client = new NWCClient({ nostrWalletConnectUrl: connectionSecret() });
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}

export { INVOICE_EXPIRY_SEC };
