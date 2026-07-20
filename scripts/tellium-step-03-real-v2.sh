#!/usr/bin/env bash
set -euo pipefail

COMPONENT="components/TelliumExperience.tsx"
CONSTELLATION="components/TelliumConstellation.tsx"
CSS="app/globals.css"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP=".tellium-backups/real-v2-$STAMP"

mkdir -p "$BACKUP"

cp "$COMPONENT" "$BACKUP/TelliumExperience.tsx"
cp "$CONSTELLATION" "$BACKUP/TelliumConstellation.tsx"
cp "$CSS" "$BACKUP/globals.css"

echo
echo "✦ TELLIUM — REAL V2"
echo "✓ Sauvegarde : $BACKUP"
echo

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
EOF

echo "✓ Nouvelle constellation orbitale créée"

python3 <<'PY'
from pathlib import Path

path = Path("components/TelliumExperience.tsx")
text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text

    if new in text:
        print(f"↪ {label} déjà appliqué")
        return

    if old not in text:
        raise SystemExit(
            f"\n❌ Référence introuvable pour : {label}\n"
            "La sauvegarde est disponible dans .tellium-backups."
        )

    text = text.replace(old, new, 1)
    print(f"✓ {label}")


replace_once(
    '''  const telliumLife = useMemo(
    () => getTelliumLifeState(lastLightAt),
    [lastLightAt],
  );''',
    '''  const telliumLife = useMemo(
    () => getTelliumLifeState(lastLightAt),
    [lastLightAt],
  );

  const nextRegistryNumber = Math.max(1, stats.total + 1);
  const earthBrightnessPercent = Math.round(
    telliumLife.brightness * 100,
  );''',
    "données du registre et luminosité",
)

replace_once(
    '''          <div className="artwork-bottom hud">
            <div className="artwork-counter-label">Humans connected now</div>''',
    '''          <div className="artwork-bottom hud">
            <div className="v2-earth-status">
              <div className="v2-earth-status-copy">
                <span>EARTH LIGHT</span>
                <strong>{earthBrightnessPercent}%</strong>
              </div>

              <div
                className="v2-earth-light-meter"
                aria-label={`Earth light ${earthBrightnessPercent}%`}
              >
                <i
                  style={{
                    width: `${earthBrightnessPercent}%`,
                  }}
                />
              </div>

              <small>
                {getTelliumStatusLabel(telliumLife.status)}
              </small>
            </div>

            <div className="artwork-counter-label">Humans connected now</div>''',
    "indicateur clair de luminosité",
)

replace_once(
    '''            <div className="dialog-star">✦</div>
            <p className="dialog-kicker">You are about to join the living artwork</p>
            <h2>How should your light appear?</h2>
            <p>Add a first name or nickname for the arrival ticker, or remain completely anonymous.</p>
            <input className="profile-name" value={profileDraft} onChange={(e) => setProfileDraft(e.target.value)} placeholder="First name or nickname (optional)" maxLength={24} autoFocus />
            <div className="capture-actions profile-actions">
              <button onClick={continueAnonymous}>Continue anonymously</button>
              <button className="primary" onClick={saveProfile}>Light up the world</button>
            </div>''',
    '''            <div className="dialog-star">✦</div>
            <p className="dialog-kicker">The permanent register of human lights</p>
            <h2>Register your light</h2>
            <p>
              Your light will be added to Tellium, linked to this exact
              place and moment, then sent into the living constellation.
            </p>

            <div className="v2-register-card">
              <div>
                <span>LIGHT NUMBER</span>
                <strong>#{String(nextRegistryNumber).padStart(6, "0")}</strong>
              </div>

              <div>
                <span>LOCATION</span>
                <strong>{SELF_CITY} · FRANCE</strong>
              </div>

              <div>
                <span>REGISTERED</span>
                <strong>{clock.date} · {clock.utc}</strong>
              </div>
            </div>

            <label className="v2-register-name">
              <span>NAME OR PSEUDONYM · OPTIONAL</span>
              <input
                className="profile-name"
                value={profileDraft}
                onChange={(e) => setProfileDraft(e.target.value)}
                placeholder="Leave empty to register anonymously"
                maxLength={24}
                autoFocus
              />
            </label>

            <div className="capture-actions profile-actions v2-register-actions">
              <button onClick={continueAnonymous}>
                Register anonymously
              </button>

              <button className="primary" onClick={saveProfile}>
                Register my light
              </button>
            </div>

            <small className="v2-register-note">
              Every registered light becomes a permanent part of the artwork.
            </small>''',
    "transformation du formulaire en registre",
)

