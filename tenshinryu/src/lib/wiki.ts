import type { Locale } from "@/components/I18nProvider";

export const WIKI_BASE = "https://wiki.tenshinryu.xyz";

export type WikiLocale = "en" | "ja" | "es" | "el" | "fr" | "de" | "it";

/** Map KIWAMI app locale to a wiki locale. */
export function wikiLocaleForAppLocale(locale: string | undefined): WikiLocale {
  if (
    locale === "ja" ||
    locale === "es" ||
    locale === "el" ||
    locale === "fr" ||
    locale === "de" ||
    locale === "it"
  ) {
    return locale;
  }
  return "en";
}

export function wikiHomeUrl(locale: string | undefined): string {
  const wl = wikiLocaleForAppLocale(locale);
  return `${WIKI_BASE}/${wl}/`;
}

export function isWikiLocale(value: string): value is WikiLocale {
  return (
    value === "en" ||
    value === "ja" ||
    value === "es" ||
    value === "el" ||
    value === "fr" ||
    value === "de" ||
    value === "it"
  );
}

export function localeFromCookie(value: string | undefined): Locale | undefined {
  if (!value) return undefined;
  const locales: Locale[] = ["en", "ja", "fr", "it", "pl", "es", "de", "el"];
  return locales.includes(value as Locale) ? (value as Locale) : undefined;
}
