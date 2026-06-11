import { syncRelayWhitelist } from "@/lib/relay-sync";

export async function onMembershipChanged(reason: string): Promise<void> {
  try {
    const result = await syncRelayWhitelist();
    console.log(
      `relay-sync (${reason}): ${result.memberCount} member(s), restarted=${result.restarted}`
    );
  } catch (e) {
    console.error(`relay-sync failed (${reason})`, e);
  }
}
