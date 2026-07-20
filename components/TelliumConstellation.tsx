"use client";

import { useMemo } from "react";

type TelliumConstellationProps = {
  totalLights: number;
  launchId: number;
  active?: boolean;
};

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  permanent: boolean;
};

function random(seed: number): number {
  const value = Math.sin(seed * 9283.17) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Génère une constellation dans l’espace autour de la Terre.
 * La zone centrale reste volontairement vide.
 */
function createOrbitalStars(totalLights: number): Star[] {
  const visibleCount = Math.min(80, Math.max(28, totalLights + 24));

  return Array.from({ length: visibleCount }, (_, index) => {
    const angle = random(index + 18) * Math.PI * 2;

    /*
     * Orbite elliptique autour du globe.
     * Le rayon minimum empêche les étoiles d’apparaître dans la Terre.
     */
    const radiusX = 29 + random(index + 46) * 17;
    const radiusY = 25 + random(index + 91) * 18;

    return {
      x: 50 + Math.cos(angle) * radiusX,
      y: 47 + Math.sin(angle) * radiusY,
      size: 1.5 + random(index + 135) * 4.4,
      opacity: 0.46 + random(index + 187) * 0.54,
      delay: random(index + 245) * 4,
      permanent: index < Math.min(totalLights, visibleCount),
    };
  });
}

export default function TelliumConstellation({
  totalLights,
  launchId,
  active = true,
}: TelliumConstellationProps) {
  const stars = useMemo(
    () => createOrbitalStars(totalLights),
    [totalLights],
  );

  const connectedStars = stars.slice(0, Math.min(18, stars.length));

  return (
    <div
      className={`v2-constellation${active ? " is-visible" : ""}`}
      aria-hidden
    >
      <div className="v2-constellation-nebula" />

      <svg
        className="v2-constellation-connections"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {connectedStars.slice(0, -1).map((star, index) => {
          const next = connectedStars[index + 1];

          return (
            <line
              key={`${index}-${index + 1}`}
              x1={star.x}
              y1={star.y}
              x2={next.x}
              y2={next.y}
              style={{ animationDelay: `${index * 80}ms` }}
            />
          );
        })}
      </svg>

      {stars.map((star, index) => (
        <span
          key={`${star.x}-${star.y}-${index}`}
          className={`v2-orbital-star${
            star.permanent ? " is-registered" : ""
          }`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {launchId > 0 && (
        <div key={launchId} className="v2-light-journey">
          <span className="v2-light-origin" />
          <span className="v2-light-path" />
          <span className="v2-light-star" />
          <span className="v2-light-registration" />
        </div>
      )}

      <div className="v2-constellation-caption">
        <strong>THE LIVING CONSTELLATION</strong>
        <span>{Math.max(totalLights, 1).toLocaleString("en-US")} registered lights</span>
      </div>
    </div>
  );
}
