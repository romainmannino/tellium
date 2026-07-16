import { normToRect, type Rect } from "./projection";
import { drawContinents } from "./landmass";
import { starAlpha, starRadius, type Star, type CellGlow } from "./starfield";

/**
 * CaptureRenderer — rendu offscreen dédié à l'export imprimable.
 * N'utilise PAS de mise à l'échelle brutale du canvas live : il redessine la
 * scène aux dimensions cibles, recalcule tailles/opacités selon la résolution,
 * plafonne la luminosité et sépare explicitement carte / halos / étoiles / textes.
 */

export type CaptureInput = {
  stars: Star[];
  glows: CellGlow[];
  selfNorm: { nx: number; ny: number } | null;
  now: number; // instant figé -> scintillement déterministe
  stats: { total: number; countries: number; cities: number };
};

export type CaptureResult = { dataUrl: string; reference: string; width: number; height: number };

const p2 = (x: number) => String(x).padStart(2, "0");

function momentStamp(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}-${p2(d.getUTCHours())}${p2(
    d.getUTCMinutes(),
  )}${p2(d.getUTCSeconds())}`;
}

export function renderCapture(input: CaptureInput): CaptureResult {
  const W = 3200;
  const H = 1800; // 16:9, imprimable
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) throw new Error("2D context unavailable");

  // ---------- 1. Fond nuit profonde ----------
  const bg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.68);
  bg.addColorStop(0, "#0a1226");
  bg.addColorStop(0.5, "#060b18");
  bg.addColorStop(1, "#02040a");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // rect carte (letterbox centré, marge pour les textes)
  const mw = W * 0.78;
  const r: Rect = { x: (W - mw) / 2, y: H * 0.19, w: mw, h: mw / 2.15 };

  // ---------- 2. Silhouette des terres (très subtile) ----------
  drawContinents(g, r, 0.05);

  // ---------- 3. Graticule discret ----------
  g.save();
  g.strokeStyle = "rgba(120,165,255,0.05)";
  g.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    const x = r.x + (i / 12) * r.w;
    g.beginPath();
    g.moveTo(x, r.y);
    g.lineTo(x, r.y + r.h);
    g.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const y = r.y + (i / 6) * r.h;
    g.beginPath();
    g.moveTo(r.x, y);
    g.lineTo(r.x + r.w, y);
    g.stroke();
  }
  g.restore();

  // ---------- 4. Micro-étoiles de fond ----------
  g.save();
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = Math.random() * 0.18 + 0.02;
    g.fillStyle = `rgba(200,220,255,${a})`;
    g.beginPath();
    g.arc(x, y, Math.random() * 1.1 + 0.2, 0, Math.PI * 2);
    g.fill();
  }

  // ---------- 5. Halos de densité (plafonnés) ----------
  const pxScale = r.w / 1400;
  for (const c of input.glows) {
    const { x, y } = normToRect(c.nx, c.ny, r);
    const rad = Math.min(90, 18 + Math.sqrt(c.users) * 2.2) * pxScale;
    const a = Math.min(0.1, 0.045 * c.intensity + 0.02);
    const grd = g.createRadialGradient(x, y, 0, x, y, rad * 2.4);
    grd.addColorStop(0, `rgba(130,175,255,${a})`);
    grd.addColorStop(0.45, `rgba(130,175,255,${a * 0.3})`);
    grd.addColorStop(1, "rgba(130,175,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad * 2.4, 0, Math.PI * 2);
    g.fill();
  }

  // ---------- 6. Étoiles (positions figées, opacité plafonnée) ----------
  for (const s of input.stars) {
    const { x, y } = normToRect(s.nx, s.ny, r);
    const a = Math.min(0.85, starAlpha(s, input.now));
    if (a <= 0.01) continue;
    const rr = starRadius(s, input.now) * pxScale;
    if (s.tier === 2) {
      // léger halo doux pour les rares étoiles brillantes (pas de shadowBlur)
      const gg = g.createRadialGradient(x, y, 0, x, y, rr * 4);
      gg.addColorStop(0, `rgba(${s.col},${a * 0.5})`);
      gg.addColorStop(1, `rgba(${s.col},0)`);
      g.fillStyle = gg;
      g.beginPath();
      g.arc(x, y, rr * 4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = `rgba(${s.col},${a})`;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }

  // ---------- 7. Étoile personnelle (dorée) ----------
  if (input.selfNorm) {
    const { x, y } = normToRect(input.selfNorm.nx, input.selfNorm.ny, r);
    const grd = g.createRadialGradient(x, y, 0, x, y, 70 * pxScale);
    grd.addColorStop(0, "rgba(255,200,120,0.42)");
    grd.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, 70 * pxScale, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff1d6";
    g.beginPath();
    g.arc(x, y, 4.2 * pxScale, 0, Math.PI * 2);
    g.fill();
  }
  g.restore(); // fin composite "lighter"

  // ---------- 8. Textes (source-over, nets) ----------
  const d = new Date();
  const stamp = momentStamp(d);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const timeStr = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;

  g.textBaseline = "alphabetic";

  // logo très discret (haut gauche)
  g.textAlign = "left";
  g.save();
  (g as unknown as { letterSpacing?: string }).letterSpacing = "14px";
  g.font = "300 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  g.fillStyle = "rgba(210,224,255,0.55)";
  g.fillText("TELLIUM", r.x, H * 0.1);
  g.restore();

  // date discrète (haut droite)
  g.textAlign = "right";
  g.font = "300 24px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "rgba(150,170,210,0.5)";
  g.fillText(`${dateStr} · ${timeStr}`, r.x + r.w, H * 0.1);

  // bloc central bas — grande respiration
  g.textAlign = "center";
  g.font = "200 66px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "#eef4ff";
  g.fillText(`${input.stats.total.toLocaleString("en-US")}`, W / 2, H * 0.9);
  g.save();
  (g as unknown as { letterSpacing?: string }).letterSpacing = "3px";
  g.font = "300 23px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "rgba(150,170,210,0.62)";
  g.fillText(`PEOPLE CONNECTED  ·  ${input.stats.countries} COUNTRIES`, W / 2, H * 0.9 + 44);
  g.restore();
  g.font = "300 20px ui-sans-serif, system-ui, sans-serif";
  g.fillStyle = "rgba(120,138,175,0.5)";
  g.fillText(`Moment #${stamp}`, W / 2, H * 0.9 + 82);

  return { dataUrl: cv.toDataURL("image/png"), reference: stamp, width: W, height: H };
}
