"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

const extensions = [
  { name: "Alby", url: "https://getalby.com", noteKey: "nostr.extAlby" as const },
  { name: "nos2x", url: "https://github.com/fiatjaf/nos2x", noteKey: "nostr.extNos2x" as const },
  { name: "Primal", url: "https://primal.net", noteKey: "nostr.extPrimal" as const },
];

type Props = {
  variant?: "full" | "compact";
};

export function NostrGuideContent({ variant = "full" }: Props) {
  const { t } = useI18n();

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-dojo-gold/20 bg-dojo-gold/5 p-4 text-sm text-dojo-mist/80">
        <p className="font-medium text-dojo-gold">{t("nostr.compactTitle")}</p>
        <p className="mt-1">{t("nostr.compactBody")}</p>
        <Link href="/nostr" className="mt-3 inline-block text-dojo-gold hover:underline">
          {t("nostr.compactLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-display text-xl text-white">{t("nostr.whatTitle")}</h2>
        <p>{t("nostr.whatP1")}</p>
        <p>{t("nostr.whatP2")}</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-white">{t("nostr.setupTitle")}</h2>
        <ol className="space-y-6">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dojo-crimson/20 text-sm font-medium text-dojo-crimson">
              1
            </span>
            <div>
              <h3 className="font-medium text-white">{t("nostr.setup1Title")}</h3>
              <p className="mt-1 text-dojo-mist/70">{t("nostr.setup1Body")}</p>
              <ul className="mt-3 space-y-2">
                {extensions.map((ext) => (
                  <li key={ext.name}>
                    <a
                      href={ext.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dojo-gold hover:underline"
                    >
                      {ext.name}
                    </a>
                    <span className="text-dojo-mist/50"> — {t(ext.noteKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
          {[2, 3, 4, 5].map((n) => (
            <li key={n} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dojo-crimson/20 text-sm font-medium text-dojo-crimson">
                {n}
              </span>
              <div>
                <h3 className="font-medium text-white">
                  {t(`nostr.setup${n}Title` as "nostr.setup2Title")}
                </h3>
                <p className="mt-1 text-dojo-mist/70">
                  {t(`nostr.setup${n}Body` as "nostr.setup2Body")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4" id="use-cases">
        <h2 className="font-display text-xl text-white">{t("nostr.useTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-dojo-slate/60 p-5">
            <h3 className="font-medium text-dojo-gold">{t("nostr.useSchoolTitle")}</h3>
            <p className="mt-2 text-sm text-dojo-mist/70">{t("nostr.useSchoolBody")}</p>
            <Link href="/schools" className="mt-3 inline-block text-xs text-dojo-mist/60 hover:text-dojo-gold">
              {t("footer.affiliatedSchools")} →
            </Link>
          </div>
          <div className="rounded-xl border border-white/5 bg-dojo-slate/60 p-5">
            <h3 className="font-medium text-dojo-gold">{t("nostr.useSoloTitle")}</h3>
            <p className="mt-2 text-sm text-dojo-mist/70">{t("nostr.useSoloBody")}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-dojo-slate/60 p-5">
            <h3 className="font-medium text-dojo-gold">{t("nostr.useLogTitle")}</h3>
            <p className="mt-2 text-sm text-dojo-mist/70">{t("nostr.useLogBody")}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-white/5 bg-dojo-ink/40 p-6">
        <h2 className="font-display text-lg text-white">{t("nostr.faqTitle")}</h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-dojo-mist">{t("nostr.faqBtcQ")}</dt>
            <dd className="mt-1 text-dojo-mist/60">{t("nostr.faqBtcA")}</dd>
          </div>
          <div>
            <dt className="font-medium text-dojo-mist">{t("nostr.faqPhoneQ")}</dt>
            <dd className="mt-1 text-dojo-mist/60">{t("nostr.faqPhoneA")}</dd>
          </div>
          <div>
            <dt className="font-medium text-dojo-mist">{t("nostr.faqLostQ")}</dt>
            <dd className="mt-1 text-dojo-mist/60">{t("nostr.faqLostA")}</dd>
          </div>
          <div>
            <dt className="font-medium text-dojo-mist">{t("nostr.faqDataQ")}</dt>
            <dd className="mt-1 text-dojo-mist/60">
              {t("nostr.faqDataA")}{" "}
              <Link href="/privacy" className="text-dojo-gold hover:underline">
                {t("footer.privacy")}
              </Link>
              .
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
