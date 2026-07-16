/**
 * Gestion de présence (stub V1).
 * Aujourd'hui : session anonyme locale + heartbeat "à blanc".
 * Demain : POST /api/heartbeat toutes les 20–30 s ; déconnexion après 60–90 s.
 * Ne jamais stocker l'IP brute ni la position exacte.
 */
export type PresenceSession = {
  sessionId: string;
  connectedAt: number;
  lastHeartbeatAt: number;
  countryCode?: string;
  city?: string;
  cellId?: string;
};

const HEARTBEAT_MS = 25_000;

export function createSession(city?: string, countryCode?: string): PresenceSession {
  return {
    sessionId: crypto.randomUUID(),
    connectedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    city,
    countryCode,
  };
}

/** Démarre le heartbeat. `send` sera branché sur l'API temps réel plus tard. */
export function startHeartbeat(
  session: PresenceSession,
  send: (s: PresenceSession) => void = () => {},
): () => void {
  const id = setInterval(() => {
    session.lastHeartbeatAt = Date.now();
    send(session);
  }, HEARTBEAT_MS);
  return () => clearInterval(id);
}
