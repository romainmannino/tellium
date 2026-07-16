import type { PresenceCell } from "@/lib/types";
import type { LandDot } from "./basemap";
import { projectNorm } from "./projection";

export type Star = {
  nx: number;
  ny: number;
  cellId: string;
  tier: 0 | 1 | 2;
  baseR: number;
  baseA: number;
  col: string;
  twSpeed: number;
  twPhase: number;
  pulseSpeed: number;
  pulsePhase: number;
  born: number;
};

export type CellGlow = {
  nx: number;
  ny: number;
  cellId: string;
  countryCode: string;
  city?: string;
  intensity: number;
  users: number;
};

export const EXACT_LIGHT_LIMIT = 12000;
export const VISUAL_LIGHT_CAP = 22000;

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_COLORS = ["255,240,213", "255,211,145", "255,184,94", "231,225,207", "182,205,230"];

function makeStar(nx: number, ny: number, cellId: string, index: number, now: number): Star {
  const rand = mulberry32(hashString(`${cellId}:${index}`));
  const r = rand();
  const tier: 0 | 1 | 2 = r < 0.86 ? 0 : r < 0.975 ? 1 : 2;
  return {
    nx,
    ny,
    cellId,
    tier,
    baseR: tier === 2 ? 1.35 + rand() * 0.35 : tier === 1 ? 0.85 + rand() * 0.25 : 0.42 + rand() * 0.24,
    baseA: tier === 2 ? 0.56 + rand() * 0.12 : tier === 1 ? 0.34 + rand() * 0.1 : 0.18 + rand() * 0.08,
    col: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
    twSpeed: 0.35 + rand() * 0.8,
    twPhase: rand() * Math.PI * 2,
    pulseSpeed: 0.12 + rand() * 0.25,
    pulsePhase: rand() * Math.PI * 2,
    born: now - 5000,
  };
}

function allocateVisibleCounts(cells: PresenceCell[]) {
  const active = cells.filter((c) => c.activeUsers > 0);
  const total = active.reduce((sum, c) => sum + c.activeUsers, 0);
  if (total <= EXACT_LIGHT_LIMIT) return new Map(active.map((c) => [c.cellId, c.activeUsers]));
  const target = Math.min(VISUAL_LIGHT_CAP, Math.round(EXACT_LIGHT_LIMIT + Math.sqrt(total - EXACT_LIGHT_LIMIT) * 15));
  const raw = active.map((c) => ({ c, n: (c.activeUsers / total) * target }));
  const counts = new Map<string, number>();
  let used = 0;
  for (const item of raw) {
    const n = Math.max(1, Math.floor(item.n));
    counts.set(item.c.cellId, n);
    used += n;
  }
  raw.sort((a, b) => (b.n % 1) - (a.n % 1));
  for (let i = 0; used < target && raw.length; i += 1, used += 1) {
    const id = raw[i % raw.length].c.cellId;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

const candidateCache = new Map<string, LandDot[]>();
function landCandidates(c: PresenceCell, landDots: LandDot[]): LandDot[] {
  const key = `${c.cellId}:${landDots.length}`;
  const cached = candidateCache.get(key);
  if (cached) return cached;
  // Le rayon est assez serré pour conserver la localisation, mais les étoiles
  // épousent la terre ferme au lieu de former un nuage rond sur l'océan.
  const latRadius = 7.5;
  const lngRadius = Math.min(14, latRadius / Math.max(0.32, Math.cos(c.latitude * Math.PI / 180)));
  const candidates = landDots.filter((d) => {
    const dlng = Math.abs((((d.lng - c.longitude) + 540) % 360) - 180);
    const dlat = Math.abs(d.lat - c.latitude);
    return dlng <= lngRadius && dlat <= latRadius;
  });
  candidateCache.set(key, candidates);
  return candidates;
}

export function buildStars(cells: PresenceCell[], now: number, landDots: LandDot[] | null = null): { stars: Star[]; glows: CellGlow[] } {
  const stars: Star[] = [];
  const glows: CellGlow[] = [];
  const counts = allocateVisibleCounts(cells);

  for (const c of cells) {
    if (c.activeUsers <= 0) continue;
    const center = projectNorm(c.latitude, c.longitude);
    glows.push({ nx: center.nx, ny: center.ny, cellId: c.cellId, countryCode: c.countryCode, city: c.city, intensity: c.intensity, users: c.activeUsers });
    const n = counts.get(c.cellId) || 0;
    const candidates = landDots?.length ? landCandidates(c, landDots) : [];
    const fallbackSpread = Math.min(0.012, 0.0025 + Math.sqrt(c.activeUsers) * 0.00012);
    for (let i = 0; i < n; i += 1) {
      const rand = mulberry32(hashString(`${c.cellId}:position:${i}`));
      if (candidates.length) {
        const d = candidates[Math.floor(rand() * candidates.length) % candidates.length];
        const p = projectNorm(d.lat, d.lng);
        // micro-jitter seulement, afin de conserver la silhouette réelle.
        stars.push(makeStar(p.nx + (rand() - 0.5) * 0.0018, p.ny + (rand() - 0.5) * 0.0014, c.cellId, i, now));
      } else {
        const ang = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 0.72) * fallbackSpread;
        stars.push(makeStar(center.nx + Math.cos(ang) * rr, center.ny + Math.sin(ang) * rr * 0.62, c.cellId, i, now));
      }
    }
  }
  return { stars, glows };
}

export function starAlpha(s: Star, now: number): number {
  const tw = 0.97 + 0.03 * Math.sin(now * 0.00035 * s.twSpeed + s.twPhase);
  const pulse = 0.985 + 0.015 * Math.sin(now * 0.00022 * s.pulseSpeed + s.pulsePhase);
  const age = (now - s.born) / 650;
  return s.baseA * tw * pulse * Math.min(1, Math.max(0, age));
}

export function starRadius(s: Star, now: number): number {
  return s.baseR * (0.985 + 0.025 * Math.abs(Math.sin(now * 0.00035 * s.twSpeed + s.twPhase)));
}

export function buildGlows(cells: PresenceCell[]): CellGlow[] {
  return cells.filter((c) => c.activeUsers > 0).map((c) => {
    const center = projectNorm(c.latitude, c.longitude);
    return { nx: center.nx, ny: center.ny, cellId: c.cellId, countryCode: c.countryCode, city: c.city, intensity: c.intensity, users: c.activeUsers };
  });
}

export function spawnStar(nx: number, ny: number, cellId: string, now: number): Star {
  const index = Math.floor(now) % 100000;
  const star = makeStar(nx, ny, cellId, index, now);
  star.born = now;
  return star;
}
