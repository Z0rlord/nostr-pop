/** Encode lat/lon to geohash (precision 4 ≈ 20 km). */
export function encodeGeohash(lat: number, lon: number, precision = 4): string {
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let idx = 0;
  let bit = 0;
  let even = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = "";

  while (hash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx *= 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx *= 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += base32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

/** Coarsen GPS to ~11 km grid before geocoding or tagging. */
export function coarseGps(lat: number, lon: number): { lat: number; lon: number } {
  return {
    lat: Math.round(lat * 10) / 10,
    lon: Math.round(lon * 10) / 10,
  };
}

export type RoughLocation = {
  label: string;
  geohash: string;
  coarseLat: number;
  coarseLon: number;
};

export async function roughLocationFromGps(
  lat: number,
  lon: number
): Promise<RoughLocation> {
  const { lat: coarseLat, lon: coarseLon } = coarseGps(lat, lon);
  const geohash = encodeGeohash(coarseLat, coarseLon, 4);
  let label = `~${coarseLat.toFixed(1)}°, ${coarseLon.toFixed(1)}°`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(coarseLat));
    url.searchParams.set("lon", String(coarseLon));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "10");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "DojoPop/1.0 (https://dojopop.live)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          municipality?: string;
          state?: string;
          country?: string;
        };
      };
      const a = data.address;
      if (a) {
        const place =
          a.city || a.town || a.village || a.municipality || a.state || "";
        const country = a.country || "";
        if (place && country) label = `${place}, ${country}`;
        else if (country) label = country;
      }
    }
  } catch {
    /* keep coordinate fallback */
  }

  return { label, geohash, coarseLat, coarseLon };
}

/** Parse ISO6709 from QuickTime / MP4 tags, e.g. +35.6580+139.7017/ */
export function parseIso6709(value: string): { lat: number; lon: number } | null {
  const m = value.match(/([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
