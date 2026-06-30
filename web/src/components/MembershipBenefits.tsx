"use client";

import { useI18n } from "@/i18n/context";

export function MembershipBenefits() {
  const { t } = useI18n();

  const benefits = [
    { title: t("membership.publishTitle"), body: t("membership.publishBody") },
    { title: t("membership.logTitle"), body: t("membership.logBody") },
    { title: t("membership.earlyTitle"), body: t("membership.earlyBody") },
  ];

  return (
    <section className="border-t border-white/5 bg-dojo-slate/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl text-white">{t("membership.title")}</h2>
        <p className="mt-4 max-w-2xl text-dojo-mist/70">{t("membership.subtitle")}</p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <li
              key={b.title}
              className="rounded-xl border border-white/5 bg-dojo-ink/50 p-6"
            >
              <h3 className="font-medium text-dojo-gold">{b.title}</h3>
              <p className="mt-2 text-sm text-dojo-mist/70">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