path.write_text(text, encoding="utf-8")
print("✓ TelliumExperience.tsx transformé")
PY

cat >> "$CSS" <<'EOF'


/* ================================================================
   TELLIUM — REAL V2
   Une Terre fixe, une constellation extérieure et un vrai registre.
   Ce bloc est volontairement placé en dernier pour neutraliser
   les anciennes versions visuelles accumulées.
   ================================================================ */

/* Ancienne photographie d’horizon et anciens halos désactivés. */
.scene-artwork .rising-earth,
.scene-revealing .rising-earth,
.tellium-life-aura,
.tellium-life-pulse,
.tellium-constellation {
  display: none !important;
}

/* La Home 2 devient une composition claire centrée sur une seule Terre. */
.scene-artwork {
  background:
    radial-gradient(
      circle at 50% 48%,
      rgba(34, 80, 146, .13) 0%,
      rgba(7, 20, 43, .06) 31%,
      transparent 53%
    ),
    radial-gradient(
      ellipse at 50% 48%,
      transparent 0%,
      rgba(1, 4, 10, .28) 64%,
      rgba(0, 1, 4, .86) 100%
    ),
    #01030a !important;
}

/*
 * Globe fixe et entièrement visible.
 * Le moteur conserve les frontières, villes et interactions existantes.
 */
.scene-artwork .tellium-canvas {
  position: fixed !important;
  z-index: 8 !important;

  left: 50% !important;
  top: 49% !important;

  width: min(69vw, 790px) !important;
  height: min(69vw, 790px) !important;

  max-height: 72vh !important;

  transform:
    translate3d(-50%, -50%, 0)
    scale(.88) !important;

  transform-origin: center !important;

  filter:
    saturate(1.38)
    contrast(1.32)
    brightness(1.12)
    drop-shadow(0 0 22px rgba(76, 151, 255, .34))
    drop-shadow(0 0 72px rgba(36, 91, 190, .22)) !important;

  clip-path: circle(49% at 50% 50%) !important;

  transition:
    filter 1.3s ease,
    opacity 1s ease,
    transform 1.4s cubic-bezier(.18,.78,.18,1) !important;
}

/* Les trois états de lumière deviennent clairement différents. */
.tellium-life-alive.scene-artwork .tellium-canvas {
  filter:
    saturate(1.55)
    contrast(1.38)
    brightness(1.28)
    drop-shadow(0 0 30px rgba(105, 184, 255, .58))
    drop-shadow(0 0 105px rgba(47, 116, 231, .32)) !important;
}

.tellium-life-fading.scene-artwork .tellium-canvas {
  filter:
    saturate(1.05)
    contrast(1.22)
    brightness(.86)
    drop-shadow(0 0 21px rgba(67, 129, 211, .28)) !important;
}

.tellium-life-sleeping.scene-artwork .tellium-canvas {
  filter:
    saturate(.62)
    contrast(1.14)
    brightness(.58)
    drop-shadow(0 0 15px rgba(54, 94, 151, .19)) !important;
}

/* Halo atmosphérique placé autour de la Terre, jamais à l’intérieur. */
.scene-artwork::before {
  content: "";
  position: fixed;
  z-index: 7;
  pointer-events: none;

  left: 50%;
  top: 49%;

  width: min(63vw, 720px);
  aspect-ratio: 1;

  transform: translate(-50%, -50%);
  border-radius: 50%;

  border: 1px solid rgba(120, 190, 255, .26);

  box-shadow:
    0 0 22px rgba(118, 191, 255, .22),
    0 0 75px rgba(63, 135, 239, .22),
    0 0 145px rgba(34, 81, 174, .15),
    inset 0 0 24px rgba(144, 205, 255, .1);

  animation: v2EarthAtmosphere 5.8s ease-in-out infinite;
}

/* Constellation autour de la Terre. */
.v2-constellation {
  position: fixed;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1.2s ease;
}

.v2-constellation.is-visible {
  opacity: 1;
}

.v2-constellation-nebula {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse at 50% 47%,
      transparent 0%,
      transparent 30%,
      rgba(31, 85, 169, .05) 42%,
      rgba(220, 168, 83, .035) 58%,
      transparent 78%
    );
}

