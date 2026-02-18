// ── Rift Corruptions ──────────────────────────────────────────────────────────
// Global debuffs that stack as the rift decays. Each stage (2+) rolls 1 new
// corruption. They persist for the entire zone run.

export interface RiftCorruption {
  id: string;
  name: string;
  description: string;
  icon: string;          // emoji for HUD display
  category: 'deck' | 'combat' | 'map' | 'special';
  minStage: number;      // minimum decay stage to appear
  weight: number;
  effect: CorruptionEffect;
}

export type CorruptionEffectType =
  | 'cost_increase'      // all cards cost +N more
  | 'hand_size_reduce'   // draw fewer cards
  | 'junk_inject'        // add junk cards to deck
  | 'cell_reduce'        // fewer data cells per turn
  | 'starting_hand_reduce' // draw fewer cards at start
  | 'shield_drain'       // player shield reduced each turn
  | 'fog'                // minimap disabled
  | 'invisible_enemies'  // enemies don't show on minimap
  | 'storms'             // random damage ticks
  | 'no_healing'         // healing disabled
  | 'double_damage'      // enemies deal double damage
  | 'fragile_mods';      // mods degrade faster

export interface CorruptionEffect {
  type: CorruptionEffectType;
  value: number;
}

export const RIFT_CORRUPTIONS: RiftCorruption[] = [
  // ── Deck corruptions (C01–C06) ────────────────────────────────────────────
  {
    id: 'C01', name: 'Inflated Code', description: 'All cards cost +1',
    icon: '💰', category: 'deck', minStage: 2, weight: 80,
    effect: { type: 'cost_increase', value: 1 },
  },
  {
    id: 'C02', name: 'Bloated Memory', description: 'All cards cost +2',
    icon: '💰', category: 'deck', minStage: 4, weight: 30,
    effect: { type: 'cost_increase', value: 2 },
  },
  {
    id: 'C03', name: 'Buffer Shrink', description: 'Draw 1 fewer card per turn',
    icon: '📉', category: 'deck', minStage: 2, weight: 60,
    effect: { type: 'hand_size_reduce', value: 1 },
  },
  {
    id: 'C04', name: 'Data Pollution', description: '3 junk cards added to deck',
    icon: '🗑', category: 'deck', minStage: 3, weight: 50,
    effect: { type: 'junk_inject', value: 3 },
  },
  {
    id: 'C05', name: 'Severe Pollution', description: '6 junk cards added to deck',
    icon: '🗑', category: 'deck', minStage: 5, weight: 20,
    effect: { type: 'junk_inject', value: 6 },
  },
  {
    id: 'C06', name: 'Startup Lag', description: 'Start battles with 1 fewer card',
    icon: '⏱', category: 'deck', minStage: 3, weight: 50,
    effect: { type: 'starting_hand_reduce', value: 1 },
  },

  // ── Combat corruptions (C07–C12) ──────────────────────────────────────────
  {
    id: 'C07', name: 'Cell Drain', description: '1 fewer data cell per turn',
    icon: '⚡', category: 'combat', minStage: 2, weight: 70,
    effect: { type: 'cell_reduce', value: 1 },
  },
  {
    id: 'C08', name: 'Deep Drain', description: '2 fewer data cells per turn',
    icon: '⚡', category: 'combat', minStage: 4, weight: 25,
    effect: { type: 'cell_reduce', value: 2 },
  },
  {
    id: 'C09', name: 'Shield Erosion', description: 'Shield reduced by 1 each turn',
    icon: '🛡', category: 'combat', minStage: 3, weight: 40,
    effect: { type: 'shield_drain', value: 1 },
  },
  {
    id: 'C10', name: 'No Repair', description: 'Healing effects disabled',
    icon: '❌', category: 'combat', minStage: 4, weight: 30,
    effect: { type: 'no_healing', value: 0 },
  },
  {
    id: 'C11', name: 'Fragile Mods', description: 'Decay mods degrade 2x faster',
    icon: '💎', category: 'combat', minStage: 3, weight: 35,
    effect: { type: 'fragile_mods', value: 2 },
  },
  {
    id: 'C12', name: 'Reduced Bandwidth', description: 'Start with 2 fewer cards',
    icon: '📉', category: 'combat', minStage: 4, weight: 25,
    effect: { type: 'starting_hand_reduce', value: 2 },
  },

  // ── Map corruptions (C13–C18) ─────────────────────────────────────────────
  {
    id: 'C13', name: 'Signal Fog', description: 'Minimap disabled',
    icon: '🌫', category: 'map', minStage: 2, weight: 60,
    effect: { type: 'fog', value: 0 },
  },
  {
    id: 'C14', name: 'Ghost Protocol', description: 'Enemies invisible on minimap',
    icon: '👻', category: 'map', minStage: 3, weight: 50,
    effect: { type: 'invisible_enemies', value: 0 },
  },
  {
    id: 'C15', name: 'Data Storm', description: 'Random 1 damage every 30s',
    icon: '⛈', category: 'map', minStage: 3, weight: 45,
    effect: { type: 'storms', value: 1 },
  },
  {
    id: 'C16', name: 'Severe Storm', description: 'Random 2 damage every 20s',
    icon: '⛈', category: 'map', minStage: 5, weight: 20,
    effect: { type: 'storms', value: 2 },
  },
  {
    id: 'C17', name: 'Bandwidth Throttle', description: 'All cards cost +1, draw -1',
    icon: '🐌', category: 'map', minStage: 4, weight: 25,
    effect: { type: 'cost_increase', value: 1 },
  },
  {
    id: 'C18', name: 'Stealth Disruptor', description: 'Enemies see through stealth',
    icon: '👁', category: 'map', minStage: 4, weight: 30,
    effect: { type: 'invisible_enemies', value: 0 },
  },

  // ── Special Stage 5 corruptions (C19–C22) ─────────────────────────────────
  {
    id: 'C19', name: 'VOID RESONANCE', description: 'Enemies deal double damage',
    icon: '💀', category: 'special', minStage: 5, weight: 20,
    effect: { type: 'double_damage', value: 2 },
  },
  {
    id: 'C20', name: 'ENTROPY CASCADE', description: 'All mods degrade 3x faster',
    icon: '🌀', category: 'special', minStage: 5, weight: 15,
    effect: { type: 'fragile_mods', value: 3 },
  },
  {
    id: 'C21', name: 'SYSTEM COLLAPSE', description: '3 fewer data cells per turn',
    icon: '💥', category: 'special', minStage: 5, weight: 15,
    effect: { type: 'cell_reduce', value: 3 },
  },
  {
    id: 'C22', name: 'FINAL CORRUPTION', description: 'All cards cost +3',
    icon: '☠', category: 'special', minStage: 5, weight: 10,
    effect: { type: 'cost_increase', value: 3 },
  },
];

export const CORRUPTION_MAP: Record<string, RiftCorruption> = Object.fromEntries(
  RIFT_CORRUPTIONS.map((c) => [c.id, c])
);

/** Roll a random corruption for the given decay stage. Returns null if none eligible. */
export function rollCorruption(stage: number, existingIds: string[]): RiftCorruption | null {
  const eligible = RIFT_CORRUPTIONS.filter(
    (c) => stage >= c.minStage && !existingIds.includes(c.id)
  );
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((s, c) => s + c.weight, 0);
  let rnd = Math.random() * totalWeight;
  for (const c of eligible) {
    rnd -= c.weight;
    if (rnd <= 0) return c;
  }
  return eligible[eligible.length - 1];
}
