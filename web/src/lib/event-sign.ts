import type { Event, EventTemplate } from "nostr-tools";
import { signEventNip07 } from "@/lib/nip07";
import { withNip46Signer } from "@/lib/nip46-auth";
import type { PracticeIdentity } from "@/lib/practice-identity";

export async function signEventWithIdentity(
  identity: PracticeIdentity,
  template: EventTemplate
): Promise<Event> {
  if (identity.nip46) {
    return withNip46Signer(identity.nip46, (signer) => signer.signEvent(template));
  }

  if (identity.source === "extension") {
    const signed = await signEventNip07(template);
    if (!signed) {
      throw new Error("Browser extension could not sign. Reconnect Alby or nos2x.");
    }
    return signed as Event;
  }

  throw new Error(
    "Connect Primal or a Nostr browser extension to publish videos."
  );
}