.v2-constellation-connections {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.v2-constellation-connections line {
  stroke: rgba(232, 184, 105, .25);
  stroke-width: .065;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 2 2.6;
  opacity: .45;
  animation: v2ConstellationLine 4.4s ease-in-out infinite;
}

.v2-orbital-star {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);

  background: rgba(154, 202, 255, .92);

  box-shadow:
    0 0 6px rgba(136, 196, 255, .88),
    0 0 17px rgba(74, 149, 255, .38);

  animation: v2StarBreath 3.7s ease-in-out infinite;
}

.v2-orbital-star.is-registered {
  background: #f6ce8b;

  box-shadow:
    0 0 8px rgba(255, 219, 158, 1),
    0 0 23px rgba(235, 176, 78, .72),
    0 0 48px rgba(73, 145, 246, .18);
}

.v2-constellation-caption {
  position: fixed;
  z-index: 12;

  left: 50%;
  top: calc(49% - min(37vw, 420px));

  transform: translateX(-50%);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;

  text-transform: uppercase;
  white-space: nowrap;
}

.v2-constellation-caption strong {
  color: rgba(240, 198, 130, .76);
  font-size: 9px;
  letter-spacing: .35em;
}

.v2-constellation-caption span {
  color: rgba(148, 181, 220, .48);
  font-size: 8px;
  letter-spacing: .18em;
}

/* Nouvelle lumière : départ de la Terre vers l’espace extérieur. */
.v2-light-journey {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.v2-light-origin,
.v2-light-star,
.v2-light-registration {
  position: absolute;
  left: 50%;
  top: 49%;
  border-radius: 50%;
}

.v2-light-origin {
  width: 24px;
  height: 24px;

  transform: translate(-50%, -50%) scale(0);

  background: #ffe1a4;

  box-shadow:
    0 0 15px #ffe3aa,
    0 0 40px rgba(243, 181, 78, .94),
    0 0 95px rgba(71, 153, 255, .66);

  animation: v2LightOrigin 1.25s ease-out forwards;
}

.v2-light-path {
  position: absolute;

  left: 50%;
  top: 16%;

  width: 2px;
  height: 33%;

  transform: translateX(-50%) scaleY(0);
  transform-origin: bottom;

  background:
    linear-gradient(
      to top,
      rgba(242, 181, 82, 0),
      rgba(247, 198, 117, .94),
      rgba(136, 195, 255, .72),
      transparent
    );

  box-shadow:
    0 0 11px rgba(246, 192, 105, .68),
    0 0 26px rgba(81, 155, 255, .45);

  animation: v2LightPath 2.1s .45s ease-out forwards;
}

.v2-light-star {
  width: 11px;
  height: 11px;

  transform: translate(-50%, -50%) scale(0);

  background: #ffe0a1;

  box-shadow:
    0 0 9px #ffe4ad,
    0 0 30px rgba(241, 183, 87, .94),
    0 0 70px rgba(85, 164, 255, .67);

  animation: v2LightRise 2.3s .4s
    cubic-bezier(.18,.76,.18,1) forwards;
}

.v2-light-registration {
  top: 16%;

  width: 22px;
  height: 22px;

  transform: translate(-50%, -50%) scale(0);
  opacity: 0;

  border: 1px solid rgba(255, 218, 151, .9);

  box-shadow:
    0 0 22px rgba(245, 191, 100, .8),
    inset 0 0 14px rgba(121, 187, 255, .48);

  animation: v2RegisterImpact 1.1s 2.4s ease-out forwards;
}

/* HUD avec lecture claire de la luminosité. */
.v2-earth-status {
  width: min(360px, 82vw);
  margin: 0 auto 12px;
}

.v2-earth-status-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 6px;

  font-size: 8px;
  letter-spacing: .22em;
  color: rgba(159, 190, 226, .67);
}

.v2-earth-status-copy strong {
  color: rgba(235, 199, 139, .86);
  font-size: 11px;
  font-weight: 500;
}

.v2-earth-light-meter {
  height: 3px;
  overflow: hidden;

  border-radius: 999px;

  background: rgba(107, 143, 187, .14);

  box-shadow: inset 0 0 5px rgba(0, 0, 0, .48);
}

.v2-earth-light-meter i {
  display: block;
  height: 100%;

  border-radius: inherit;

  background:
    linear-gradient(
      90deg,
      rgba(74, 139, 228, .75),
      rgba(126, 195, 255, .95),
      rgba(240, 187, 101, .98)
    );

  box-shadow:
    0 0 8px rgba(99, 176, 255, .62),
    0 0 14px rgba(238, 183, 94, .37);

  transition: width 1.1s ease;
}

