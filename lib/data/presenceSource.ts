import type { PresenceSnapshot, ArrivalEvent, CountryPresence } from "@/lib/types";

/**
 * Contrat unique entre l'application et la source de présence.
 * V1 : implémenté par SimulatedSource.
 * Plus tard : implémenter la même interface avec Supabase Realtime / WebSocket,
 * sans toucher au moteur visuel ni à l'UI.
 */
export interface PresenceSource {
  /** Instantané courant (compteur, pays, cellules). */
  getSnapshot(): PresenceSnapshot;

  /** Détail d'un pays (clic pays). */
  getCountry(countryCode: string): CountryPresence | null;

  /** S'abonner aux arrivées (étoiles filantes + incrément). Retourne un désabonnement. */
  onArrival(handler: (e: ArrivalEvent) => void): () => void;

  /** Enregistre l'arrivée de l'utilisateur courant (géoloc IP simulée). */
  registerSelf(city?: string): ArrivalEvent | null;

  /** Simule/déclenche l'arrivée d'un invité (boucle virale). */
  inviteJoin(): ArrivalEvent | null;

  /** Démarre la boucle de présence (heartbeats, churn…). */
  start(): void;
  stop(): void;
}
