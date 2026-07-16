/**
 * Tellium — modèle de données.
 * Ces types correspondent au brief et servent de contrat entre la couche de
 * données (simulée aujourd'hui, temps réel demain) et le moteur visuel.
 */

/** Cellule de présence agrégée (vue "monde" → on ne diffuse jamais 1M de points). */
export type PresenceCell = {
  cellId: string;
  latitude: number;
  longitude: number;
  activeUsers: number;
  countryCode: string;
  city?: string;
  /** 0..1 — utilisé par le moteur pour halos / particules. */
  intensity: number;
};

/** Présence agrégée par pays (pour clics pays, stats). */
export type CountryPresence = {
  countryCode: string;
  activeUsers: number;
  citiesRepresented: number;
  lastArrivalAt: number;
};

/** Instantané complet consommé par le moteur à chaque frame de données. */
export type PresenceSnapshot = {
  timestamp: number;
  totalActiveUsers: number;
  countriesRepresented: number;
  citiesRepresented: number;
  cells: PresenceCell[];
};

/** Événement "arrivée" (déclenche l'étoile filante + incrément compteur). */
export type ArrivalEvent = {
  cellId: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  ts: number;
  /** true si l'arrivant vient d'un lien d'invitation. */
  invited?: boolean;
  /** true si c'est VOTRE arrivée (étoile mise en évidence). */
  self?: boolean;
};

/** Moment capturé (image imprimable). */
export type CapturedMoment = {
  id: string;
  capturedAt: number;
  totalActiveUsers: number;
  countriesRepresented: number;
  userCellId?: string;
  reference: string;
};
