"use client";

/** Contrôles discrets de navigation carte : zoom, vue monde, recentrage sur ma lumière. */
export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFindMe,
  canFindMe,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFindMe: () => void;
  canFindMe: boolean;
}) {
  return (
    <div className="map-controls">
      <button className="ctrl" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        +
      </button>
      <button className="ctrl" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        −
      </button>
      <button className="ctrl" onClick={onReset} aria-label="World view" title="World view">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </svg>
      </button>
      <button
        className="ctrl find"
        onClick={onFindMe}
        disabled={!canFindMe}
        aria-label="Find my light"
        title="Find my light"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
        </svg>
      </button>
    </div>
  );
}
