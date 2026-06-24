"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

type Variant = "join" | "success" | "practice";

type Props = {
  variant?: Variant;
};

export function NostrLoginCallout({ variant = "join" }: Props) {
  const { t } = useI18n();

  const steps = [
    t("nostr.loginStepExtension"),
    t("nostr.loginStepJoin"),
    t("nostr.loginStepReturn"),
    t("nostr.loginStepNewBrowser"),
  ];

  return (
    <aside
      className="rounded-xl border border-dojo-gold/25 bg-dojo-gold/5 p-5 text-left text-sm text-dojo-mist/85"
      aria-labelledby="nostr-login-callout-title"
    >
      <p
        id="nostr-login-callout-title"
        className="font-display text-base text-dojo-gold"
      >
        {variant === "success" ? t("joinSuccess.loginTitle") : t("nostr.loginTitle")}
      </p>
      <p className="mt-2 font-medium text-white">
        {t("nostr.loginNoPassword")}
      </p>
      {variant === "success" && (
        <p className="mt-2 text-dojo-mist/75">{t("joinSuccess.loginSubtitle")}</p>
      )}
      <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-dojo-gold/80">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-dojo-mist/60">{t("nostr.loginMembershipNote")}</p>
      <Link
        href="/nostr"
        className="mt-3 inline-block text-sm text-dojo-gold hover:underline"
      >
        {t("nostr.loginGuideLink")}
      </Link>
    </aside>
  );
}
