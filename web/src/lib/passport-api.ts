import type { EventTemplate } from "nostr-tools";
import { signEventWithIdentity } from "@/lib/event-sign";
import type { PracticeIdentity } from "@/lib/practice-identity";
import type { PassportOverrideInput } from "@/lib/passport-overrides";

function nostrAuthHeader(event: { [key: string]: unknown }): string {
  return `Nostr ${btoa(JSON.stringify(event))}`;
}

async function signHttpAuth(
  identity: PracticeIdentity,
  url: string,
  method: string
) {
  const template: EventTemplate = {
    kind: 27235,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["u", url],
      ["method", method],
    ],
    content: "",
  };
  return signEventWithIdentity(identity, template);
}

export async function patchPassportOverrides(
  identity: PracticeIdentity,
  input: PassportOverrideInput
): Promise<Response> {
  const url = `${window.location.origin}/api/passport`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (identity.dmSession?.token) {
    headers["X-DojoPop-Session"] = identity.dmSession.token;
  } else {
    const authEvent = await signHttpAuth(identity, url, "PATCH");
    headers.Authorization = nostrAuthHeader(authEvent);
  }

  return fetch("/api/passport", {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      npub: identity.npub,
      ...input,
    }),
  });
}
