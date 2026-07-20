export type TelliumLifeStatus = "alive" | "fading" | "sleeping";

export type TelliumLifeState = {
  status: TelliumLifeStatus;
  brightness: number;
  hoursSinceLastLight: number | null;
  lastLightAt: string | null;
};

export const TELLIUM_LIFE_CONFIG = {
  minimumBrightness: 0.2,
  maximumBrightness: 1,

  aliveUntilHours: 24,
  fadingUntilHours: 72,

  brightnessTimeline: [
    { hours: 0, brightness: 1 },
    { hours: 6, brightness: 0.9 },
    { hours: 12, brightness: 0.8 },
    { hours: 24, brightness: 0.6 },
    { hours: 48, brightness: 0.35 },
    { hours: 72, brightness: 0.2 },
  ],
} as const;

/**
 * Limite une valeur entre un minimum et un maximum.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Interpolation linéaire entre deux valeurs.
 */
function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Retourne le nombre d'heures écoulées depuis une date ISO.
 */
export function getHoursSince(date: string | Date, now = new Date()): number {
  const sourceDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(sourceDate.getTime())) {
    return 0;
  }

  const milliseconds = Math.max(0, now.getTime() - sourceDate.getTime());

  return milliseconds / (1000 * 60 * 60);
}

/**
 * Calcule la luminosité de la Terre selon le temps écoulé
 * depuis la dernière lumière.
 *
 * La luminosité descend progressivement, mais ne tombe jamais à zéro.
 */
export function getEarthBrightness(hoursSinceLastLight: number): number {
  const timeline = TELLIUM_LIFE_CONFIG.brightnessTimeline;
  const safeHours = Math.max(0, hoursSinceLastLight);

  if (safeHours <= timeline[0].hours) {
    return timeline[0].brightness;
  }

  for (let index = 0; index < timeline.length - 1; index += 1) {
    const current = timeline[index];
    const next = timeline[index + 1];

    if (safeHours >= current.hours && safeHours <= next.hours) {
      const duration = next.hours - current.hours;
      const elapsed = safeHours - current.hours;
      const progress = duration === 0 ? 1 : elapsed / duration;

      return clamp(
        lerp(current.brightness, next.brightness, progress),
        TELLIUM_LIFE_CONFIG.minimumBrightness,
        TELLIUM_LIFE_CONFIG.maximumBrightness,
      );
    }
  }

  return TELLIUM_LIFE_CONFIG.minimumBrightness;
}

/**
 * Détermine l'état symbolique de Tellium.
 */
export function getTelliumLifeStatus(
  hoursSinceLastLight: number,
): TelliumLifeStatus {
  if (hoursSinceLastLight < TELLIUM_LIFE_CONFIG.aliveUntilHours) {
    return "alive";
  }

  if (hoursSinceLastLight < TELLIUM_LIFE_CONFIG.fadingUntilHours) {
    return "fading";
  }

  return "sleeping";
}

/**
 * Produit l'état complet de Tellium à partir de la dernière lumière.
 */
export function getTelliumLifeState(
  lastLightAt: string | null | undefined,
  now = new Date(),
): TelliumLifeState {
  if (!lastLightAt) {
    return {
      status: "sleeping",
      brightness: TELLIUM_LIFE_CONFIG.minimumBrightness,
      hoursSinceLastLight: null,
      lastLightAt: null,
    };
  }

  const parsedDate = new Date(lastLightAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      status: "sleeping",
      brightness: TELLIUM_LIFE_CONFIG.minimumBrightness,
      hoursSinceLastLight: null,
      lastLightAt: null,
    };
  }

  const hoursSinceLastLight = getHoursSince(parsedDate, now);

  return {
    status: getTelliumLifeStatus(hoursSinceLastLight),
    brightness: getEarthBrightness(hoursSinceLastLight),
    hoursSinceLastLight,
    lastLightAt: parsedDate.toISOString(),
  };
}

/**
 * Texte destiné à l'interface publique.
 */
export function getTelliumStatusLabel(
  status: TelliumLifeStatus,
): string {
  switch (status) {
    case "alive":
      return "Tellium is alive";

    case "fading":
      return "Tellium is fading";

    case "sleeping":
      return "Tellium is sleeping";

    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

/**
 * Formate le temps écoulé depuis la dernière lumière.
 */
export function formatTimeSinceLastLight(
  lastLightAt: string | null | undefined,
  now = new Date(),
): string {
  if (!lastLightAt) {
    return "Waiting for the next light";
  }

  const date = new Date(lastLightAt);

  if (Number.isNaN(date.getTime())) {
    return "Waiting for the next light";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (totalSeconds < 5) {
    return "Last light just now";
  }

  if (totalSeconds < 60) {
    return `Last light ${totalSeconds} seconds ago`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `Last light ${totalMinutes} ${
      totalMinutes === 1 ? "minute" : "minutes"
    } ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 24) {
    return `Last light ${totalHours} ${
      totalHours === 1 ? "hour" : "hours"
    } ago`;
  }

  const totalDays = Math.floor(totalHours / 24);

  return `Last light ${totalDays} ${
    totalDays === 1 ? "day" : "days"
  } ago`;
}