.v2-earth-status small {
  display: block;
  margin-top: 6px;

  color: rgba(138, 168, 205, .48);

  font-size: 7px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

/* Registre permanent. */
.profile-dialog {
  width: min(94vw, 620px) !important;
}

.v2-register-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  margin: 22px 0 18px;
}

.v2-register-card > div {
  min-width: 0;
  padding: 13px 11px;

  border: 1px solid rgba(222, 177, 106, .16);
  border-radius: 12px;

  background:
    linear-gradient(
      180deg,
      rgba(222, 178, 106, .05),
      rgba(43, 87, 151, .035)
    );
}

.v2-register-card span,
.v2-register-name > span {
  display: block;

  color: rgba(148, 181, 220, .53);

  font-size: 7px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.v2-register-card strong {
  display: block;
  overflow: hidden;

  margin-top: 6px;

  color: rgba(240, 214, 171, .89);

  font-size: 10px;
  font-weight: 500;
  letter-spacing: .09em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v2-register-name {
  display: block;
  text-align: left;
}

.v2-register-name .profile-name {
  width: 100%;
  margin-top: 8px;
}

.v2-register-actions {
  margin-top: 16px;
}

.v2-register-note {
  display: block;

  margin-top: 15px;

  color: rgba(139, 167, 201, .48);

  font-size: 8px;
  letter-spacing: .08em;
  text-align: center;
}

/* Le HUD descend légèrement pour laisser toute la Terre visible. */
.scene-artwork .artwork-bottom {
  z-index: 40 !important;
  width: min(68vw, 620px) !important;

  padding: 10px 22px 8px !important;

  background:
    linear-gradient(
      180deg,
      rgba(3, 7, 15, .04),
      rgba(3, 7, 15, .72)
    ) !important;

  backdrop-filter: blur(9px);
}

/* Mobile. */
@media (max-width: 760px) {
  .scene-artwork .tellium-canvas {
    top: 44% !important;

    width: 94vw !important;
    height: 94vw !important;

    max-height: 58vh !important;

    transform:
      translate3d(-50%, -50%, 0)
      scale(.91) !important;
  }

  .scene-artwork::before {
    top: 44%;

    width: 87vw;
  }

  .v2-constellation-caption {
    top: 76px;
  }

  .v2-register-card {
    grid-template-columns: 1fr;
  }

  .scene-artwork .artwork-bottom {
    width: calc(100vw - 22px) !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-artwork::before,
  .v2-orbital-star,
  .v2-constellation-connections line,
  .v2-light-origin,
  .v2-light-path,
  .v2-light-star,
  .v2-light-registration {
    animation: none !important;
  }
}

@keyframes v2EarthAtmosphere {
  0%,
  100% {
    opacity: .56;
    transform: translate(-50%, -50%) scale(.985);
  }

  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.025);
  }
}

@keyframes v2StarBreath {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(.72);
    filter: brightness(.76);
  }

  50% {
    transform: translate(-50%, -50%) scale(1.32);
    filter: brightness(1.5);
  }
}

@keyframes v2ConstellationLine {
  0%,
  100% {
    opacity: .15;
  }

  50% {
    opacity: .52;
  }
}

@keyframes v2LightOrigin {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }

  36% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(2);
  }

  100% {
    opacity: .3;
    transform: translate(-50%, -50%) scale(.5);
  }
}

@keyframes v2LightPath {
  0% {
    opacity: 0;
    transform: translateX(-50%) scaleY(0);
  }

  22% {
    opacity: 1;
  }

  78% {
    opacity: .9;
    transform: translateX(-50%) scaleY(1);
  }

  100% {
    opacity: 0;
    transform: translateX(-50%) scaleY(1);
  }
}

@keyframes v2LightRise {
  0% {
    top: 49%;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }

  12% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.8);
  }

  78% {
    opacity: 1;
  }

  100% {
    top: 16%;
    opacity: 0;
    transform: translate(-50%, -50%) scale(.75);
  }
}

@keyframes v2RegisterImpact {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }

  25% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(7);
  }
}
EOF

echo "✓ Nouvelle direction visuelle ajoutée"
echo
echo "▶ Build de vérification..."

pnpm run build

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TELLIUM REAL V2 INSTALLÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Tu dois maintenant voir :"
echo "  ✦ une Terre fixe et entièrement visible"
echo "  ✦ des continents plus lumineux"
echo "  ✦ des étoiles uniquement autour de la Terre"
echo "  ✦ une jauge EARTH LIGHT"
echo "  ✦ un vrai registre de la lumière"
echo "  ✦ une lumière montant vers la constellation"
echo
echo "Sauvegarde : $BACKUP"
