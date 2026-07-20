#!/usr/bin/env bash
set -euo pipefail

COMPONENT="components/TelliumExperience.tsx"
CSS="app/globals.css"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".tellium-backups/step-01-$TIMESTAMP"

echo "✦ TELLIUM V2 — STEP 01"
echo "  Life Engine + breathing Earth"
echo

if [[ ! -f "$COMPONENT" ]]; then
  echo "❌ Fichier introuvable : $COMPONENT"
  exit 1
fi

if [[ ! -f "$CSS" ]]; then
  echo "❌ Fichier introuvable : $CSS"
  exit 1
fi

if [[ ! -f "lib/telliumLife.ts" ]]; then
  echo "❌ Le moteur lib/telliumLife.ts n'existe pas."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$COMPONENT" "$BACKUP_DIR/TelliumExperience.tsx"
cp "$CSS" "$BACKUP_DIR/globals.css"

echo "✓ Sauvegarde créée dans $BACKUP_DIR"

python3 <<'PY'
from pathlib import Path

component_path = Path("components/TelliumExperience.tsx")
text = component_path.read_text(encoding="utf-8")

def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        print(f"  ↪ {label} déjà présent")
        return source

    if old not in source:
        raise SystemExit(
            f"\n❌ Impossible d'appliquer : {label}\n"
            f"Le texte de référence n'a pas été trouvé.\n"
            f"Aucun fichier n'a été volontairement réécrit après cette erreur."
        )

    print(f"  ✓ {label}")
    return source.replace(old, new, 1)


# 1. Import du moteur de vie
text = replace_once(
    text,
    'import ConstellationQr from "@/components/ConstellationQr";',
    '''import ConstellationQr from "@/components/ConstellationQr";
import {
  getTelliumLifeState,
  getTelliumStatusLabel,
} from "@/lib/telliumLife";''',
    "import du Life Engine",
)

# 2. État de la dernière lumière
text = replace_once(
    text,
    '  const [tickerItems, setTickerItems] = useState<string[]>([]);',
    '''  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [lastLightAt, setLastLightAt] = useState<string | null>(null);''',
    "état lastLightAt",
)

# 3. Toute nouvelle arrivée réveille Tellium
text = replace_once(
    text,
    '''      onStats: setStats,
      onToast: (html, kind) => pushToast(html, kind),
      onHover: setHover,''',
    '''      onStats: setStats,
      onToast: (html, kind) => {
        setLastLightAt(new Date().toISOString());
        pushToast(html, kind);
      },
      onHover: setHover,''',
    "réveil lors d'une arrivée",
)

# 4. La propre arrivée de l'utilisateur devient une lumière
text = replace_once(
    text,
    '''      source.registerSelf();
      arrivedAtRef.current = Date.now();
      setSelfReady(true);''',
    '''      source.registerSelf();
      arrivedAtRef.current = Date.now();
      setLastLightAt(new Date().toISOString());
      setSelfReady(true);''',
    "activation lors de registerSelf",
)

# 5. Calcul de l'état global
text = replace_once(
    text,
    '''  const selfCard: SelfCardInfo | null = selfPos
    ? {''',
    '''  const telliumLife = useMemo(
    () => getTelliumLifeState(lastLightAt),
    [lastLightAt],
  );

  const selfCard: SelfCardInfo | null = selfPos
    ? {''',
    "calcul de l'état de Tellium",
)

# 6. Classe de vie sur la scène
text = replace_once(
    text,
    '''    <main className={`fixed inset-0 tellium-scene scene-${scene}${galleryMode ? " gallery" : ""}`}>''',
    '''    <main
      className={`fixed inset-0 tellium-scene scene-${scene} tellium-life-${telliumLife.status}${galleryMode ? " gallery" : ""}`}
      data-life-status={telliumLife.status}
      data-life-brightness={telliumLife.brightness.toFixed(2)}
    >''',
    "classe visuelle alive/fading/sleeping",
)

# 7. Halo vivant autour de la Terre
text = replace_once(
    text,
    '''      <div className="rising-earth" aria-hidden />''',
    '''      <div className="rising-earth" aria-hidden>
        <div className="tellium-life-aura" />
        <div className="tellium-life-pulse" />
      </div>''',
    "halo et pulsation",
)

# 8. Indicateur discret dans le HUD
text = replace_once(
    text,
    '''            <div className="artwork-meta">{stats.countries} countries · {stats.cities} cities</div>
            <div className="life-ticker" aria-label="Recent Tellium arrivals">''',
    '''            <div className="artwork-meta">{stats.countries} countries · {stats.cities} cities</div>

            <div
              className="tellium-life-indicator"
              aria-live="polite"
              title={`Earth brightness: ${Math.round(telliumLife.brightness * 100)}%`}
            >
              <span className="tellium-life-dot" aria-hidden />
              <span>{getTelliumStatusLabel(telliumLife.status)}</span>
            </div>

            <div className="life-ticker" aria-label="Recent Tellium arrivals">''',
    "indicateur de vie",
)

