import type { PresenceSource } from "@/lib/data/presenceSource";
import type { ArrivalEvent, PresenceCell } from "@/lib/types";
import { COUNTRY_NAMES } from "@/lib/data/cities";
import { projectNorm, type Rect } from "./projection";
import { CameraController } from "./camera";
import { GlobeController } from "./globe";
import { loadLandDots, type LandDot } from "./basemap";
import {
  buildStars,
  buildGlows,
  spawnStar,
  starAlpha,
  starRadius,
  type Star,
  type CellGlow,
} from "./starfield";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const MAX_STARS = 24000;
const p2 = (x: number) => String(x).padStart(2, "0");
function momentStamp(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}-${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}`;
}

export type ViewMode = "flat" | "globe";
type Proj = { x: number; y: number; vis: boolean; depth: number; scale: number };
type BgStar = { x: number; y: number; r: number; a: number; ph: number; sp: number };
type Arrival = { nx: number; ny: number; fromX: number; fromY: number; start: number; invited: boolean; self: boolean };
type Departure = { nx: number; ny: number; toX: number; toY: number; start: number };
type SceneOpts = { export?: boolean; gallery?: number; paintBg?: boolean };

export type HoverInfo = { country: string; people: number; cities: number; lastArrivalSec: number; x: number; y: number };
export type EngineCallbacks = {
  onStats?: (s: { total: number; countries: number; cities: number }) => void;
  onToast?: (html: string, kind?: "default" | "friend") => void;
  onHover?: (info: HoverInfo | null) => void;
  onSelfClick?: (x: number, y: number) => void;
};

/** Moteur visuel Tellium — carte plate + globe, base de Terre en points, rendu partagé écran/export. */
export class TelliumRenderer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private source!: PresenceSource;
  private cb: EngineCallbacks = {};

  private mode: ViewMode = "globe";
  private cam = new CameraController();
  private globe = new GlobeController();

  private DPR = 1;
  private W = 0;
  private H = 0;

  private bgStars: BgStar[] = [];
  private stars: Star[] = [];
  private glows: CellGlow[] = [];
  private arrivals: Arrival[] = [];
  private departures: Departure[] = [];
  private previousCellCounts = new Map<string, number>();
  private cells: PresenceCell[] = [];
  private landDots: LandDot[] | null = null;
  private currentTotal = 0;

  private selfNorm: { nx: number; ny: number } | null = null;
  private selfBorn = 0;
  private hoveredCellId: string | null = null;

  private frozen = false;
  private cleanCapture = false;
  private freezeTime = 0;
  private galleryOn = false;
  private galleryLevel = 0;
  private grain: HTMLCanvasElement | null = null;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private dragMoved = 0;
  private downAt = 0;
  private lastTapT = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  private raf = 0;
  private statTimer: ReturnType<typeof setInterval> | null = null;
  private unsub: (() => void) | null = null;
  private ro: ResizeObserver | null = null;

  mount(canvas: HTMLCanvasElement, source: PresenceSource, cb: EngineCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    this.ctx = ctx;
    this.source = source;
    this.cb = cb;

    const snap = source.getSnapshot();
    this.cells = snap.cells;
    this.currentTotal = snap.totalActiveUsers;
    this.previousCellCounts = new Map(snap.cells.map((c) => [c.cellId, c.activeUsers]));
    const now = performance.now();
    const built = buildStars(this.cells, now, this.landDots);
    this.stars = built.stars;
    this.glows = built.glows;

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDblClick);

    this.unsub = source.onArrival((e) => this.pushArrival(e));

    // base de Terre (chargement paresseux, repli silencieux)
    loadLandDots()
      .then((d) => {
        this.landDots = d;
        const rebuilt = buildStars(this.cells, performance.now(), this.landDots);
        this.stars = rebuilt.stars;
        this.glows = rebuilt.glows;
      })
      .catch(() => {
        this.landDots = [];
      });

    this.statTimer = setInterval(() => {
      const s = source.getSnapshot();
      const nowTick = performance.now();
      // Détecte les départs réels entre deux instantanés. On ne crée que quelques
      // trajectoires à la fois afin de garder l'effet élégant, même en rafale.
      for (const cell of s.cells) {
        const before = this.previousCellCounts.get(cell.cellId) ?? cell.activeUsers;
        const diff = before - cell.activeUsers;
        if (diff > 0 && diff <= 8) {
          const n = projectNorm(cell.latitude, cell.longitude);
          for (let k = 0; k < Math.min(diff, 3); k += 1) {
            const right = Math.random() > 0.5;
            this.departures.push({
              nx: n.nx, ny: n.ny,
              toX: right ? this.W + 90 : -90,
              toY: rnd(this.H * 0.08, this.H * 0.42),
              start: nowTick + k * 110,
            });
          }
        }
      }
      this.previousCellCounts = new Map(s.cells.map((c) => [c.cellId, c.activeUsers]));
      this.cells = s.cells;
      this.currentTotal = s.totalActiveUsers;
      const rebuilt = buildStars(this.cells, nowTick, this.landDots);
      this.stars = rebuilt.stars;
      this.glows = rebuilt.glows;
      this.cb.onStats?.({ total: s.totalActiveUsers, countries: s.countriesRepresented, cities: s.citiesRepresented });
    }, 900);

    this.cb.onStats?.({ total: snap.totalActiveUsers, countries: snap.countriesRepresented, cities: snap.citiesRepresented });
    this.raf = requestAnimationFrame(this.draw);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.statTimer) clearInterval(this.statTimer);
    this.unsub?.();
    this.ro?.disconnect();
    const c = this.canvas;
    if (!c) return;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    c.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("pointercancel", this.onPointerUp);
    c.removeEventListener("pointerleave", this.onPointerLeave);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("dblclick", this.onDblClick);
  }

  // ---------- API publique ----------
  setMode(m: ViewMode) {
    if (m === this.mode) return;
    this.mode = m;
    if (m === "globe") {
      if (this.selfNorm) this.globe.faceNorm(this.selfNorm.nx, this.selfNorm.ny);
    } else {
      this.cam.reset();
    }
  }
  getMode() {
    return this.mode;
  }
  zoomIn() {
    if (this.mode === "flat") this.cam.nudgeZoom(1.4);
    else this.globe.zoomBy(1.3);
  }
  zoomOut() {
    if (this.mode === "flat") this.cam.nudgeZoom(1 / 1.4);
    else this.globe.zoomBy(1 / 1.3);
  }
  resetView() {
    if (this.mode === "flat") this.cam.reset();
    else this.globe.reset();
  }
  hasSelf() {
    return !!this.selfNorm;
  }
  findMyLight() {
    if (!this.selfNorm) return;
    if (this.mode === "flat") this.cam.focus(this.selfNorm.nx, this.selfNorm.ny, 2.8);
    else this.globe.faceNorm(this.selfNorm.nx, this.selfNorm.ny);
  }
  /** Rejoue l’arrivée de l’utilisateur après la transition Home → œuvre. */
  replaySelfArrival() {
    if (!this.selfNorm) return;
    this.selfBorn = performance.now();
    this.globe.faceNorm(this.selfNorm.nx, this.selfNorm.ny);
    this.arrivals.push({
      nx: this.selfNorm.nx,
      ny: this.selfNorm.ny,
      fromX: this.W * 0.5,
      fromY: -70,
      start: performance.now(),
      invited: false,
      self: true,
    });
  }

  setFrozen(v: boolean) {
    this.frozen = v;
    if (v) this.freezeTime = performance.now();
  }
  /** Nettoie temporairement les éléments animés pour une capture fidèle du globe. */
  setCleanCapture(enabled: boolean) {
    this.cleanCapture = enabled;
    if (enabled) {
      this.arrivals = [];
      this.departures = [];
      this.hoveredCellId = null;
    }
  }
  setGallery(v: boolean) {
    this.galleryOn = v;
    if (v) {
      if (this.mode === "flat") this.cam.nudgeZoom(1.06);
      else this.globe.zoomBy(1.05);
    }
  }

  /** Force une synchronisation immédiate après changement du laboratoire. */
  syncFromSource() {
    const snap = this.source.getSnapshot();
    this.cells = snap.cells;
    this.currentTotal = snap.totalActiveUsers;
    const rebuilt = buildStars(this.cells, performance.now(), this.landDots);
    this.stars = rebuilt.stars;
    this.glows = rebuilt.glows;
    this.cb.onStats?.({ total: snap.totalActiveUsers, countries: snap.countriesRepresented, cities: snap.citiesRepresented });
  }

  /** Génère une affiche premium indépendante du rendu live. */
  exportPng(stats: { total: number; countries: number; cities: number; firstName?: string; city?: string }): { dataUrl: string; reference: string } {
    const OW = 3840;
    const OH = 2160;
    const cv = document.createElement("canvas");
    cv.width = OW;
    cv.height = OH;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D export indisponible");

    const d = new Date();
    const stamp = momentStamp(d);
    const cx = OW * 0.5;
    const cy = OH * 0.45;
    const R = OH * 0.355;
    const lat0 = 22 * Math.PI / 180;
    const lon0 = 12 * Math.PI / 180;

    const project = (latDeg: number, lonDeg: number) => {
      const lat = latDeg * Math.PI / 180;
      const lon = lonDeg * Math.PI / 180;
      const dl = lon - lon0;
      const vis = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dl);
      const x = cx + R * Math.cos(lat) * Math.sin(dl);
      const y = cy - R * (Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dl));
      return { x, y, vis };
    };

    // Espace profond et vignettage doux.
    const bg = ctx.createRadialGradient(cx, cy * .9, 0, cx, cy, OW * .62);
    bg.addColorStop(0, "#0a1627");
    bg.addColorStop(.4, "#040913");
    bg.addColorStop(1, "#010204");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, OW, OH);
    for (let i = 0; i < 420; i += 1) {
      const x = (i * 7919 % 997) / 997 * OW;
      const y = (i * 3571 % 991) / 991 * OH;
      const a = .03 + ((i * 17) % 31) / 31 * .16;
      ctx.fillStyle = `rgba(190,215,245,${a})`;
      ctx.beginPath(); ctx.arc(x, y, i % 19 === 0 ? 1.8 : .8, 0, Math.PI * 2); ctx.fill();
    }

    // Globe sombre avec profondeur et atmosphère.
    const sphere = ctx.createRadialGradient(cx - R * .28, cy - R * .34, R * .05, cx, cy, R * 1.08);
    sphere.addColorStop(0, "#13243b");
    sphere.addColorStop(.46, "#07121f");
    sphere.addColorStop(.82, "#02060b");
    sphere.addColorStop(1, "#000102");
    ctx.fillStyle = sphere;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, Math.PI * 2); ctx.clip();

    // Trame géographique dormante + lumières actives.
    ctx.globalCompositeOperation = "lighter";
    const dots = this.landDots || [];
    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];
      const p = project(dot.lat, dot.lng);
      if (p.vis <= 0) continue;
      const edge = Math.pow(p.vis, .42);
      ctx.fillStyle = `rgba(120,164,210,${.035 + edge * .06})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, .8 + edge * .7, 0, Math.PI * 2); ctx.fill();
    }

    const active = Math.min(5200, Math.max(140, Math.round(Math.sqrt(stats.total) * 5.4)));
    for (let i = 0; i < active; i += 1) {
      if (!dots.length) break;
      const dot = dots[(i * 7919 + stats.total * 13) % dots.length];
      const p = project(dot.lat, dot.lng);
      if (p.vis <= 0) continue;
      const hot = i % 47 === 0;
      const r = hot ? 3.8 : i % 9 === 0 ? 2.15 : 1.15;
      ctx.fillStyle = hot ? "rgba(255,246,220,.98)" : i % 13 === 0 ? "rgba(197,222,255,.72)" : "rgba(244,183,91,.72)";
      if (hot) {
        const h = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26);
        h.addColorStop(0, "rgba(255,240,205,.45)"); h.addColorStop(1, "rgba(255,190,90,0)");
        ctx.fillStyle = h; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,246,220,.98)";
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Connexions discrètes, comme une installation numérique premium.
    const routes = [
      [40.71, -74.0], [35.68, 139.69], [-23.55, -46.63], [1.29, 103.85], [-33.87, 151.21]
    ];
    const selfLat = this.selfNorm ? 90 - this.selfNorm.ny * 180 : 45.76;
    const selfLng = this.selfNorm ? this.selfNorm.nx * 360 - 180 : 4.84;
    const sp = project(selfLat, selfLng);
    if (sp.vis > 0) {
      for (let i = 0; i < routes.length; i += 1) {
        const rp = project(routes[i][0], routes[i][1]);
        if (rp.vis <= 0) continue;
        const mx = (sp.x + rp.x) / 2;
        const my = Math.min(sp.y, rp.y) - 130 - i * 18;
        const grad = ctx.createLinearGradient(sp.x, sp.y, rp.x, rp.y);
        grad.addColorStop(0, "rgba(242,184,92,.54)");
        grad.addColorStop(1, "rgba(87,176,255,.10)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.quadraticCurveTo(mx, my, rp.x, rp.y); ctx.stroke();
      }
    }
    ctx.restore();

    // Limbe atmosphérique très fin.
    const halo = ctx.createRadialGradient(cx, cy, R * .82, cx, cy, R * 1.12);
    halo.addColorStop(0, "rgba(80,150,230,0)");
    halo.addColorStop(.72, "rgba(76,151,235,.04)");
    halo.addColorStop(.9, "rgba(91,175,255,.18)");
    halo.addColorStop(1, "rgba(91,175,255,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(124,190,255,.35)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // Étoile du propriétaire : précise, lisible, sans halo envahissant.
    if (sp.vis > 0) {
      const own = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 58);
      own.addColorStop(0, "rgba(255,248,225,.95)");
      own.addColorStop(.15, "rgba(255,190,82,.55)");
      own.addColorStop(1, "rgba(255,170,60,0)");
      ctx.fillStyle = own; ctx.beginPath(); ctx.arc(sp.x, sp.y, 58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff5df"; ctx.beginPath(); ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,211,139,.9)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,231,190,.95)";
      ctx.font = "500 31px ui-sans-serif,system-ui,sans-serif";
      ctx.fillText(stats.firstName || "YOUR LIGHT", sp.x + 34, sp.y - 5);
      ctx.fillStyle = "rgba(202,214,230,.68)";
      ctx.font = "300 23px ui-sans-serif,system-ui,sans-serif";
      ctx.fillText(`${stats.city || "Earth"} · France`, sp.x + 34, sp.y + 29);
    }

    // Signature éditoriale et compteur.
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(242,199,132,.92)";
    ctx.font = "300 52px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("T E L L I U M", cx, 130);
    ctx.fillStyle = "rgba(212,223,238,.46)";
    ctx.font = "300 23px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("THE LIVING PORTRAIT OF HUMANITY", cx, 176);

    ctx.fillStyle = "#f6f7f8";
    ctx.font = "200 136px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(stats.total.toLocaleString("en-US"), cx, OH * .875);
    ctx.fillStyle = "rgba(236,195,132,.75)";
    ctx.font = "300 26px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("HUMANS CONNECTED NOW", cx, OH * .905);

    const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    const timeStr = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(218,229,241,.64)";
    ctx.font = "300 24px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`${dateStr} · ${timeStr}`, 120, OH - 110);
    ctx.fillText(`${stats.countries} countries · ${stats.cities} cities`, 120, OH - 72);
    ctx.textAlign = "right";
    ctx.fillText(`Moment #${stamp}`, OW - 120, OH - 110);
    ctx.fillText("THIS CONSTELLATION WILL NEVER EXIST AGAIN", OW - 120, OH - 72);

    ctx.strokeStyle = "rgba(230,181,108,.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, OW - 88, OH - 88);

    return { dataUrl: cv.toDataURL("image/png"), reference: stamp };
  }

  // ---------- dimensionnement ----------
  private resize = () => {
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.W * this.DPR);
    this.canvas.height = Math.round(this.H * this.DPR);
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.cam.setViewport(this.W, this.H);
    this.globe.setViewport(this.W, this.H);
    this.buildBgStars();
  };

  private buildBgStars() {
    this.bgStars = Array.from({ length: Math.round((this.W * this.H) / 11000) }, () => ({
      x: Math.random() * this.W,
      y: Math.random() * this.H,
      r: Math.random() * 0.9 + 0.15,
      a: Math.random() * 0.32 + 0.04,
      ph: Math.random() * Math.PI * 2,
      sp: rnd(0.2, 0.8),
    }));
  }

  // ---------- projection unifiée ----------
  private projectPoint(nx: number, ny: number): Proj {
    if (this.mode === "flat") {
      const p = this.cam.toScreen(nx, ny);
      return { x: p.x, y: p.y, vis: true, depth: 1, scale: this.cam.pxScale };
    }
    const g = this.globe.projectNorm(nx, ny);
    return { x: g.x, y: g.y, vis: g.vis, depth: g.depth, scale: this.globe.pxScale * (0.55 + 0.45 * Math.max(0, g.depth)) };
  }

  private limbFade(depth: number): number {
    if (this.mode === "flat") return 1;
    return 0.12 + 0.88 * Math.max(0, Math.min(1, (depth - 0.02) / 0.32));
  }

  // ---------- arrivées ----------
  private pushArrival(e: ArrivalEvent) {
    const n = projectNorm(e.latitude, e.longitude);
    if (e.self) {
      this.selfNorm = n;
      this.selfBorn = performance.now();
      if (this.mode === "flat") {
        this.cam.focus(n.nx, n.ny, 2.4);
        setTimeout(() => this.cam.reset(), 2600);
      } else {
        this.globe.faceNorm(n.nx, n.ny);
      }
    }
    const edge = Math.random() < 0.5 ? -60 : this.W + 60;
    this.arrivals.push({
      nx: n.nx,
      ny: n.ny,
      fromX: edge,
      fromY: rnd(this.H * 0.1, this.H * 0.45),
      start: performance.now(),
      invited: !!e.invited,
      self: !!e.self,
    });
    this.stars.push(spawnStar(n.nx, n.ny, e.cellId, performance.now()));
    if (this.stars.length > MAX_STARS) this.stars.splice(0, this.stars.length - MAX_STARS);

    const label = `${e.city}, ${COUNTRY_NAMES[e.countryCode] || e.countryCode}`;
    if (e.self) this.cb.onToast?.(`Your light appeared from <b>${label}</b>`);
    else if (e.invited) this.cb.onToast?.(`Someone you invited just joined from <b>${label}</b>`, "friend");
  }

  // ---------- helpers de dessin ----------
  private screenRect(): Rect {
    const o = this.cam.toScreen(0, 0);
    const base = this.cam.getBase();
    const z = this.cam.zoom;
    return { x: o.x, y: o.y, w: base.w * z, h: base.h * z };
  }

  private halo(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(0.42, `rgba(${rgb},${alpha * 0.32})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlatBackdrop(ctx: CanvasRenderingContext2D) {
    const sr = this.screenRect();
    ctx.save();
    ctx.strokeStyle = "rgba(92,145,220,0.042)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      const x = sr.x + (i / 12) * sr.w;
      if (x < -5 || x > this.W + 5) continue;
      ctx.beginPath();
      ctx.moveTo(x, Math.max(0, sr.y));
      ctx.lineTo(x, Math.min(this.H, sr.y + sr.h));
      ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const y = sr.y + (i / 6) * sr.h;
      if (y < -5 || y > this.H + 5) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, sr.x), y);
      ctx.lineTo(Math.min(this.W, sr.x + sr.w), y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGlobeBackdrop(ctx: CanvasRenderingContext2D) {
    const cx = this.W / 2;
    const cy = this.H / 2;
    const R = this.globe.radius;
    const atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.28);
    atm.addColorStop(0, "rgba(55,118,220,0)");
    atm.addColorStop(0.43, "rgba(62,132,235,0.11)");
    atm.addColorStop(0.68, "rgba(255,185,95,0.045)");
    atm.addColorStop(1, "rgba(55,118,220,0)");
    ctx.fillStyle = atm;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
    ctx.fill();
    const disc = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.3, R * 0.08, cx, cy, R);
    disc.addColorStop(0, "#090a0b");
    disc.addColorStop(0.68, "#030405");
    disc.addColorStop(1, "#010102");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(100,170,255,0.19)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawLandDots(ctx: CanvasRenderingContext2D, boost: number) {
    if (!this.landDots || this.landDots.length === 0) return;
    ctx.globalCompositeOperation = "lighter";

    // La « constellation dormante » rend la Terre reconnaissable même avec
    // très peu de visiteurs. Elle reste volontairement froide et presque
    // éteinte : seules les présences réelles utilisent l'or chaud.
    const populationStage = Math.min(1, Math.log10(Math.max(10, this.currentTotal)) / 8);
    const base = (0.145 + populationStage * 0.026) * boost;
    for (const dot of this.landDots) {
      const n = projectNorm(dot.lat, dot.lng);
      const p = this.projectPoint(n.nx, n.ny);
      if (!p.vis) continue;
      if (p.x < -4 || p.x > this.W + 4 || p.y < -4 || p.y > this.H + 4) continue;
      const a = base * this.limbFade(p.depth);
      if (a <= 0.003) continue;
      ctx.fillStyle = `rgba(132,153,180,${a})`;
      const size = Math.max(0.72, 0.8 * p.scale);
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }

  /** Fines lignes de constellation reliant les villes actives proches. */
  private drawNetwork(ctx: CanvasRenderingContext2D) {
    const pts: { x: number; y: number }[] = [];
    for (const g of this.glows) {
      const p = this.projectPoint(g.nx, g.ny);
      if (p.vis && p.x > -40 && p.x < this.W + 40 && p.y > -40 && p.y < this.H + 40) pts.push({ x: p.x, y: p.y });
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;
    const maxD = Math.min(this.W, this.H) * 0.2;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d > maxD) continue;
        ctx.strokeStyle = `rgba(105,155,225,${(1 - d / maxD) * 0.022})`;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }

  /** Limbe de la planète vue depuis l'espace (bas de l'écran, mode carte plate). */
  private drawLimb(ctx: CanvasRenderingContext2D) {
    const W = this.W;
    const H = this.H;
    const R = W * 1.15;
    const cxL = W / 2;
    const cyL = H + R - H * 0.1;
    const topY = cyL - R;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const body = ctx.createRadialGradient(cxL, topY + H * 0.7, 0, cxL, topY + H * 0.7, W * 0.95);
    body.addColorStop(0, "#061022");
    body.addColorStop(0.62, "#030815");
    body.addColorStop(1, "#010309");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cxL, cyL, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Signature Tellium : limbe bleu spatial + point de lever de soleil or.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const blueGlow = ctx.createRadialGradient(cxL, topY, 0, cxL, topY, W * 0.62);
    blueGlow.addColorStop(0, "rgba(255,215,145,0.38)");
    blueGlow.addColorStop(0.1, "rgba(90,165,255,0.24)");
    blueGlow.addColorStop(0.48, "rgba(45,118,225,0.11)");
    blueGlow.addColorStop(1, "rgba(45,118,225,0)");
    ctx.fillStyle = blueGlow;
    ctx.fillRect(0, Math.max(0, topY - W * 0.55), W, W * 0.72);

    const rim = ctx.createLinearGradient(0, 0, W, 0);
    rim.addColorStop(0, "rgba(56,130,236,0.03)");
    rim.addColorStop(0.28, "rgba(82,157,255,0.45)");
    rim.addColorStop(0.5, "rgba(255,224,165,0.76)");
    rim.addColorStop(0.72, "rgba(82,157,255,0.45)");
    rim.addColorStop(1, "rgba(56,130,236,0.03)");
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cxL, cyL, R, Math.PI * 1.28, Math.PI * 1.72);
    ctx.stroke();

    const sunrise = ctx.createRadialGradient(cxL, topY, 0, cxL, topY, W * 0.12);
    sunrise.addColorStop(0, "rgba(255,245,215,0.95)");
    sunrise.addColorStop(0.14, "rgba(255,190,88,0.55)");
    sunrise.addColorStop(1, "rgba(255,155,50,0)");
    ctx.fillStyle = sunrise;
    ctx.fillRect(cxL - W * 0.14, topY - W * 0.14, W * 0.28, W * 0.28);
    ctx.restore();
  }

  // ---------- RENDU DE SCÈNE (partagé écran + export) ----------
  private renderScene(ctx: CanvasRenderingContext2D, now: number, opts: SceneOpts) {
    const gallery = opts.gallery ?? 0;

    if (opts.paintBg) {
      const bg = ctx.createRadialGradient(this.W / 2, this.H * 0.42, 0, this.W / 2, this.H * 0.42, Math.max(this.W, this.H) * 0.72);
      bg.addColorStop(0, "#0a0a0b");
      bg.addColorStop(0.43, "#060607");
      bg.addColorStop(0.72, "#030304");
      bg.addColorStop(1, "#010102");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.W, this.H);
    } else {
      ctx.clearRect(0, 0, this.W, this.H);
    }

    // étoiles de fond
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.bgStars) {
      const tw = 0.6 + 0.4 * Math.sin(now * 0.001 * s.sp + s.ph);
      ctx.fillStyle = `rgba(185,210,245,${s.a * 0.7 * tw})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // fond de carte / globe
    ctx.globalCompositeOperation = "source-over";
    if (this.mode === "flat") this.drawFlatBackdrop(ctx);
    else this.drawGlobeBackdrop(ctx);

    // base de Terre en points (continents toujours lisibles)
    this.drawLandDots(ctx, 1 + 0.8 * gallery);

    // lignes de constellation entre villes actives
    if (!this.cleanCapture) this.drawNetwork(ctx);

    // halos de densité
    ctx.globalCompositeOperation = "lighter";
    if (!this.cleanCapture) for (const c of this.glows) {
      const p = this.projectPoint(c.nx, c.ny);
      if (!p.vis) continue;
      if (p.x < -80 || p.x > this.W + 80 || p.y < -80 || p.y > this.H + 80) continue;
      const rad = Math.min(34, 7 + Math.log10(c.users + 1) * 7) * p.scale;
      const a = Math.min(0.026, 0.009 * c.intensity + 0.006) * this.limbFade(p.depth) * (1 + 0.22 * gallery);
      this.halo(ctx, p.x, p.y, Math.max(8, rad * 1.7), "72,118,178", a * 0.18);
      this.halo(ctx, p.x, p.y, Math.max(7, rad * 1.15), "255,185,105", a * 0.72);
    }

    // étoiles individuelles
    for (const s of this.stars) {
      const p = this.projectPoint(s.nx, s.ny);
      if (!p.vis) continue;
      if (p.x < -20 || p.x > this.W + 20 || p.y < -20 || p.y > this.H + 20) continue;
      const a = Math.min(0.85, starAlpha(s, now)) * this.limbFade(p.depth);
      if (a <= 0.012) continue;
      const rr = Math.max(0.4, starRadius(s, now) * p.scale);
      if (s.tier === 2) {
        const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 4);
        gg.addColorStop(0, `rgba(${s.col},${a * 0.5})`);
        gg.addColorStop(1, `rgba(${s.col},0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${s.col},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // étoile personnelle
    let selfP: Proj | null = null;
    if (this.selfNorm) {
      const p = this.projectPoint(this.selfNorm.nx, this.selfNorm.ny);
      selfP = p;
      if (p.vis) {
        const intro = Math.max(0, 1 - (now - this.selfBorn) / 1000 / 6);
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.0032);
        const sc = p.scale;
        this.halo(ctx, p.x, p.y, (34 + 13 * pulse) * (0.9 + 0.3 * intro) * sc, "70,145,255", 0.12 + 0.09 * pulse + 0.06 * intro);
        this.halo(ctx, p.x, p.y, (20 + 9 * pulse) * sc, "255,198,110", 0.16 + 0.1 * pulse + 0.08 * intro);
        ctx.strokeStyle = `rgba(255,225,175,${0.55 + 0.3 * pulse})`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (6 + 2 * pulse) * sc + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#fff4de";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 * sc + 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // arrivées : étoile filante + onde lumineuse
    if (!this.cleanCapture) for (let i = this.arrivals.length - 1; i >= 0; i--) {
      const a = this.arrivals[i];
      const t = (now - a.start) / 1150;
      if (t >= 3.1) {
        this.arrivals.splice(i, 1);
        continue;
      }
      const tp = this.projectPoint(a.nx, a.ny);
      if (!tp.vis) continue;
      if (t < 1) {
        const e = 1 - Math.pow(1 - t, 3);
        const x = a.fromX + (tp.x - a.fromX) * e;
        const y = a.fromY + (tp.y - a.fromY) * e;
        const col = a.invited ? "255,119,200" : a.self ? "255,196,107" : "235,245,255";
        const vx = tp.x - a.fromX;
        const vy = tp.y - a.fromY;
        const len = Math.max(1, Math.hypot(vx, vy));
        const ux = vx / len;
        const uy = vy / len;
        const tail = 42 + 68 * (1 - t);
        const grad = ctx.createLinearGradient(x, y, x - ux * tail, y - uy * tail);
        grad.addColorStop(0, `rgba(${col},${0.95 - t * 0.25})`);
        grad.addColorStop(0.28, `rgba(${col},${0.48 * (1 - t)})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - ux * tail, y - uy * tail);
        ctx.stroke();
        this.halo(ctx, x, y, 20, col, 0.58 * (1 - t) + 0.2);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const ht = (t - 1) / 2.1;
        const pr = 1 - ht;
        const col = a.invited ? "255,119,200" : a.self ? "255,196,107" : "150,205,255";
        const rr = (8 + ht * 46) * tp.scale;
        ctx.strokeStyle = `rgba(${col},${0.28 * pr})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        this.halo(ctx, tp.x, tp.y, 22 * pr + 6, col, 0.34 * pr + 0.04);
        if (a.invited && selfP && selfP.vis) {
          ctx.strokeStyle = `rgba(255,150,215,${0.45 * pr})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(selfP.x, selfP.y);
          const mx = (selfP.x + tp.x) / 2;
          const my = Math.min(selfP.y, tp.y) - 40;
          ctx.quadraticCurveTo(mx, my, tp.x, tp.y);
          ctx.stroke();
        }
      }
    }

    // départs : la lumière quitte doucement sa position et devient étoile filante.
    if (!this.cleanCapture) for (let i = this.departures.length - 1; i >= 0; i--) {
      const d = this.departures[i];
      const t = (now - d.start) / 1050;
      if (t < 0) continue;
      if (t >= 1.15) {
        this.departures.splice(i, 1);
        continue;
      }
      const sp = this.projectPoint(d.nx, d.ny);
      if (!sp.vis) continue;
      const e = t < 1 ? t * t * (3 - 2 * t) : 1;
      const x = sp.x + (d.toX - sp.x) * e;
      const y = sp.y + (d.toY - sp.y) * e;
      const vx = d.toX - sp.x;
      const vy = d.toY - sp.y;
      const len = Math.max(1, Math.hypot(vx, vy));
      const ux = vx / len;
      const uy = vy / len;
      const tail = 34 + 62 * Math.min(1, t);
      const alpha = Math.max(0, 1 - Math.max(0, t - 0.78) / 0.37);
      const grad = ctx.createLinearGradient(x, y, x - ux * tail, y - uy * tail);
      grad.addColorStop(0, `rgba(145,195,255,${0.8 * alpha})`);
      grad.addColorStop(0.35, `rgba(115,165,235,${0.38 * alpha})`);
      grad.addColorStop(1, "rgba(95,145,215,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - ux * tail, y - uy * tail);
      ctx.stroke();
      this.halo(ctx, x, y, 12, "145,195,255", 0.35 * alpha);
      ctx.fillStyle = `rgba(235,247,255,${0.88 * alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";

    // limbe de la planète (bas de l'écran) en mode carte plate
    if (this.mode === "flat") this.drawLimb(ctx);

    if (!opts.export) {
      if (this.hoveredCellId) {
        const g = this.glows.find((x) => x.cellId === this.hoveredCellId);
        if (g) {
          const p = this.projectPoint(g.nx, g.ny);
          if (p.vis) {
            ctx.strokeStyle = "rgba(255,205,140,0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      if (this.selfNorm && selfP && selfP.vis) {
        const since = (now - this.selfBorn) / 1000;
        if (since < 7) {
          const fade = since > 6 ? 7 - since : since < 0.4 ? since / 0.4 : 1;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, fade));
          ctx.textAlign = "left";
          ctx.fillStyle = "#ffe6bf";
          ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText("You are here", selfP.x + 14, selfP.y - 8);
          ctx.fillStyle = "rgba(255,220,170,0.7)";
          ctx.font = "400 11px ui-sans-serif, system-ui, sans-serif";
          ctx.fillText("Lyon, France", selfP.x + 14, selfP.y + 7);
          ctx.restore();
        }
      }
    }

    // vignette / profondeur (Gallery Mode à l'écran ; l'export a sa propre finition)
    if (!opts.export && gallery > 0.01) {
      const vg = ctx.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.22, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(1,3,8,${0.5 * gallery})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  // ---------- finition musée (export) ----------
  private buildGrain() {
    const N = 160;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const g = c.getContext("2d");
    if (!g) return;
    const img = g.createImageData(N, N);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 26;
    }
    g.putImageData(img, 0, 0);
    this.grain = c;
  }

  private museumFinish(
    ctx: CanvasRenderingContext2D,
    OW: number,
    OH: number,
    stats: { total: number; countries: number; cities: number },
    d: Date,
    stamp: string,
  ) {
    // vignette d'exposition
    const vg = ctx.createRadialGradient(OW / 2, OH / 2, Math.min(OW, OH) * 0.28, OW / 2, OH / 2, Math.max(OW, OH) * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(1,3,8,0.5)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, OW, OH);

    // grain argentique
    if (!this.grain) this.buildGrain();
    if (this.grain) {
      const pat = ctx.createPattern(this.grain, "repeat");
      if (pat) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, OW, OH);
        ctx.restore();
      }
    }

    // textes épurés
    const u = OW / 3200; // échelle typographique
    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const timeStr = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
    ctx.textBaseline = "alphabetic";

    ctx.textAlign = "left";
    ctx.save();
    (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${14 * u}px`;
    ctx.font = `300 ${34 * u}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,224,180,0.55)";
    ctx.fillText("TELLIUM", OW * 0.06, OH * 0.1);
    ctx.restore();

    ctx.textAlign = "right";
    ctx.font = `300 ${23 * u}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(210,180,140,0.5)";
    ctx.fillText(`${dateStr} · ${timeStr}`, OW * 0.94, OH * 0.1);

    ctx.textAlign = "center";
    ctx.font = `200 ${66 * u}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "#eef4ff";
    ctx.fillText(`${stats.total.toLocaleString("en-US")}`, OW / 2, OH * 0.9);
    ctx.save();
    (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${3 * u}px`;
    ctx.font = `300 ${22 * u}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(215,185,140,0.6)";
    ctx.fillText(`PEOPLE CONNECTED  ·  ${stats.countries} COUNTRIES`, OW / 2, OH * 0.9 + 44 * u);
    ctx.restore();
    ctx.font = `300 ${19 * u}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(180,150,110,0.5)";
    ctx.fillText(`Moment #${stamp} · unique edition`, OW / 2, OH * 0.9 + 80 * u);
  }

  // ---------- boucle ----------
  private draw = () => {
    if (!this.frozen) {
      this.cam.update();
      this.globe.update();
    }
    const now = this.frozen ? this.freezeTime : performance.now();
    this.galleryLevel += ((this.galleryOn ? 1 : 0) - this.galleryLevel) * 0.06;
    this.renderScene(this.ctx, now, { gallery: this.galleryLevel });
    this.raf = requestAnimationFrame(this.draw);
  };

  // ---------- picking ----------
  private nearestGlow(mx: number, my: number, maxPx = 22): CellGlow | null {
    let best: CellGlow | null = null;
    let bd = maxPx * maxPx;
    if (!this.cleanCapture) for (const c of this.glows) {
      const p = this.projectPoint(c.nx, c.ny);
      if (!p.vis) continue;
      const d = (p.x - mx) ** 2 + (p.y - my) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  private localXY(ev: PointerEvent | MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  private emitHover(g: CellGlow | null) {
    if (!g) {
      if (this.hoveredCellId !== null) {
        this.hoveredCellId = null;
        this.cb.onHover?.(null);
      }
      return;
    }
    if (g.cellId === this.hoveredCellId) return;
    this.hoveredCellId = g.cellId;
    const country = this.source.getCountry(g.countryCode);
    const p = this.projectPoint(g.nx, g.ny);
    this.cb.onHover?.({
      country: COUNTRY_NAMES[g.countryCode] || g.countryCode,
      people: country ? country.activeUsers : g.users,
      cities: country ? country.citiesRepresented : 1,
      lastArrivalSec: country ? Math.max(1, Math.round((Date.now() - country.lastArrivalAt) / 1000)) : 1,
      x: p.x,
      y: p.y,
    });
  }

  // ---------- interaction ----------
  private onPointerDown = (ev: PointerEvent) => {
    this.canvas.setPointerCapture(ev.pointerId);
    this.pointers.set(ev.pointerId, this.localXY(ev));
    this.dragMoved = 0;
    this.downAt = performance.now();
    if (this.mode === "globe") this.globe.setDragging(true);
    else this.cam.startPan();
    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
    this.canvas.style.cursor = "grabbing";
  };

  private onPointerMove = (ev: PointerEvent) => {
    const prev = this.pointers.get(ev.pointerId);
    const cur = this.localXY(ev);
    if (!prev) {
      const g = this.nearestGlow(cur.x, cur.y);
      this.canvas.style.cursor = g ? "pointer" : "grab";
      this.emitHover(g);
      return;
    }
    this.pointers.set(ev.pointerId, cur);
    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (this.pinchDist > 0) {
        const f = dist / this.pinchDist;
        if (this.mode === "flat") this.cam.zoomAt(mid.x, mid.y, f, false);
        else this.globe.zoomBy(f);
      }
      this.pinchDist = dist;
      this.dragMoved += 20;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    if (this.mode === "flat") this.cam.panBy(dx, dy);
    else this.globe.rotateBy(dx, dy);
    if (this.hoveredCellId) this.emitHover(null);
  };

  private onPointerUp = (ev: PointerEvent) => {
    const wasClick = this.dragMoved < 6 && performance.now() - this.downAt < 350;
    const pos = this.localXY(ev);
    this.pointers.delete(ev.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0 && this.mode === "globe") this.globe.setDragging(false);
    if (this.pointers.size === 0 && this.mode === "flat") this.cam.endPan();
    this.canvas.style.cursor = "grab";

    if (wasClick && this.pointers.size === 0) {
      if (this.selfNorm) {
        const sp = this.projectPoint(this.selfNorm.nx, this.selfNorm.ny);
        if (sp.vis && (sp.x - pos.x) ** 2 + (sp.y - pos.y) ** 2 < 24 * 24) {
          this.cb.onSelfClick?.(sp.x, sp.y);
          return;
        }
      }
      const t = performance.now();
      if (t - this.lastTapT < 300 && Math.hypot(pos.x - this.lastTapX, pos.y - this.lastTapY) < 30) {
        if (this.mode === "flat") this.cam.zoomAt(pos.x, pos.y, 1.8, true);
        else this.globe.zoomBy(1.6);
        this.lastTapT = 0;
      } else {
        this.lastTapT = t;
        this.lastTapX = pos.x;
        this.lastTapY = pos.y;
        const c = this.nearestGlow(pos.x, pos.y);
        if (c) {
          const country = this.source.getCountry(c.countryCode);
          const ago = country ? Math.max(1, Math.round((Date.now() - country.lastArrivalAt) / 1000)) : 1;
          this.cb.onToast?.(`Someone joined from <b>${c.city}, ${COUNTRY_NAMES[c.countryCode] || c.countryCode}</b> · ${ago}s ago`);
        }
      }
    }
  };

  private onPointerLeave = () => {
    this.emitHover(null);
    if (this.mode === "globe") this.globe.setDragging(false);
    else this.cam.endPan();
    this.canvas.style.cursor = "grab";
  };

  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const pos = this.localXY(ev);
    const factor = Math.exp(-ev.deltaY * 0.0016);
    if (this.mode === "flat") this.cam.zoomAt(pos.x, pos.y, factor, true);
    else this.globe.zoomBy(factor);
  };

  private onDblClick = (ev: MouseEvent) => {
    const pos = this.localXY(ev);
    if (this.mode === "flat") this.cam.zoomAt(pos.x, pos.y, 1.8, true);
    else this.globe.zoomBy(1.6);
  };
}
