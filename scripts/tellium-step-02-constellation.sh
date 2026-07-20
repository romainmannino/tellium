#!/usr/bin/env bash
set -euo pipefail

COMPONENT="components/TelliumExperience.tsx"
CONSTELLATION="components/TelliumConstellation.tsx"
CSS="app/globals.css"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".tellium-backups/step-02-$TIMESTAMP"

echo
echo "✦ TELLIUM V2 — STEP 02"
echo "  Visible constellation + ascending light"
echo

mkdir -p "$BACKUP_DIR"

cp "$COMPONENT" "$BACKUP_DIR/TelliumExperience.tsx"
cp "$CSS" "$BACKUP_DIR/globals.css"

if [[ -f "$CONSTELLATION" ]]; then
  cp "$CONSTELLATION" "$BACKUP_DIR/TelliumConstellation.tsx"
fi

echo "✓ Sauvegarde créée dans $BACKUP_DIR"

cat > "$CONSTELLATION" <<'EOF'
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
EOF

echo "✓ TelliumConstellation.tsx créé"

python3 <<'PY'
from pathlib import Path

path = Path("components/TelliumExperience.tsx")
text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text

    if new in text:
        print(f"↪ {label} déjà présent")
        return

    if old not in text:
        raise SystemExit(
            f"\n❌ Impossible d'ajouter : {label}\n"
            "Le texte de référence est introuvable."
        )

    text = text.replace(old, new, 1)
    print(f"✓ {label}")


replace_once(
    'import ConstellationQr from "@/components/ConstellationQr";',
    '''import ConstellationQr from "@/components/ConstellationQr";
import TelliumConstellation from "@/components/TelliumConstellation";''',
    "import de la constellation",
)

replace_once(
    '''  const [lastLightAt, setLastLightAt] = useState<string | null>(null);''',
    '''  const [lastLightAt, setLastLightAt] = useState<string | null>(null);
  const [constellationLaunchId, setConstellationLaunchId] = useState(0);''',
    "état de lancement",
)

replace_once(
    '''      onToast: (html, kind) => {
        setLastLightAt(new Date().toISOString());
        pushToast(html, kind);
      },''',
    '''      onToast: (html, kind) => {
        setLastLightAt(new Date().toISOString());
        setConstellationLaunchId((value) => value + 1);
        pushToast(html, kind);
      },''',
    "animation lors des arrivées distantes",
)

replace_once(
    '''      setLastLightAt(new Date().toISOString());
      setSelfReady(true);''',
    '''      setLastLightAt(new Date().toISOString());
      setConstellationLaunchId((value) => value + 1);
      setSelfReady(true);''',
    "animation lors de l'arrivée personnelle",
)

replace_once(
    '''      <div className="cosmic-blue" aria-hidden />''',
    '''      <div className="cosmic-blue" aria-hidden />

      <TelliumConstellation
        totalLights={stats.total}
        launchId={constellationLaunchId}
        active={scene !== "home"}
      />''',
    "affichage de la constellation",
)

path.write_text(text, encoding="utf-8")
print("✓ TelliumExperience.tsx mis à jour")
PY

if ! grep -q "TELLIUM V2 — VISIBLE CONSTELLATION" "$CSS"; then
cat >> "$CSS" <<'EOF'


/* =========================================================
   TELLIUM V2 — VISIBLE CONSTELLATION
   Step 02: every light leaves Earth and joins the artwork
   ========================================================= */

.tellium-constellation {
  position: fixed;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-22px) scale(1.03);
  transition:
    opacity 1.4s ease,
    transform 1.8s cubic-bezier(0.2, 0.75, 0.25, 1);
}

.tellium-constellation.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.tellium-constellation-glow {
  position: absolute;
  top: -18%;
  left: 50%;
  width: min(1050px, 82vw);
  height: 66vh;
  transform: translateX(-50%);
  background:
    radial-gradient(
      ellipse at center,
      rgba(223, 167, 78, 0.14) 0%,
      rgba(65, 120, 210, 0.07) 37%,
      rgba(5, 12, 25, 0) 72%
    );
  filter: blur(30px);
  opacity: 0.9;
  animation: telliumConstellationGlow 7s ease-in-out infinite;
}

.tellium-constellation-lines,
.tellium-star-field {
  position: absolute;
  top: 5%;
  left: 50%;
  width: min(1000px, 76vw);
  height: min(480px, 48vh);
  transform: translateX(-50%);
}

