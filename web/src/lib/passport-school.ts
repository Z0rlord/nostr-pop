import { formatLocation } from "@/lib/affiliated-schools";
import { listAffiliatedCatalog } from "@/lib/affiliated-schools-server";
import { listSchools, roleForNpub, type SchoolRole } from "@/lib/schools";

export type SchoolAffiliation = {
  schoolId: string;
  schoolName: string;
  location: string;
  disciplines: string[];
  role: Exclude<SchoolRole, null>;
};

export async function findSchoolAffiliations(
  npub: string
): Promise<SchoolAffiliation[]> {
  const [schools, catalog] = await Promise.all([
    listSchools(),
    listAffiliatedCatalog(),
  ]);
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
  const affiliations: SchoolAffiliation[] = [];

  for (const school of schools) {
    const role = roleForNpub(school, npub);
    if (!role) continue;
    const entry = catalogById.get(school.id);
    affiliations.push({
      schoolId: school.id,
      schoolName: school.name,
      location: entry ? formatLocation(entry) : "",
      disciplines: school.disciplines,
      role,
    });
  }

  return affiliations.sort((a, b) => a.schoolName.localeCompare(b.schoolName));
}
