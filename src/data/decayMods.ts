// ── Decay Mods ────────────────────────────────────────────────────────────────
// Special mods that enemy cards get in decayed zones (stage 2+).
// When enemy agents with decay mods hit or kill player cards, they apply
// temporary tier degradation to the player's card mods.
// Degradation is cleared when the player exits the zone.

export interface DecayMod {
  id: string;
  name: string;
  description: string;
  applicableTo: ('agent' | 'script' | 'trap')[];
  minStage: number;       // minimum decay stage to appear
  weight: number;         // roll weight
  effect: DecayEffect;
}

export type DecayEffectType =
  | 'tier_corrode'     // degrade a random mod's tier by N
  | 'mod_strip'        // remove a random unlocked mod entirely
  | 'worm'             // spread to another card in deck
  | 'damage_degrade'   // deal damage + degrade on hit
  | 'memory_wipe'      // discard cards from hand
  | 'bit_flip'         // swap ATK/DEF on a player agent
  | 'stack_overflow'   // increase cost of player cards
  | 'heap_corruption'; // reduce max HP temporarily

export interface DecayEffect {
  type: DecayEffectType;
  value: number;         // amount (tier reduction, cards discarded, etc.)
  description: string;
}

export const DECAY_MODS: DecayMod[] = [
  // ── Agent decay mods (D01–D08) ────────────────────────────────────────────
  {
    id: 'D01', name: 'Rust Bite', description: 'On hit: corrode 1 mod tier',
    applicableTo: ['agent'], minStage: 2, weight: 100,
    effect: { type: 'tier_corrode', value: 1, description: 'Corrodes 1 tier from a random mod on hit' },
  },
  {
    id: 'D02', name: 'Deep Rust', description: 'On hit: corrode 2 mod tiers',
    applicableTo: ['agent'], minStage: 3, weight: 60,
    effect: { type: 'tier_corrode', value: 2, description: 'Corrodes 2 tiers from a random mod on hit' },
  },
  {
    id: 'D03', name: 'Acid Breach', description: 'On hit: corrode 3 mod tiers',
    applicableTo: ['agent'], minStage: 4, weight: 30,
    effect: { type: 'tier_corrode', value: 3, description: 'Corrodes 3 tiers from a random mod on hit' },
  },
  {
    id: 'D04', name: 'Mod Ripper', description: 'On kill: strip 1 random mod',
    applicableTo: ['agent'], minStage: 3, weight: 40,
    effect: { type: 'mod_strip', value: 1, description: 'Strips a random unlocked mod on kill' },
  },
  {
    id: 'D05', name: 'Data Worm', description: 'On kill: infect 1 deck card',
    applicableTo: ['agent'], minStage: 4, weight: 25,
    effect: { type: 'worm', value: 1, description: 'Worm spreads to 1 card in deck, corroding 1 tier' },
  },
  {
    id: 'D06', name: 'Corrosive Touch', description: 'On hit: corrode 1 tier + damage',
    applicableTo: ['agent'], minStage: 2, weight: 80,
    effect: { type: 'damage_degrade', value: 1, description: 'Corrodes 1 tier and deals bonus damage on hit' },
  },
  {
    id: 'D07', name: 'Decay Aura', description: 'On death: corrode all field agents',
    applicableTo: ['agent'], minStage: 4, weight: 20,
    effect: { type: 'tier_corrode', value: 2, description: 'On death, corrodes 2 tiers from all player field agents' },
  },
  {
    id: 'D08', name: 'Entropy Spike', description: 'On hit: heavy tier corrode',
    applicableTo: ['agent'], minStage: 5, weight: 15,
    effect: { type: 'tier_corrode', value: 4, description: 'Corrodes 4 tiers from a random mod on hit' },
  },

  // ── Script decay mods (D09–D12) ───────────────────────────────────────────
  {
    id: 'D09', name: 'Glitch Bolt', description: 'Damage + degrade target',
    applicableTo: ['script'], minStage: 2, weight: 80,
    effect: { type: 'damage_degrade', value: 1, description: 'Deals damage and corrodes 1 tier on target' },
  },
  {
    id: 'D10', name: 'Memory Wipe', description: 'Discard 1 card from hand',
    applicableTo: ['script'], minStage: 3, weight: 50,
    effect: { type: 'memory_wipe', value: 1, description: 'Forces player to discard 1 random card' },
  },
  {
    id: 'D11', name: 'Data Drain', description: 'Discard 2 cards from hand',
    applicableTo: ['script'], minStage: 4, weight: 30,
    effect: { type: 'memory_wipe', value: 2, description: 'Forces player to discard 2 random cards' },
  },
  {
    id: 'D12', name: 'Cascade Failure', description: 'Heavy degrade + discard',
    applicableTo: ['script'], minStage: 5, weight: 15,
    effect: { type: 'damage_degrade', value: 3, description: 'Deals damage and corrodes 3 tiers on target' },
  },

  // ── Trap decay mods (D13–D15) ─────────────────────────────────────────────
  {
    id: 'D13', name: 'Bit Flip', description: 'Swap ATK/DEF on triggered agent',
    applicableTo: ['trap'], minStage: 3, weight: 40,
    effect: { type: 'bit_flip', value: 0, description: 'Swaps ATK and DEF of the triggering agent' },
  },
  {
    id: 'D14', name: 'Stack Overflow', description: 'Increase cost of hand cards',
    applicableTo: ['trap'], minStage: 4, weight: 25,
    effect: { type: 'stack_overflow', value: 1, description: 'Increases cost of all cards in hand by 1' },
  },
  {
    id: 'D15', name: 'Heap Corruption', description: 'Reduce player max HP',
    applicableTo: ['trap'], minStage: 5, weight: 15,
    effect: { type: 'heap_corruption', value: 2, description: 'Reduces player max HP by 2 for this zone' },
  },
];

export const DECAY_MOD_MAP: Record<string, DecayMod> = Object.fromEntries(
  DECAY_MODS.map((m) => [m.id, m])
);

/** Pick a random decay mod appropriate for the current decay stage and card type. */
export function pickDecayMod(
  cardType: 'agent' | 'script' | 'trap',
  decayStage: number,
): DecayMod | null {
  const eligible = DECAY_MODS.filter(
    (m) => m.applicableTo.includes(cardType) && decayStage >= m.minStage
  );
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((s, m) => s + m.weight, 0);
  let rnd = Math.random() * totalWeight;
  for (const m of eligible) {
    rnd -= m.weight;
    if (rnd <= 0) return m;
  }
  return eligible[eligible.length - 1];
}
