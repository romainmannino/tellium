"use client";
import type { ViewMode } from "@/lib/engine/renderer";

/** Sélecteur coulissant carte plate / globe — icônes uniquement, sans libellé texte. */
export default function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="mode-toggle" role="group" aria-label="View mode">
      <div className="thumb" style={{ transform: mode === "globe" ? "translateX(100%)" : "translateX(0)" }} />
      <button
        className={`seg${mode === "flat" ? " active" : ""}`}
        onClick={() => onChange("flat")}
        aria-label="Flat map"
        aria-pressed={mode === "flat"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v16M15 6v16" />
        </svg>
      </button>
      <button
        className={`seg${mode === "globe" ? " active" : ""}`}
        onClick={() => onChange("globe")}
        aria-label="Globe"
        aria-pressed={mode === "globe"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      </button>
    </div>
  );
}
