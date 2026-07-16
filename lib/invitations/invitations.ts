/**
 * Boucle virale V1 : lien partageable local. La future version remplacera
 * l'identifiant local par une invitation persistée côté backend.
 */
export type Invitation = {
  id: string;
  creatorSessionId: string;
  createdAt: number;
  url: string;
};

export function createInvitation(creatorSessionId: string): Invitation {
  const id = Math.random().toString(36).slice(2, 9).toUpperCase();
  const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "https://tellium.world";
  return { id, creatorSessionId, createdAt: Date.now(), url: `${base}?invite=${id}` };
}

export type ShareResult = "shared" | "copied" | "manual";

export async function shareInvitation(url: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "Join me on Tellium",
        text: "Light up the world with me. Watch your star appear live.",
        url,
      });
      return "shared";
    } catch {
      // The native sheet may have been cancelled; offer manual sharing.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual";
  }
}
