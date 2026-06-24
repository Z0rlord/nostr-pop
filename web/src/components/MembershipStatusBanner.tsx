"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

type MembershipStatus = {
  registered: boolean;
  active: boolean;
  status: string | null;
  paidUntil: string | null;
};

type Props = {
  npub: string;
};

export function MembershipStatusBanner({ npub }: Props) {
  const { t } = useI18n();
  const [membership, setMembership] = useState<MembershipStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/membership/status?npub=${encodeURIComponent(npub)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMembership(data as MembershipStatus);
      })
      .catch(() => {
        if (!cancelled) setMembership(null);
      });
    return () => {
      cancelled = true;
    };
  }, [npub]);

  if (!membership) return null;

  return (
    <div className="space-y-3">
      {membership.active ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {t("signIn.memberActive")}
          {membership.paidUntil && (
            <span className="text-emerald-200/70">
              {" "}
              · {t("signIn.paidUntil")} {new Date(membership.paidUntil).toLocaleDateString()}
            </span>
          )}
        </div>
      ) : membership.registered ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("signIn.memberPending", { status: membership.status ?? "pending" })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-dojo-ink/40 px-4 py-3 text-sm text-dojo-mist/80">
          {t("signIn.notMember")}{" "}
          <Link href="/join" className="text-dojo-gold hover:underline">
            {t("signIn.joinLink")}
          </Link>
        </div>
      )}

    </div>
  );
}
