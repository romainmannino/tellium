/**
 * Base géographique Tellium, embarquée dans /public/land-dots.json.
 * Les points proviennent d'un vrai masque terrestre Natural Earth et non des
 * villes simulées. La silhouette des continents reste donc exacte même hors
 * connexion et sans dépendance chargée au runtime.
 */
export type LandDot = { lng: number; lat: number };

let cache: LandDot[] | null = null;
let pending: Promise<LandDot[]> | null = null;

export async function loadLandDots(): Promise<LandDot[]> {
  if (cache) return cache;
  if (pending) return pending;
  pending = fetch('/land-dots.json', { cache: 'force-cache' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`land-dots: ${res.status}`);
      const raw = await res.json() as number[][];
      cache = raw
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map((p) => ({ lng: Number(p[0]), lat: Number(p[1]) }));
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    });
  return pending;
}

export function getLandDots(): LandDot[] | null {
  return cache;
}
