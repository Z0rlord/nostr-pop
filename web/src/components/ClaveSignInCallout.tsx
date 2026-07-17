"use client";

import { CLAVE_URL } from "@/lib/constants";
import { useI18n } from "@/i18n/context";

type Props = {
  onShowQr: () => void;
};

export function ClaveSignInCallout({ onShowQr }: Props) {
  const { t } = useI18n();

  return (
    <section
      className="rounded-2xl border-2 border-dojo-gold/40 bg-gradient-to-br from-dojo-gold/15 via-dojo-gold/5 to-transparent p-6 shadow-[0_0_40px_-12px_rgba(212,175,55,0.35)]"
      aria-labelledby="clave-sign-in-title"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-dojo-gold">
        {t("signIn.claveRecommended")}
      </p>
      <h2 id="clave-sign-in-title" className="mt-2 font-display text-xl text-white sm:text-2xl">
        {t("signIn.claveTitle")}
      </h2>
      <p className="mt-2 text-sm text-dojo-mist/80">{t("signIn.claveBody")}</p>
      <ol className="mt-4 space-y-2 text-sm text-dojo-mist/75">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dojo-gold/20 text-xs font-semibold text-dojo-gold">
            1
          </span>
          <span>{t("signIn.claveStep1")}</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dojo-gold/20 text-xs font-semibold text-dojo-gold">
            2
          </span>
          <span>{t("signIn.claveStep2")}</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dojo-gold/20 text-xs font-semibold text-dojo-gold">
            3
          </span>
          <span>{t("signIn.claveStep3")}</span>
        </li>
      </ol>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <a
          href={CLAVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-dojo-gold px-5 py-2.5 text-sm font-semibold text-dojo-ink hover:bg-amber-300 transition-colors"
        >
          {t("signIn.claveGetApp")}
        </a>
        <button
          type="button"
          onClick={onShowQr}
          className="inline-flex items-center justify-center rounded-full border border-dojo-gold/50 px-5 py-2.5 text-sm font-medium text-dojo-gold hover:bg-dojo-gold/10 transition-colors"
        >
          {t("signIn.claveShowQr")}
        </button>
      </div>
    </section>
  );
}
