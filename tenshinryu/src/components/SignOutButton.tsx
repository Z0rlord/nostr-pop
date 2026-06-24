"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn-secondary w-full sm:w-auto"
      onClick={async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        await signOutUser().catch(() => {});
        router.push("/");
        router.refresh();
      }}
    >
      Sign Out
    </button>
  );
}
