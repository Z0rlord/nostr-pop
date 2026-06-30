"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { num: "01", title: t("howItWorks.enterTitle"), body: t("howItWorks.enterBody") },
    { num: "02", title: t("howItWorks.bowTitle"), body: t("howItWorks.bowBody") },
    { num: "03", title: t("howItWorks.beginTitle"), body: t("howItWorks.beginBody") },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-3xl text-white sm:text-4xl">
          {t("howItWorks.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-dojo-mist/70">{t("howItWorks.subtitle")}</p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.num}
              className="card-glow rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
            >
              <span className="text-sm font-medium text-dojo-crimson">{step.num}</span>
              <h3 className="mt-3 font-display text-xl text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-dojo-mist/70">{step.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-dojo-gold/20 bg-dojo-gold/5 p-6">
            <p className="text-sm text-dojo-mist/80">
              {t("howItWorks.hubPrefix")}{" "}
              <Link href="/watch" className="font-medium text-dojo-gold hover:underline">
                {t("howItWorks.hubLink")}
              </Link>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-dojo-slate/40 p-6">
            <p className="text-sm text-dojo-mist/80">
              {t("howItWorks.nostrPrefix")}{" "}
              <Link href="/nostr" className="font-medium text-dojo-gold hover:underline">
                {t("howItWorks.nostrLink")}
              </Link>{" "}
              {t("howItWorks.nostrSuffix")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
