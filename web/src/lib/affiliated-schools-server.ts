import affiliatedCatalog from "@/data/affiliated-schools.json";
import {
  type AffiliatedSchool,
  type AffiliatedSchoolPublic,
} from "@/lib/affiliated-schools";
import { listSchools } from "@/lib/schools";

interface AffiliatedStore {
  schools: AffiliatedSchool[];
}

export async function listAffiliatedCatalog(): Promise<AffiliatedSchool[]> {
  const store = affiliatedCatalog as AffiliatedStore;
  return store.schools ?? [];
}

export async function listAffiliatedSchoolsPublic(): Promise<AffiliatedSchoolPublic[]> {
  const catalog = await listAffiliatedCatalog();
  const liveSchools = await listSchools();
  const liveById = new Map(liveSchools.map((s) => [s.id, s]));

  return catalog.map((entry) => {
    const live = liveById.get(entry.id);
    const rosterSize = live
      ? live.studentNpubs.length + live.instructorNpubs.length + 1
      : 0;

    return {
      ...entry,
      live: Boolean(live),
      rosterSize,
    };
  });
}

export async function getAffiliatedSchoolPublic(
  id: string
): Promise<AffiliatedSchoolPublic | undefined> {
  const schools = await listAffiliatedSchoolsPublic();
  return schools.find((s) => s.id === id);
}
