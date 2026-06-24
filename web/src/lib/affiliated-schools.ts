import type { Locale } from "@/i18n/types";

export type AffiliatedSchoolStatus = "pilot" | "active";

export interface DojoLocation {
  name: string;
  address: string;
  schedule?: string[];
}

export interface AffiliatedSchool {
  id: string;
  name: string;
  city: string;
  country: string;
  disciplines: string[];
  sensei?: string;
  senseiTitle?: string;
  senseiTitlePl?: string;
  senseiTitleJa?: string;
  description: string;
  descriptionPl?: string;
  descriptionJa?: string;
  highlightsPl?: string[];
  highlightsJa?: string[];
  status: AffiliatedSchoolStatus;
  website?: string;
  contactPhone?: string;
  highlights?: string[];
  locations?: DojoLocation[];
  featured?: boolean;
}

export interface AffiliatedSchoolPublic extends AffiliatedSchool {
  live: boolean;
  rosterSize: number;
}

export function formatLocation(school: AffiliatedSchool): string {
  return `${school.city}, ${school.country}`;
}

export function formatDisciplines(disciplines: string[]): string {
  return disciplines
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(" · ");
}

export function localizedDescription(
  school: AffiliatedSchool,
  locale: Locale
): string {
  if (locale === "pl" && school.descriptionPl) return school.descriptionPl;
  if (locale === "ja" && school.descriptionJa) return school.descriptionJa;
  return school.description;
}

export function localizedHighlights(
  school: AffiliatedSchool,
  locale: Locale
): string[] | undefined {
  if (locale === "pl" && school.highlightsPl?.length) return school.highlightsPl;
  if (locale === "ja" && school.highlightsJa?.length) return school.highlightsJa;
  return school.highlights;
}

export function localizedSenseiTitle(
  school: AffiliatedSchool,
  locale: Locale
): string | undefined {
  if (locale === "pl" && school.senseiTitlePl) return school.senseiTitlePl;
  if (locale === "ja" && school.senseiTitleJa) return school.senseiTitleJa;
  return school.senseiTitle;
}
