// ── Tier Constants ─────────────────────────────────────────────────────────────
export const MIN_TIER = 1;
export const MAX_TIER = 10;

export const TIER_WEIGHTS = [1000, 800, 600, 450, 300, 180, 90, 35, 10, 2];

export const TIER_NAMES: Record<number, string> = {
  1: 'Faded', 2: 'Dim', 3: 'Basic', 4: 'Stable', 5: 'Tuned',
  6: 'Enhanced', 7: 'Superior', 8: 'Prime', 9: 'Apex', 10: 'Perfect',
};

export const TIER_COLORS: Record<number, string> = {
  1: '#444444', 2: '#555555', 3: '#777777', 4: '#AAAAAA', 5: '#44CC44',
  6: '#4488FF', 7: '#AA44FF', 8: '#FF8C00', 9: '#FF2222', 10: '#FFD700',
};

// ── Roll Functions ─────────────────────────────────────────────────────────────

/** Roll a random tier 1-10 using weighted distribution. Higher riftLevel slightly boosts T6+. */
export function rollTier(riftLevel: number = 0): number {
  const levelBonus = Math.min(riftLevel * 0.5, 50);
  const adjusted = TIER_WEIGHTS.map((w, i) =>
    i >= 5 ? w + levelBonus * (i - 4) * 0.1 : w,
  );
  const total = adjusted.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let tier = 1; tier <= 10; tier++) {
    roll -= adjusted[tier - 1];
    if (roll <= 0) return tier;
  }
  return 1;
}

export function clampTier(t: number): number {
  return Math.max(MIN_TIER, Math.min(MAX_TIER, Math.round(t)));
}

// ── Value Generators (for building mod tier tables) ────────────────────────────

/** Exponential curve (t^1.8) for numeric values like +ATK, +DEF. Returns array[10]. */
export function numericTiers(min: number, max: number): number[] {
  return Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    return Math.round(min + (max - min) * Math.pow(t, 1.8));
  });
}

/** Softer exponential (t^1.5) for percentage values like lifesteal%, bypass%. Returns array[10]. */
export function percentTiers(min: number, max: number): number[] {
  return Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    return Math.round(min + (max - min) * Math.pow(t, 1.5));
  });
}

/** Inverse curve for negative mods: T1=maxPenalty, T10=0. Returns array[10]. */
export function inverseTiers(maxPenalty: number): number[] {
  return Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    return Math.round(maxPenalty * (1 - Math.pow(t, 1.5)));
  });
}

// ── Save Migration ─────────────────────────────────────────────────────────────

/** Convert old 3-tier system (T1=best, T3=worst) to new 10-tier (T1=worst, T10=best). */
export function migrateOldTier(oldTier: number): number {
  if (oldTier === 3) return 2;   // old worst → new low
  if (oldTier === 2) return 5;   // old mid → new mid
  if (oldTier === 1) return 8;   // old best → new high
  return 2;
}

// ── Enemy Tier Weights ─────────────────────────────────────────────────────────

/** Shift tier distribution toward higher tiers for higher rift levels. */
export function getEnemyTierWeights(riftLevel: number): number[] {
  const shift = Math.floor(riftLevel / 10);
  return TIER_WEIGHTS.map((_, i) => {
    const shiftedIndex = Math.max(0, i - shift);
    return TIER_WEIGHTS[shiftedIndex] ?? TIER_WEIGHTS[0];
  });
}
