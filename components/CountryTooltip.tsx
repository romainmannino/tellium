"use client";
import type { HoverInfo } from "@/lib/engine/renderer";

/**
 * Fiche élégante affichée au survol d'une zone dense.
 * Positionnée en coordonnées écran (le canvas couvre tout le viewport).
 */
export default function CountryTooltip({ info }: { info: HoverInfo | null }) {
  if (!info) return null;
  return (
    <div className="tooltip" style={{ left: info.x, top: info.y }} aria-hidden>
      <div className="tt-country">{info.country}</div>
      <div className="tt-row">
        <b>{info.people.toLocaleString("en-US")}</b> people connected
      </div>
      <div className="tt-row">
        <b>{info.cities}</b> {info.cities > 1 ? "cities" : "city"} represented
      </div>
      <div className="tt-ago">Last arrival {info.lastArrivalSec}s ago</div>
    </div>
  );
}