component_path.write_text(text, encoding="utf-8")
print("\n✓ TelliumExperience.tsx mis à jour")
PY

if ! grep -q "TELLIUM V2 — LIFE ENGINE" "$CSS"; then
cat >> "$CSS" <<'CSS'


/* =========================================================
   TELLIUM V2 — LIFE ENGINE
   Step 01: the Earth breathes with humanity
   ========================================================= */

.tellium-life-aura,
.tellium-life-pulse {
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  pointer-events: none;
  transform-origin: center;
}

.tellium-life-aura {
  background:
    radial-gradient(
      circle,
      rgba(93, 172, 255, 0.22) 0%,
      rgba(54, 128, 230, 0.12) 38%,
      rgba(225, 176, 96, 0.06) 58%,
      transparent 72%
    );
  filter: blur(20px);
  opacity: 0.72;
  animation: telliumAuraBreath 5.8s ease-in-out infinite;
}

.tellium-life-pulse {
  inset: -4%;
  border: 1px solid rgba(152, 204, 255, 0.22);
  box-shadow:
    0 0 28px rgba(70, 155, 255, 0.18),
    inset 0 0 24px rgba(230, 184, 105, 0.08);
  opacity: 0.5;
  animation: telliumPlanetPulse 5.8s ease-in-out infinite;
}

/* Tellium vient de recevoir une lumière */
.tellium-life-alive .tellium-life-aura {
  opacity: 0.96;
  animation-duration: 4.4s;
}

.tellium-life-alive .tellium-life-pulse {
  border-color: rgba(154, 218, 255, 0.42);
  box-shadow:
    0 0 42px rgba(64, 160, 255, 0.28),
    0 0 82px rgba(225, 177, 95, 0.12),
    inset 0 0 28px rgba(231, 190, 119, 0.12);
}

/* La vie diminue progressivement */
.tellium-life-fading .tellium-life-aura {
  opacity: 0.52;
  animation-duration: 7.5s;
}

.tellium-life-fading .tellium-life-pulse {
  opacity: 0.34;
  animation-duration: 7.5s;
}

/* Tellium dort mais ne meurt jamais */
.tellium-life-sleeping .tellium-life-aura {
  opacity: 0.22;
  animation-duration: 11s;
}

.tellium-life-sleeping .tellium-life-pulse {
  opacity: 0.16;
  animation-duration: 11s;
}

.tellium-life-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 20px;
  margin: 8px auto 3px;
  padding: 4px 10px;
  border: 1px solid rgba(147, 185, 224, 0.12);
  border-radius: 999px;
  background: rgba(5, 13, 26, 0.32);
  color: rgba(191, 210, 232, 0.65);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  line-height: 1;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.tellium-life-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: rgba(135, 200, 255, 0.9);
  box-shadow: 0 0 9px rgba(105, 185, 255, 0.75);
}

.tellium-life-alive .tellium-life-dot {
  background: rgba(150, 255, 194, 0.96);
  box-shadow: 0 0 11px rgba(112, 255, 177, 0.9);
  animation: telliumStatusBlink 2.2s ease-in-out infinite;
}

.tellium-life-fading .tellium-life-dot {
  background: rgba(242, 191, 107, 0.92);
  box-shadow: 0 0 10px rgba(242, 177, 79, 0.7);
}

.tellium-life-sleeping .tellium-life-dot {
  background: rgba(116, 139, 171, 0.7);
  box-shadow: 0 0 7px rgba(92, 123, 164, 0.45);
}

@keyframes telliumAuraBreath {
  0%,
  100% {
    transform: scale(0.96);
    filter: blur(22px);
  }

  50% {
    transform: scale(1.06);
    filter: blur(28px);
  }
}

@keyframes telliumPlanetPulse {
  0%,
  100% {
    transform: scale(0.985);
  }

  50% {
    transform: scale(1.035);
  }
}

@keyframes telliumStatusBlink {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(0.82);
  }

  50% {
    opacity: 1;
    transform: scale(1.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tellium-life-aura,
  .tellium-life-pulse,
  .tellium-life-dot {
    animation: none !important;
  }
}
CSS

echo "✓ Styles de respiration ajoutés"
else
  echo "↪ Styles Life Engine déjà présents"
fi

echo
echo "▶ Vérification TypeScript et build..."
pnpm run build

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TELLIUM V2 — STEP 01 TERMINÉE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "La Terre possède maintenant :"
echo "  ✦ un état alive / fading / sleeping"
echo "  ✦ un halo respirant"
echo "  ✦ une pulsation liée à son état"
echo "  ✦ un réveil lors de chaque nouvelle lumière"
echo "  ✦ un indicateur discret dans le HUD"
echo
echo "Sauvegarde : $BACKUP_DIR"
echo
