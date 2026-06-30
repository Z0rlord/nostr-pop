export const locales = ["en", "pl", "ja", "el", "it", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  ja: "日本語",
  el: "Ελληνικά",
  it: "Italiano",
  es: "Español",
};
