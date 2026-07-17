import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type {
  ArrivalEvent,
  CountryPresence,
  PresenceCell,
  PresenceSnapshot,
} from "@/lib/types";
import type { PresenceSource } from "./presenceSource";

type LivePresence = {
  sessionId: string;
  firstName?: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  joinedAt: number;
};

const DEFAULT_LOCATION = {
  city: "Lyon",
  countryCode: "FR",
  latitude: 45.764,
  longitude: 4.8357,
};

function getSessionId() {
  const key = "tellium-session-id";
  let id = window.localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }

  return id;
}

export class SupabasePresenceSource implements PresenceSource {
  private channel: RealtimeChannel | null = null;
  private handlers: Array<(event: ArrivalEvent) => void> = [];
  private presences = new Map<string, LivePresence>();

  private sessionId = "";
  private registered = false;
  private subscribed = false;
  private firstName = "";

  private location = { ...DEFAULT_LOCATION };

  private readonly supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  private toEvent(presence: LivePresence, self = false): ArrivalEvent {
    return {
      cellId: `live-${presence.sessionId}`,
      city: presence.city,
      countryCode: presence.countryCode,
      latitude: presence.latitude,
      longitude: presence.longitude,
      ts: presence.joinedAt,
      self,
    };
  }

  private emit(event: ArrivalEvent) {
    for (const handler of this.handlers) handler(event);
  }

  private async resolveLocation() {
    try {
      const response = await fetch("/api/location", { cache: "no-store" });
      if (!response.ok) return;

      const value = await response.json();

      if (
        typeof value.latitude === "number" &&
        typeof value.longitude === "number"
      ) {
        this.location = {
          city: value.city || DEFAULT_LOCATION.city,
          countryCode: value.countryCode || DEFAULT_LOCATION.countryCode,
          latitude: value.latitude,
          longitude: value.longitude,
        };
      }
    } catch {
      // La position par défaut reste utilisée.
    }
  }

  private currentPresence(): LivePresence {
    return {
      sessionId: this.sessionId,
      firstName: this.firstName || undefined,
      city: this.location.city,
      countryCode: this.location.countryCode,
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      joinedAt: Date.now(),
    };
  }

  private async trackSelf() {
    if (!this.channel || !this.subscribed || !this.registered) return;
    await this.channel.track(this.currentPresence());
  }

  private rebuildSnapshot() {
    if (!this.channel) return;

    const state = this.channel.presenceState<LivePresence>();
    const next = new Map<string, LivePresence>();

    for (const entries of Object.values(state)) {
      for (const presence of entries) {
        if (!presence.sessionId) continue;

        // Plusieurs onglets du même navigateur comptent comme une personne.
        if (!next.has(presence.sessionId)) {
          next.set(presence.sessionId, presence);
        }
      }
    }

    this.presences = next;
  }

  getSnapshot(): PresenceSnapshot {
    const grouped = new Map<string, PresenceCell>();

    for (const presence of this.presences.values()) {
      const cellId = [
        presence.countryCode,
        presence.city,
        presence.latitude.toFixed(2),
        presence.longitude.toFixed(2),
      ].join("-");

      const existing = grouped.get(cellId);

      if (existing) {
        existing.activeUsers += 1;
        existing.intensity = Math.min(
          1,
          0.25 + Math.sqrt(existing.activeUsers) / 12,
        );
      } else {
        grouped.set(cellId, {
          cellId,
          latitude: presence.latitude,
          longitude: presence.longitude,
          activeUsers: 1,
          countryCode: presence.countryCode,
          city: presence.city,
          intensity: 0.32,
        });
      }
    }

    const cells = [...grouped.values()];

    return {
      timestamp: Date.now(),
      totalActiveUsers: this.presences.size,
      countriesRepresented: new Set(
        [...this.presences.values()].map((p) => p.countryCode),
      ).size,
      citiesRepresented: new Set(
        [...this.presences.values()].map(
          (p) => `${p.countryCode}-${p.city}`,
        ),
      ).size,
      cells,
    };
  }

  getCountry(countryCode: string): CountryPresence | null {
    const matches = [...this.presences.values()].filter(
      (presence) => presence.countryCode === countryCode,
    );

    if (!matches.length) return null;

    return {
      countryCode,
      activeUsers: matches.length,
      citiesRepresented: new Set(matches.map((presence) => presence.city)).size,
      lastArrivalAt: Math.max(...matches.map((presence) => presence.joinedAt)),
    };
  }

  onArrival(handler: (event: ArrivalEvent) => void) {
    this.handlers.push(handler);

    return () => {
      this.handlers = this.handlers.filter((item) => item !== handler);
    };
  }

  registerSelf(): ArrivalEvent {
    this.registered = true;

    const presence = this.currentPresence();
    this.emit(this.toEvent(presence, true));
    void this.trackSelf();

    return this.toEvent(presence, true);
  }

  updateProfile(firstName: string) {
    this.firstName = firstName.trim().slice(0, 24);
    void this.trackSelf();
  }

  inviteJoin(): null {
    // Une invitation ne crée plus de faux connecté.
    return null;
  }

  start() {
    this.sessionId = getSessionId();

    void this.resolveLocation().then(() => {
      void this.trackSelf();
    });

    this.channel = this.supabase.channel("tellium:world", {
      config: {
        presence: {
          key: this.sessionId,
        },
      },
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        this.rebuildSnapshot();
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const joined = newPresences as unknown as LivePresence[];

        for (const presence of joined) {
          if (
            presence.sessionId &&
            presence.sessionId !== this.sessionId
          ) {
            this.emit(this.toEvent(presence));
          }
        }

        this.rebuildSnapshot();
      })
      .on("presence", { event: "leave" }, () => {
        this.rebuildSnapshot();
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;

        this.subscribed = true;
        void this.trackSelf();
      });
  }

  stop() {
    this.registered = false;
    this.subscribed = false;

    if (this.channel) {
      void this.channel.untrack();
      void this.supabase.removeChannel(this.channel);
    }

    this.channel = null;
    this.presences.clear();
  }
}
