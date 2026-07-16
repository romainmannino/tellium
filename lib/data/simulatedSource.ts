import type { PresenceSnapshot, ArrivalEvent, CountryPresence, PresenceCell } from "@/lib/types";
import type { PresenceSource } from "./presenceSource";
import { CITY_SEED, SELF_CITY, type CitySeed } from "./cities";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type LiveCity = CitySeed & { id: number; users: number; lastArrivalAt: number };

/**
 * Source de présence SIMULÉE.
 * Fait vivre le compteur (arrivées en rafale, départs discrets) et expose les
 * mêmes méthodes que la future source temps réel.
 */
export class SimulatedSource implements PresenceSource {
  private cities: LiveCity[];
  private handlers: Array<(e: ArrivalEvent) => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private simulationLocked = false;

  constructor() {
    this.cities = CITY_SEED.map((c, i) => ({
      ...c,
      id: i,
      users: Math.round(c.weight * rnd(90, 220)),
      lastArrivalAt: Date.now() - Math.round(rnd(0, 20000)),
    }));
  }

  private cell(c: LiveCity): PresenceCell {
    return {
      cellId: `sim-${c.id}`,
      latitude: c.lat,
      longitude: c.lng,
      activeUsers: c.users,
      countryCode: c.cc,
      city: c.name,
      intensity: Math.min(1, 0.25 + Math.sqrt(c.users) / 45),
    };
  }

  private toEvent(c: LiveCity, extra: Partial<ArrivalEvent> = {}): ArrivalEvent {
    return {
      cellId: `sim-${c.id}`,
      city: c.name,
      countryCode: c.cc,
      latitude: c.lat,
      longitude: c.lng,
      ts: c.lastArrivalAt,
      ...extra,
    };
  }

  private emit(e: ArrivalEvent) {
    for (const h of this.handlers) h(e);
  }

  private byName(name: string) {
    return this.cities.find((c) => c.name === name);
  }

  getSnapshot(): PresenceSnapshot {
    const active = this.cities.filter((c) => c.users > 0);
    return {
      timestamp: Date.now(),
      totalActiveUsers: this.cities.reduce((s, c) => s + c.users, 0),
      countriesRepresented: new Set(active.map((c) => c.cc)).size,
      citiesRepresented: active.length,
      cells: this.cities.map((c) => this.cell(c)),
    };
  }

  getCountry(countryCode: string): CountryPresence | null {
    const inC = this.cities.filter((c) => c.cc === countryCode && c.users > 0);
    if (!inC.length) return null;
    return {
      countryCode,
      activeUsers: inC.reduce((s, c) => s + c.users, 0),
      citiesRepresented: inC.length,
      lastArrivalAt: Math.max(...inC.map((c) => c.lastArrivalAt)),
    };
  }

  onArrival(handler: (e: ArrivalEvent) => void) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  registerSelf(city = SELF_CITY): ArrivalEvent | null {
    const c = this.byName(city);
    if (!c) return null;
    c.users += 1;
    c.lastArrivalAt = Date.now();
    const e = this.toEvent(c, { self: true });
    this.emit(e);
    return e;
  }

  inviteJoin(): ArrivalEvent | null {
    const pool = this.cities.filter((c) => c.name !== SELF_CITY);
    const c = pool[Math.floor(rnd(0, pool.length))];
    c.users += 1;
    c.lastArrivalAt = Date.now();
    const e = this.toEvent(c, { invited: true });
    this.emit(e);
    return e;
  }


  /** Mode laboratoire V9 : impose un total simulé et le répartit sur les villes.
   * La répartition reste stable pour qu’un même nombre produise la même œuvre. */
  setTargetTotal(total: number) {
    const target = Math.max(1, Math.round(total));
    this.simulationLocked = true;
    const weights = this.cities.map((c) => Math.max(0.001, c.weight));
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sum) * target);
    const base = raw.map((v) => Math.floor(v));
    let left = target - base.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; k < left; k += 1) base[order[k % order.length].i] += 1;
    const now = Date.now();
    this.cities.forEach((c, i) => {
      c.users = base[i];
      if (c.users > 0) c.lastArrivalAt = now - ((i * 977) % 18000);
    });
  }

  /** Ajuste le total de quelques personnes et émet de vraies arrivées.
   * Les diminutions sont détectées par le renderer au snapshot suivant. */
  nudgeTotal(delta: number) {
    const amount = Math.min(20, Math.abs(Math.trunc(delta)));
    if (!amount) return;
    if (delta > 0) {
      for (let i = 0; i < amount; i += 1) {
        const c = this.cities[Math.floor(rnd(0, this.cities.length))];
        c.users += 1;
        c.lastArrivalAt = Date.now();
        this.emit(this.toEvent(c));
      }
    } else {
      for (let i = 0; i < amount; i += 1) {
        const pool = this.cities.filter((c) => c.users > 0);
        if (!pool.length) break;
        const c = pool[Math.floor(rnd(0, pool.length))];
        c.users = Math.max(0, c.users - 1);
      }
    }
  }

  resumeLiveSimulation() {
    this.simulationLocked = false;
  }

  private spawn() {
    if (this.simulationLocked) return;
    const c = this.cities[Math.floor(rnd(0, this.cities.length))];
    c.users += 1;
    c.lastArrivalAt = Date.now();
    this.emit(this.toEvent(c));
  }

  private churn() {
    if (this.simulationLocked) return;
    if (Math.random() < 0.35) {
      const c = this.cities[Math.floor(rnd(0, this.cities.length))];
      if (c.users > 1) c.users -= 1;
    }
  }

  start() {
    const loop = () => {
      const burst = Math.random() < 0.15 ? Math.floor(rnd(2, 6)) : 1;
      for (let i = 0; i < burst; i++) setTimeout(() => this.spawn(), i * 90);
      this.churn();
      this.timer = setTimeout(loop, rnd(500, 1400));
    };
    loop();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
