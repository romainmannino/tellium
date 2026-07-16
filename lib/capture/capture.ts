/** Déclenche le téléchargement d'une capture PNG déjà rendue par le moteur. */
export function downloadPng(dataUrl: string, reference: string) {
  const a = document.createElement("a");
  a.download = `tellium-moment-${reference}.png`;
  a.href = dataUrl;
  a.click();
}
