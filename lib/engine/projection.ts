/**
 * Projection équirectangulaire en coordonnées NORMALISÉES [0..1].
 * Tout le moteur (rendu live + export capture) partage ce même espace :
 * un point monde -> (nx, ny), puis la caméra mappe (nx, ny) -> pixels écran.
 * Cela garantit que la capture reproduit exactement la disposition des étoiles.
 */

export type Rect = { x: number; y: number; w: number; h: number };
export type Norm = { nx: number; ny: number };

/** lat/lng -> position normalisée dans le planisphère [0..1]x[0..1]. */
export function projectNorm(lat: number, lng: number): Norm {
  return { nx: (lng + 180) / 360, ny: (90 - lat) / 180 };
}

/** Rectangle "carte" letterbox (~2.15:1) au zoom 1, centré dans le viewport. */
export function mapRect(W: number, H: number): Rect {
  const pad = Math.min(W, H) * 0.02;
  let w = W - pad * 2;
  let h = w / 2.15;
  if (h > H - pad * 2) {
    h = H - pad * 2;
    w = h * 2.15;
  }
  return { x: (W - w) / 2, y: (H - h) / 2 + h * 0.03, w, h };
}

/** Compat : projection directe d'un point dans un rect donné (utilisée par la capture). */
export function project(lat: number, lng: number, r: Rect) {
  const n = projectNorm(lat, lng);
  return { x: r.x + n.nx * r.w, y: r.y + n.ny * r.h };
}

/** Place un point normalisé dans un rect. */
export function normToRect(nx: number, ny: number, r: Rect) {
  return { x: r.x + nx * r.w, y: r.y + ny * r.h };
}

/** Inverse : point normalisé -> lat/lng en degrés. */
export function normToLatLng(nx: number, ny: number): { lat: number; lng: number } {
  return { lat: 90 - ny * 180, lng: nx * 360 - 180 };
}
