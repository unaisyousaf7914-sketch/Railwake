const KEY = "railwake.save";

export type SaveData = {
  version: 1;
  best: number;
  bestDistance: number;
  bestCombo: number;
  muted: boolean;
  shake: boolean;
};

const DEFAULTS: SaveData = {
  version: 1,
  best: 0,
  bestDistance: 0,
  bestCombo: 0,
  muted: false,
  shake: true,
};

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, shake: defaultShake() };
    const parsed = JSON.parse(raw) as Partial<SaveData> | null;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULTS };
    return {
      version: 1,
      best: Math.max(0, num(parsed.best)),
      bestDistance: Math.max(0, num(parsed.bestDistance)),
      bestCombo: Math.max(0, num(parsed.bestCombo)),
      muted: Boolean(parsed.muted),
      shake: parsed.shake !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: 1 }));
  } catch {
    /* private mode / quota — keep playing */
  }
}

function defaultShake(): boolean {
  if (typeof matchMedia === "undefined") return true;
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}
