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
  delay: number;
  opacity: number;
};

const BASE_STARS: Star[] = [
  { x: 18, y: 36, size: 3.8, delay: 0.1, opacity: 0.88 },
  { x: 25, y: 21, size: 5.2, delay: 0.7, opacity: 1 },
  { x: 34, y: 29, size: 3.2, delay: 1.3, opacity: 0.72 },
  { x: 43, y: 16, size: 4.6, delay: 0.4, opacity: 0.94 },
  { x: 52, y: 27, size: 3.4, delay: 1.8, opacity: 0.8 },
  { x: 62, y: 18, size: 5.6, delay: 1.1, opacity: 1 },
  { x: 72, y: 31, size: 3.5, delay: 2.1, opacity: 0.76 },
  { x: 81, y: 20, size: 4.2, delay: 0.2, opacity: 0.92 },
  { x: 76, y: 45, size: 3.1, delay: 1.6, opacity: 0.7 },
  { x: 64, y: 42, size: 4.8, delay: 0.9, opacity: 0.98 },
  { x: 53, y: 47, size: 3.2, delay: 2.5, opacity: 0.73 },
  { x: 42, y: 41, size: 4.1, delay: 1.4, opacity: 0.9 },
  { x: 31, y: 49, size: 3.5, delay: 0.5, opacity: 0.78 },
];

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [2, 11],
  [4, 10],
  [5, 9],
];

function seededValue(seed: number): number {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
}

export default function TelliumConstellation({
  totalLights,
  launchId,
  active = true,
}: TelliumConstellationProps) {
  const stars = useMemo(() => {
    const additionalCount = Math.min(22, Math.max(0, totalLights - 1));

    const additionalStars: Star[] = Array.from(
      { length: additionalCount },
      (_, index) => ({
        x: 14 + seededValue(index + 11) * 72,
        y: 12 + seededValue(index + 37) * 43,
        size: 1.5 + seededValue(index + 71) * 2.8,
        delay: seededValue(index + 103) * 3,
        opacity: 0.42 + seededValue(index + 151) * 0.45,
      }),
    );

    return [...BASE_STARS, ...additionalStars];
  }, [totalLights]);

  return (
    <div
      className={`tellium-constellation${active ? " is-visible" : ""}`}
      aria-hidden
    >
      <div className="tellium-constellation-glow" />

      <svg
        className="tellium-constellation-lines"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="tellium-line-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="rgba(241,190,103,0.08)" />
            <stop offset="45%" stopColor="rgba(241,190,103,0.48)" />
            <stop offset="100%" stopColor="rgba(112,174,255,0.15)" />
          </linearGradient>
        </defs>

        {CONNECTIONS.map(([fromIndex, toIndex], index) => {
          const from = BASE_STARS[fromIndex];
          const to = BASE_STARS[toIndex];

          return (
            <line
              key={`${fromIndex}-${toIndex}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="tellium-constellation-line"
              style={{ animationDelay: `${index * 90}ms` }}
            />
          );
        })}
      </svg>

      <div className="tellium-star-field">
        {stars.map((star, index) => (
          <span
            key={`${star.x}-${star.y}-${index}`}
            className={`tellium-constellation-star${
              index < BASE_STARS.length ? " is-primary" : ""
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
      </div>

      <div key={launchId} className="tellium-light-launch">
        <span className="tellium-launch-source" />
        <span className="tellium-launch-trail" />
        <span className="tellium-launch-star" />
        <span className="tellium-launch-impact" />
      </div>

      <div className="tellium-constellation-title">
        <span>THE LIVING CONSTELLATION</span>
        <small>Every light becomes part of the artwork</small>
      </div>
    </div>
  );
}
