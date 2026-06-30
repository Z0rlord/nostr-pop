"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";
import {
  PRIMAL_ANDROID_URL,
  PRIMAL_DOWNLOAD_URL,
  PRIMAL_IOS_URL,
} from "@/lib/constants";

export function QuickStartSteps() {
  const { t } = useI18n();

  const steps = [
    {
      num: "1",
      title: t("quickStart.step1Title"),
      body: t("quickStart.step1Body"),
      action: (
        <Link
          href="/join"
          className="mt-3 inline-block text-sm font-medium text-dojo-gold hover:underline"
        >
          {t("quickStart.step1Cta")} →
        </Link>
      ),
    },
    {
      num: "2",
      title: t("quickStart.step2Title"),
      body: t("quickStart.step2Body"),
      action: (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={PRIMAL_IOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {t("primal.ios")}
          </a>
          <a
            href={PRIMAL_ANDROID_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {t("primal.android")}
          </a>
          <a
            href={PRIMAL_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-dojo-mist hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {t("primal.downloads")}
          </a>
        </div>
      ),
    },
    {
      num: "3",
      title: t("quickStart.step3Title"),
      body: t("quickStart.step3Body"),
      action: (
        <Link
          href="/practice"
          className="mt-3 inline-block text-sm font-medium text-dojo-gold hover:underline"
        >
          {t("quickStart.step3Cta")} →
        </Link>
      ),
    },
  ];

  return (
    <section className="border-y border-white/10 bg-dojo-slate/40 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-dojo-gold">
          {t("quickStart.eyebrow")}
        </p>
        <h2 className="mt-2 text-center font-display text-2xl text-white sm:text-3xl">
          {t("quickStart.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-dojo-mist/75">
          {t("quickStart.answer")}
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="card-glow rounded-2xl border border-white/10 bg-dojo-ink/50 p-6"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dojo-crimson/20 font-display text-lg text-dojo-crimson">
                {step.num}
              </span>
              <h3 className="mt-4 font-display text-xl text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-dojo-mist/70">{step.body}</p>
              {step.action}
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm font-medium text-dojo-gold/90">
          {t("quickStart.tagline")}
        </p>
      </div>
    </section>
  );
}