.tellium-constellation-line {
  stroke: url(#tellium-line-gradient);
  stroke-width: 0.12;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  opacity: 0;
  animation: telliumDrawConstellation 1.8s ease forwards;
}

.tellium-constellation-star {
  position: absolute;
  border-radius: 999px;
  background: rgba(166, 203, 255, 0.92);
  box-shadow:
    0 0 7px rgba(112, 180, 255, 0.85),
    0 0 16px rgba(100, 160, 255, 0.32);
  transform: translate(-50%, -50%);
  animation: telliumStarTwinkle 3.8s ease-in-out infinite;
}

.tellium-constellation-star.is-primary {
  background: rgba(247, 200, 122, 1);
  box-shadow:
    0 0 8px rgba(248, 200, 122, 1),
    0 0 22px rgba(235, 169, 71, 0.68),
    0 0 48px rgba(95, 157, 255, 0.18);
}

.tellium-constellation-title {
  position: absolute;
  top: clamp(390px, 49vh, 515px);
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: max-content;
  max-width: 80vw;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0.62;
}

.tellium-constellation-title span {
  color: rgba(234, 193, 125, 0.88);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.34em;
}

.tellium-constellation-title small {
  color: rgba(154, 179, 211, 0.56);
  font-size: 8px;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

.tellium-light-launch {
  position: absolute;
  z-index: 6;
  inset: 0;
  pointer-events: none;
}

.tellium-launch-source {
  position: absolute;
  left: 50%;
  bottom: 19%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  transform: translate(-50%, 50%) scale(0);
  background: rgba(255, 220, 157, 1);
  box-shadow:
    0 0 12px rgba(255, 218, 147, 1),
    0 0 38px rgba(242, 177, 76, 0.9),
    0 0 95px rgba(81, 157, 255, 0.54);
  animation: telliumSourceBirth 1.1s ease-out forwards;
}

.tellium-launch-trail {
  position: absolute;
  left: 50%;
  bottom: 19%;
  width: 2px;
  height: 0;
  transform: translateX(-50%);
  transform-origin: bottom;
  background:
    linear-gradient(
      to top,
      rgba(255, 192, 92, 0),
      rgba(255, 208, 128, 0.95) 22%,
      rgba(144, 197, 255, 0.7) 72%,
      rgba(144, 197, 255, 0)
    );
  filter: blur(0.3px);
  box-shadow:
    0 0 8px rgba(239, 185, 96, 0.8),
    0 0 22px rgba(92, 160, 255, 0.46);
  animation: telliumTrailRise 2.15s 0.38s
    cubic-bezier(0.2, 0.72, 0.2, 1) forwards;
}

.tellium-launch-star {
  position: absolute;
  left: 50%;
  bottom: 19%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, 50%) scale(0);
  background: #ffe1a3;
  box-shadow:
    0 0 9px #ffe3a9,
    0 0 28px rgba(246, 190, 96, 0.96),
    0 0 65px rgba(90, 163, 255, 0.7);
  animation: telliumStarAscend 2.45s 0.4s
    cubic-bezier(0.16, 0.72, 0.22, 1) forwards;
}

.tellium-launch-impact {
  position: absolute;
  top: 25%;
  left: 50%;
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 215, 142, 0.95);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  box-shadow:
    0 0 18px rgba(255, 205, 119, 0.78),
    inset 0 0 12px rgba(111, 177, 255, 0.48);
  animation: telliumConstellationImpact 1.15s 2.55s ease-out forwards;
}

.tellium-life-alive .rising-earth {
  animation: telliumEarthArrivalPulse 3.4s ease-out;
}

.tellium-life-alive .tellium-life-aura {
  filter: blur(24px);
  background:
    radial-gradient(
      circle,
      rgba(102, 188, 255, 0.34) 0%,
      rgba(53, 132, 240, 0.19) 35%,
      rgba(244, 189, 101, 0.13) 57%,
      transparent 74%
    );
}

@keyframes telliumConstellationGlow {
  0%,
  100% {
    opacity: 0.55;
    transform: translateX(-50%) scale(0.96);
  }

  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.06);
  }
}

@keyframes telliumDrawConstellation {
  0% {
    stroke-dashoffset: 120;
    opacity: 0;
  }

  35% {
    opacity: 0.22;
  }

  100% {
    stroke-dashoffset: 0;
    opacity: 0.66;
  }
}

@keyframes telliumStarTwinkle {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.78);
    filter: brightness(0.72);
  }

  48% {
    transform: translate(-50%, -50%) scale(1.25);
    filter: brightness(1.45);
  }
}

@keyframes telliumSourceBirth {
  0% {
    transform: translate(-50%, 50%) scale(0);
    opacity: 0;
  }

  28% {
    transform: translate(-50%, 50%) scale(1.8);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, 50%) scale(0.55);
    opacity: 0.65;
  }
}

@keyframes telliumTrailRise {
  0% {
    height: 0;
    opacity: 0;
  }

  20% {
    opacity: 1;
  }

  72% {
    height: 56%;
    opacity: 0.9;
  }

  100% {
    height: 56%;
    opacity: 0;
  }
}

@keyframes telliumStarAscend {
  0% {
    bottom: 19%;
    transform: translate(-50%, 50%) scale(0);
    opacity: 0;
  }

  12% {
    transform: translate(-50%, 50%) scale(1.7);
    opacity: 1;
  }

  72% {
    opacity: 1;
  }

  100% {
    bottom: 75%;
    transform: translate(-50%, 50%) scale(0.88);
    opacity: 0;
  }
}

@keyframes telliumConstellationImpact {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }

  22% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, -50%) scale(8);
    opacity: 0;
  }
}

@keyframes telliumEarthArrivalPulse {
  0%,
  100% {
    filter: brightness(1);
  }

  14% {
    filter: brightness(1.5);
  }

  30% {
    filter: brightness(1.08);
  }

  48% {
    filter: brightness(1.32);
  }
}

@media (max-width: 900px) {
  .tellium-constellation-lines,
  .tellium-star-field {
    top: 8%;
    width: 96vw;
    height: 39vh;
  }

  .tellium-constellation-title {
    top: 43vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tellium-constellation-star,
  .tellium-constellation-line,
  .tellium-constellation-glow,
  .tellium-launch-source,
  .tellium-launch-trail,
  .tellium-launch-star,
  .tellium-launch-impact,
  .tellium-life-alive .rising-earth {
    animation: none !important;
  }
}
EOF

echo "✓ Styles visuels ajoutés"
else
  echo "↪ Styles Step 02 déjà présents"
fi

echo
echo "▶ Vérification du build..."
pnpm run build

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TELLIUM V2 — STEP 02 TERMINÉE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Évolutions visibles :"
echo "  ✦ constellation permanente"
echo "  ✦ étoiles dorées scintillantes"
echo "  ✦ lignes de constellation"
echo "  ✦ lumière ascendante depuis la Terre"
echo "  ✦ flash d'intégration dans la constellation"
echo "  ✦ pulsation forte de la planète"
echo
echo "Sauvegarde : $BACKUP_DIR"
echo
