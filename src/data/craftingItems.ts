import type { CraftingItemId } from '@/types/game';

export interface CraftingItemDef {
  id: CraftingItemId;
  name: string;
  description: string;
  color: string;         // accent color for UI
  icon: string;          // emoji / ASCII icon
  dropWeight: number;    // relative probability for drops (0 = never drops normally)
  isBossOnly?: boolean;  // only dropped by bosses
}

export const CRAFTING_ITEMS: Record<CraftingItemId, CraftingItemDef> = {
  data_fragment: {
    id: 'data_fragment',
    name: 'Data Fragment',
    description: 'Add one random mod to a card. The mod type matches the card type.',
    color: '#00f0ff',
    icon: '◈',
    dropWeight: 40,
  },
  wipe_drive: {
    id: 'wipe_drive',
    name: 'Wipe Drive',
    description: 'Remove all mods from a card. Restores it to base stats.',
    color: '#ff6622',
    icon: '⊘',
    dropWeight: 20,
  },
  recompiler: {
    id: 'recompiler',
    name: 'Recompiler',
    description: 'Re-roll all mods on a card (same count, new random mods).',
    color: '#c850ff',
    icon: '⟳',
    dropWeight: 15,
  },
  tier_boost: {
    id: 'tier_boost',
    name: 'Tier Boost',
    description: 'Upgrade one existing mod on a card to the next tier (higher tier = stronger).',
    color: '#ffe600',
    icon: '▲',
    dropWeight: 10,
  },
  architects_key: {
    id: 'architects_key',
    name: "Architect's Key",
    description: 'Add a rare Boss Mod to any card. Only dropped by bosses.',
    color: '#ff0044',
    icon: '⚿',
    dropWeight: 0,
    isBossOnly: true,
  },
  quantum_lock: {
    id: 'quantum_lock',
    name: 'Quantum Lock',
    description: 'Lock one mod on a card so it cannot be rerolled or removed.',
    color: '#39ff14',
    icon: '🔒',
    dropWeight: 5,
  },
};

export const CRAFTING_ITEMS_LIST = Object.values(CRAFTING_ITEMS);

// ── Drop table helpers ────────────────────────────────────────────────────────

/** Roll a random crafting item drop. Returns null if no drop this time. */
export function rollCraftingDrop(isBoss: boolean): CraftingItemId | null {
  // Boss: 80% chance to drop something (including boss-only items)
  // Normal: 30% chance to drop something (excluding boss-only)
  const dropChance = isBoss ? 0.8 : 0.3;
  if (Math.random() > dropChance) return null;

  const pool = CRAFTING_ITEMS_LIST.filter((item) =>
    isBoss ? true : !item.isBossOnly
  );

  // For bosses, architect's key has a flat 40% chance among boss drops
  if (isBoss && Math.random() < 0.4) return 'architects_key';

  const eligible = pool.filter((item) => item.dropWeight > 0);
  const totalWeight = eligible.reduce((s, i) => s + i.dropWeight, 0);
  let rnd = Math.random() * totalWeight;
  for (const item of eligible) {
    rnd -= item.dropWeight;
    if (rnd <= 0) return item.id;
  }
  return eligible[eligible.length - 1].id;
}
