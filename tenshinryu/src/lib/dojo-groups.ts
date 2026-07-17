/**
 * Classify dojos for UI grouping (Japan / Global Keikokai / Foreign).
 * Japan codes must stay in sync with scripts/foreign-schools.mjs.
 */

export const JAPAN_BRANCH_CODES = new Set([
  "HQ",
  "SETAGAYA",
  "KAWAGOE",
  "SHINJUKU",
  "YOKOHAMA",
  "SHINYURI",
  "KAWASAKI",
]);

export type DojoGroup = "japan" | "keikokai" | "foreign";

export type DojoLike = { code?: string | null; name?: string | null };

export function normalizeDojoCode(code?: string | null): string {
  return (code || "").toUpperCase().trim();
}

export function isKeikokaiDojo(d: DojoLike): boolean {
  const c = normalizeDojoCode(d.code);
  return c === "KEIKOKAI" || c === "INTL" || c === "GLOBAL";
}

export function isJapanBranchDojo(d: DojoLike): boolean {
  if (isKeikokaiDojo(d)) return false;
  return JAPAN_BRANCH_CODES.has(normalizeDojoCode(d.code));
}

export function isForeignDojo(d: DojoLike): boolean {
  return !isKeikokaiDojo(d) && !isJapanBranchDojo(d);
}

export function dojoGroup(d: DojoLike): DojoGroup {
  if (isKeikokaiDojo(d)) return "keikokai";
  if (isJapanBranchDojo(d)) return "japan";
  return "foreign";
}

export function sortDojosByGroup<T extends DojoLike & { name: string }>(dojos: T[]): T[] {
  const rank = (d: T) => {
    const g = dojoGroup(d);
    if (g === "japan") {
      return normalizeDojoCode(d.code) === "HQ" ? 0 : 10;
    }
    if (g === "keikokai") return 50;
    return 100;
  };
  return [...dojos].sort((a, b) => {
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name);
  });
}

export function partitionDojosByGroup<T extends DojoLike>(dojos: T[]) {
  return {
    japan: dojos.filter(isJapanBranchDojo),
    keikokai: dojos.filter(isKeikokaiDojo),
    foreign: dojos.filter(isForeignDojo),
  };
}
