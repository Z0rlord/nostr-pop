"use client";

import { localeNames, locales, type Locale } from "@/i18n/types";
import { useI18n } from "@/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-xs text-dojo-mist/70">
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-md border border-white/10 bg-dojo-ink/80 px-2 py-1.5 text-xs text-dojo-mist focus:border-dojo-gold/50 focus:outline-none"
        aria-label={t("lang.label")}
      >
        {locales.map((code) => (
          <option key={code} value={code} className="bg-dojo-ink text-dojo-mist">
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
