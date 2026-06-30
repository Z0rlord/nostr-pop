"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-[72vh] overflow-hidden px-6 pb-24 pt-24 sm:min-h-[78vh] sm:pt-28">
      <Image
        src="/hero-dojo.jpg"
        alt={t("hero.imageAlt")}
        fill
        priority
        className="object-cover object-[center_45%]"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-dojo-ink/70 via-dojo-ink/80 to-dojo-ink"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-dojo-ink/40 via-transparent to-dojo-ink/40"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-dojo-gold drop-shadow-sm">
          {t("hero.eyebrow")}
        </p>
        <h1 className="font-display text-4xl font-normal leading-tight text-white drop-shadow-md sm:text-6xl">
          {t("hero.title1")}
          <br />
          <span className="text-dojo-crimson">{t("hero.title2")}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-white/95 drop-shadow-sm">
          {t("hero.ownership")}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base text-dojo-mist/85 drop-shadow-sm">
          {t("hero.description")}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm text-dojo-mist/70">
          {t("hero.tagline")}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/watch"
            className="rounded-full bg-dojo-crimson px-8 py-3 text-lg font-medium text-white shadow-lg shadow-dojo-crimson/30 hover:bg-red-700 transition-colors"
          >
            {t("hero.watchCta")}
          </Link>
          <Link
            href="/join"
            className="rounded-full border border-white/25 bg-dojo-ink/30 px-8 py-3 text-lg text-dojo-mist backdrop-blur-sm hover:border-dojo-gold/40 hover:text-white transition-colors"
          >
            {t("hero.joinCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
