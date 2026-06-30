"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { SchoolOnboardingForm } from "@/components/SchoolOnboardingForm";

export function ForInstructors() {
  const { t } = useI18n();

  const instructorSteps = [
    { title: t("instructors.step1Title"), body: t("instructors.step1Body") },
    { title: t("instructors.step2Title"), body: t("instructors.step2Body") },
    { title: t("instructors.step3Title"), body: t("instructors.step3Body") },
    { title: t("instructors.step4Title"), body: t("instructors.step4Body") },
  ];

  return (
    <section
      id="for-instructors"
      className="scroll-mt-20 border-t border-white/5 bg-dojo-slate/20 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-dojo-gold">
            {t("instructors.eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
            {t("instructors.title")}
          </h2>
          <p className="mt-4 text-dojo-mist/70">{t("instructors.description")}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {instructorSteps.map((step, i) => (
            <article
              key={step.title}
              className="card-glow rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
            >
              <span className="text-sm font-medium text-dojo-crimson">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-xl text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-dojo-mist/70">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-dojo-gold/20 bg-dojo-gold/5 p-8">
          <div className="max-w-xl">
            <h3 className="font-display text-lg text-white">{t("instructors.ctaTitle")}</h3>
            <p className="mt-2 text-sm text-dojo-mist/70">{t("instructors.ctaBody")}</p>
          </div>
          <div className="mt-6 max-w-xl">
            <SchoolOnboardingForm />
          </div>
          <p className="mt-6 text-xs text-dojo-mist/50">
            {t("instructors.pilotSee")}{" "}
            <Link href="/schools" className="text-dojo-gold hover:underline">
              {t("instructors.pilotSchools")}
            </Link>{" "}
            {t("instructors.pilotMiddle")}{" "}
            <a
              href="https://hikaridojo.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dojo-gold hover:underline"
            >
              Hikari Dojo
            </a>
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-white/5 bg-dojo-ink/40 p-6">
          <h4 className="text-sm font-medium text-white">{t("instructors.studentTitle")}</h4>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-dojo-mist/70">
            <li>
              {t("instructors.studentStep1")}{" "}
              <Link href="/nostr" className="text-dojo-gold hover:underline">
                {t("instructors.studentGuide")}
              </Link>
              .
            </li>
            <li>{t("instructors.studentStep2")}</li>
            <li>{t("instructors.studentStep3")}</li>
          </ol>
          <p className="mt-4 text-xs text-dojo-mist/50">{t("instructors.studentFootnote")}</p>
        </div>
      </div>
    </section>
  );
}
