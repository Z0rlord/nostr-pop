import { formatLocation } from "@/lib/affiliated-schools";
import type { AffiliatedSchool } from "@/lib/affiliated-schools";
import type { PassportOverride } from "@/lib/passport-overrides";
import type { SchoolAffiliation } from "@/lib/passport-school";

export type FieldSource = "roster" | "self" | null;

export type PassportDisplay = {
  schoolName: string | null;
  schoolId: string | null;
  schoolSource: FieldSource;
  location: string | null;
  locationSource: FieldSource;
  rank: string | null;
  rankSupplement: string | null;
  rankSource: FieldSource;
  rankSupplementSource: FieldSource;
  discipline: string | null;
  disciplineSource: FieldSource;
};

function formatDisciplines(disciplines: string[]): string {
  return disciplines
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(" · ");
}

export function roleToRankKey(
  role: SchoolAffiliation["role"]
): "roleOwner" | "roleInstructor" | "roleStudent" {
  if (role === "owner") return "roleOwner";
  if (role === "instructor") return "roleInstructor";
  return "roleStudent";
}

export function buildPassportDisplay(
  affiliations: SchoolAffiliation[],
  overrides: PassportOverride | null,
  catalog: AffiliatedSchool[]
): PassportDisplay {
  const primary = affiliations[0] ?? null;
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));

  let schoolName: string | null = null;
  let schoolId: string | null = null;
  let schoolSource: FieldSource = null;

  if (primary) {
    schoolName = primary.schoolName;
    schoolId = primary.schoolId;
    schoolSource = "roster";
  } else if (overrides?.affiliatedSchoolId) {
    const entry = catalogById.get(overrides.affiliatedSchoolId);
    schoolId = overrides.affiliatedSchoolId;
    schoolName = entry?.name ?? overrides.displaySchool ?? null;
    schoolSource = "self";
  } else if (overrides?.displaySchool) {
    schoolName = overrides.displaySchool;
    schoolSource = "self";
  }

  let location: string | null = null;
  let locationSource: FieldSource = null;
  if (primary?.location) {
    location = primary.location;
    locationSource = "roster";
  } else if (overrides?.location) {
    location = overrides.location;
    locationSource = "self";
  } else if (overrides?.affiliatedSchoolId) {
    const entry = catalogById.get(overrides.affiliatedSchoolId);
    if (entry) {
      location = formatLocation(entry);
      locationSource = "self";
    }
  }

  let rank: string | null = null;
  let rankSource: FieldSource = null;
  let rankSupplement: string | null = null;
  let rankSupplementSource: FieldSource = null;

  if (primary) {
    rank = roleToRankKey(primary.role);
    rankSource = "roster";
    if (overrides?.rank) {
      rankSupplement = overrides.rank;
      rankSupplementSource = "self";
    }
  } else if (overrides?.rank) {
    rank = overrides.rank;
    rankSource = "self";
  }

  let discipline: string | null = null;
  let disciplineSource: FieldSource = null;
  if (primary?.disciplines.length) {
    discipline = formatDisciplines(primary.disciplines);
    disciplineSource = "roster";
  } else if (overrides?.discipline) {
    discipline = overrides.discipline;
    disciplineSource = "self";
  } else if (overrides?.affiliatedSchoolId) {
    const entry = catalogById.get(overrides.affiliatedSchoolId);
    if (entry?.disciplines.length) {
      discipline = formatDisciplines(entry.disciplines);
      disciplineSource = "self";
    }
  }

  return {
    schoolName,
    schoolId,
    schoolSource,
    location,
    locationSource,
    rank,
    rankSupplement,
    rankSource,
    rankSupplementSource,
    discipline,
    disciplineSource,
  };
}
