import type { Rect } from "./projection";

/**
 * Silhouette continentale SUGGÉRÉE (pas une carte classique).
 * Sans accès réseau on ne peut pas charger de vrai tracé de côtes ; on pose
 * quelques halos très doux et très peu opaques aux positions continentales
 * pour "réchauffer" les terres habitées sans jamais créer de taches blanches.
 * Coordonnées normalisées [0..1].
 */
export type Haze = { nx: number; ny: number; rx: number; ry: number };

export const CONTINENTS: Haze[] = [
  { nx: 0.20, ny: 0.33, rx: 0.10, ry: 0.14 }, // Amérique du Nord
  { nx: 0.30, ny: 0.66, rx: 0.06, ry: 0.15 }, // Amérique du Sud
  { nx: 0.49, ny: 0.28, rx: 0.07, ry: 0.07 }, // Europe
  { nx: 0.53, ny: 0.55, rx: 0.08, ry: 0.14 }, // Afrique
  { nx: 0.67, ny: 0.34, rx: 0.14, ry: 0.12 }, // Asie
  { nx: 0.76, ny: 0.60, rx: 0.05, ry: 0.05 }, // Asie du Sud-Est
  { nx: 0.83, ny: 0.70, rx: 0.06, ry: 0.05 }, // Océanie
];

/** Dessine la brume continentale (source-over, alpha plafonné très bas). */
export function drawContinents(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  alpha: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const c of CONTINENTS) {
    const x = r.x + c.nx * r.w;
    const y = r.y + c.ny * r.h;
    const rx = c.rx * r.w;
    const ry = c.ry * r.h;
    const rad = Math.max(rx, ry);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(90,120,180,${alpha})`);
    g.addColorStop(0.6, `rgba(70,100,160,${alpha * 0.4})`);
    g.addColorStop(1, "rgba(70,100,160,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx || 1);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
