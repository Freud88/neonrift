import type { CardType } from '@/types/card';

export type ModType = 'prefix' | 'suffix';

export interface ModEffect {
  description: string;
  atkBonus?: number;
  defBonus?: number;
  costReduction?: number;
  costIncrease?: number;
  shieldBonus?: number;
  keywords?: string[];   // keyword ids to add
  special?: string;      // handled by BattleEngine
  isNegative?: boolean;  // marks as bad/useless mod (shown in grey with ⚠️)
  isUseless?: boolean;   // truly no effect
}

export interface Mod {
  id: string;
  name: string;
  type: ModType;
  applicableTo: CardType[];
  tiers: {
    3: ModEffect;
    2: ModEffect;
    1: ModEffect;
  };
  weight: number;          // relative frequency (higher = more common)
  isBossMod?: boolean;
  requiredEnergy?: string;
}

export const MODS: Mod[] = [

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — GOOD (Weight 60–100)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P01', name: 'Overloaded', type: 'prefix', applicableTo: ['agent'], weight: 100,
    tiers: {
      3: { description: '+1 ATK', atkBonus: 1 },
      2: { description: '+2 ATK', atkBonus: 2 },
      1: { description: '+3 ATK', atkBonus: 3 },
    },
  },
  {
    id: 'P02', name: 'Reinforced', type: 'prefix', applicableTo: ['agent'], weight: 100,
    tiers: {
      3: { description: '+1 DEF', defBonus: 1 },
      2: { description: '+2 DEF', defBonus: 2 },
      1: { description: '+3 DEF', defBonus: 3 },
    },
  },
  {
    id: 'P03', name: 'Ionized', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: '+1 ATK, +1 DEF', atkBonus: 1, defBonus: 1 },
      2: { description: '+1 ATK, +2 DEF', atkBonus: 1, defBonus: 2 },
      1: { description: '+2 ATK, +2 DEF', atkBonus: 2, defBonus: 2 },
    },
  },
  {
    id: 'P04', name: 'Optimized', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 60,
    tiers: {
      3: { description: '-1 Cost (min 1)', costReduction: 1 },
      2: { description: '-1 Cost (min 1)', costReduction: 1 },
      1: { description: '-2 Cost (min 1)', costReduction: 2 },
    },
  },
  {
    id: 'P05', name: 'Augmented', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'Enters with +1 Shield', special: 'shield_1' },
      2: { description: 'Enters with +2 Shield', special: 'shield_2' },
      1: { description: 'Enters with +3 Shield', special: 'shield_3' },
    },
  },
  {
    id: 'P06', name: 'Replicated', type: 'prefix', applicableTo: ['agent'], weight: 20,
    tiers: {
      3: { description: 'On entry: summon a 1/1 copy', special: 'replicate_3' },
      2: { description: 'On entry: summon a 1/1 copy', special: 'replicate_2' },
      1: { description: 'On entry: summon a 1/1 copy', special: 'replicate_1' },
    },
  },
  {
    id: 'P07', name: 'Adaptive', type: 'prefix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: '+1 ATK per turn in play (max +2)', special: 'adaptive_3' },
      2: { description: '+1 ATK per turn in play (max +3)', special: 'adaptive_2' },
      1: { description: '+1 ATK per turn in play (max +4)', special: 'adaptive_1' },
    },
  },
  {
    id: 'P08', name: 'Networked', type: 'prefix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: '+1 ATK per other ally Agent', special: 'networked_3' },
      2: { description: '+1 ATK and +1 DEF per other ally Agent', special: 'networked_2' },
      1: { description: '+2 ATK per other ally Agent', special: 'networked_1' },
    },
  },
  {
    id: 'P09', name: 'Encrypted', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'Untargetable by Scripts for 1 turn', special: 'encrypted_3' },
      2: { description: 'Untargetable by Scripts for 2 turns', special: 'encrypted_2' },
      1: { description: 'Permanently untargetable by Scripts', special: 'encrypted_1' },
    },
  },
  {
    id: 'P10', name: 'Amplified', type: 'prefix', applicableTo: ['script'], weight: 80,
    tiers: {
      3: { description: '+1 damage', special: 'amp_3' },
      2: { description: '+2 damage', special: 'amp_2' },
      1: { description: '+3 damage', special: 'amp_1' },
    },
  },
  {
    id: 'P11', name: 'Cascading', type: 'prefix', applicableTo: ['script'], weight: 60,
    tiers: {
      3: { description: 'Hits 1 extra target', special: 'cascade_3' },
      2: { description: 'Hits 2 extra targets', special: 'cascade_2' },
      1: { description: 'Hits all enemies', special: 'cascade_1' },
    },
  },
  {
    id: 'P12', name: 'Recursive', type: 'prefix', applicableTo: ['script'], weight: 50,
    tiers: {
      3: { description: '30% chance to return to hand', special: 'recurse_3' },
      2: { description: '50% chance to return to hand', special: 'recurse_2' },
      1: { description: '100% returns to hand', special: 'recurse_1' },
    },
  },
  {
    id: 'P13', name: 'Persistent', type: 'prefix', applicableTo: ['malware'], weight: 80,
    tiers: {
      3: { description: '+1 turn duration', special: 'persistent_3' },
      2: { description: '+2 turns duration', special: 'persistent_2' },
      1: { description: 'Permanent duration', special: 'persistent_1' },
    },
  },
  {
    id: 'P14', name: 'Distributed', type: 'prefix', applicableTo: ['malware'], weight: 60,
    tiers: {
      3: { description: 'Effect +25%', special: 'distributed_3' },
      2: { description: 'Effect +50%', special: 'distributed_2' },
      1: { description: 'Effect +100%', special: 'distributed_1' },
    },
  },
  {
    id: 'P15', name: 'Layered', type: 'prefix', applicableTo: ['trap'], weight: 60,
    tiers: {
      3: { description: 'Triggers 2 times', special: 'layered_3' },
      2: { description: 'Triggers 3 times', special: 'layered_2' },
      1: { description: 'Triggers every time (permanent)', special: 'layered_1' },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — MEDIOCRE / SITUATIONAL (Weight 150–250)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P16', name: 'Volatile', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK, -1 DEF', atkBonus: 2, defBonus: -1 },
      2: { description: '+3 ATK, -2 DEF', atkBonus: 3, defBonus: -2 },
      1: { description: '+4 ATK, -3 DEF', atkBonus: 4, defBonus: -3 },
    },
  },
  {
    id: 'P17', name: 'Oversized', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK, +2 Cost', atkBonus: 2, costIncrease: 2 },
      2: { description: '+3 ATK, +2 Cost', atkBonus: 3, costIncrease: 2 },
      1: { description: '+4 ATK, +3 Cost', atkBonus: 4, costIncrease: 3 },
    },
  },
  {
    id: 'P18', name: 'Lightweight', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '-1 Cost, -1 ATK', costReduction: 1, atkBonus: -1 },
      2: { description: '-2 Cost, -2 ATK', costReduction: 2, atkBonus: -2 },
      1: { description: '-2 Cost, -3 ATK', costReduction: 2, atkBonus: -3 },
    },
  },
  {
    id: 'P19', name: 'Refurbished', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'Random +1 ATK or +1 DEF each turn', special: 'refurbished_3' },
      2: { description: 'Random +1 ATK or +1 DEF each turn', special: 'refurbished_2' },
      1: { description: 'Random +2 ATK or +2 DEF each turn', special: 'refurbished_1' },
    },
  },
  {
    id: 'P20', name: 'Narrow-Band', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK only vs Agents with cost ≤2', special: 'narrowband_3' },
      2: { description: '+2 ATK only vs Agents with cost ≤3', special: 'narrowband_2' },
      1: { description: '+2 ATK only vs Agents with cost ≤4', special: 'narrowband_1' },
    },
  },
  {
    id: 'P21', name: 'Mirrored', type: 'prefix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: 'Copies stats of a random enemy Agent', special: 'mirrored_3' },
      2: { description: 'Copies stats of a random enemy Agent', special: 'mirrored_2' },
      1: { description: 'Copies stats of a random enemy Agent', special: 'mirrored_1' },
    },
  },
  {
    id: 'P22', name: 'Parasitic', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK; on death: deal 2 damage to yourself', atkBonus: 2, special: 'parasitic_3' },
      2: { description: '+3 ATK; on death: deal 3 damage to yourself', atkBonus: 3, special: 'parasitic_2' },
      1: { description: '+4 ATK; on death: deal 4 damage to yourself', atkBonus: 4, special: 'parasitic_1' },
    },
  },
  {
    id: 'P23', name: 'Overheating', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK turn 1, -2 ATK from turn 2', special: 'overheating_3' },
      2: { description: '+2 ATK turn 1, -2 ATK from turn 2', special: 'overheating_2' },
      1: { description: '+3 ATK turn 1, -3 ATK from turn 2', special: 'overheating_1' },
    },
  },
  {
    id: 'P24', name: 'Anti-Cipher', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK only vs Cipher cards', special: 'anticipher_3' },
      2: { description: '+3 ATK only vs Cipher cards', special: 'anticipher_2' },
      1: { description: '+4 ATK only vs Cipher cards', special: 'anticipher_1' },
    },
  },
  {
    id: 'P25', name: 'Anti-Volt', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK only vs Volt cards', special: 'antivolt_3' },
      2: { description: '+3 ATK only vs Volt cards', special: 'antivolt_2' },
      1: { description: '+4 ATK only vs Volt cards', special: 'antivolt_1' },
    },
  },
  {
    id: 'P26', name: 'Scavenger', type: 'prefix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: 'On kill: gain +1/+0 permanently', special: 'scavenger_3' },
      2: { description: 'On kill: gain +1/+1 permanently', special: 'scavenger_2' },
      1: { description: 'On kill: gain +2/+1 permanently', special: 'scavenger_1' },
    },
  },
  {
    id: 'P27', name: 'Forked', type: 'prefix', applicableTo: ['script'], weight: 150,
    tiers: {
      3: { description: 'Launches effect twice at 50% efficacy', special: 'forked_3' },
      2: { description: 'Launches effect twice at 75% efficacy', special: 'forked_2' },
      1: { description: 'Launches effect twice at 100% efficacy', special: 'forked_1' },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — BAD / NEGATIVE (Weight 250–400)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P28', name: 'Glitched', type: 'prefix', applicableTo: ['agent'], weight: 350,
    tiers: {
      3: { description: '-1 ATK', atkBonus: -1, isNegative: true },
      2: { description: '-1 ATK, -1 DEF', atkBonus: -1, defBonus: -1, isNegative: true },
      1: { description: '-2 ATK, -1 DEF', atkBonus: -2, defBonus: -1, isNegative: true },
    },
  },
  {
    id: 'P29', name: 'Fragile', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: '-1 DEF', defBonus: -1, isNegative: true },
      2: { description: '-2 DEF', defBonus: -2, isNegative: true },
      1: { description: '-3 DEF', defBonus: -3, isNegative: true },
    },
  },
  {
    id: 'P30', name: 'Bloated', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: {
      3: { description: '+1 Cost', costIncrease: 1, isNegative: true },
      2: { description: '+1 Cost', costIncrease: 1, isNegative: true },
      1: { description: '+2 Cost', costIncrease: 2, isNegative: true },
    },
  },
  {
    id: 'P31', name: 'Unstable', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: '50% self-destruct at end of turn', special: 'unstable_3', isNegative: true },
      2: { description: '40% self-destruct at end of turn', special: 'unstable_2', isNegative: true },
      1: { description: '30% self-destruct at end of turn', special: 'unstable_1', isNegative: true },
    },
  },
  {
    id: 'P32', name: 'Sluggish', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: "Cannot attack the turn it's played", special: 'sluggish', isNegative: true },
      2: { description: "Cannot attack the turn it's played", special: 'sluggish', isNegative: true },
      1: { description: "Cannot attack the turn it's played", special: 'sluggish', isNegative: true },
    },
  },
  {
    id: 'P33', name: 'Leaking', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: 'Lose 1 HP at start of your turn while in play', special: 'leaking_3', isNegative: true },
      2: { description: 'Lose 1 HP at start of your turn while in play', special: 'leaking_2', isNegative: true },
      1: { description: 'Lose 2 HP at start of your turn while in play', special: 'leaking_1', isNegative: true },
    },
  },
  {
    id: 'P34', name: 'Draining', type: 'prefix', applicableTo: ['malware'], weight: 250,
    tiers: {
      3: { description: '+1 Cost to all other cards in hand', special: 'draining_3', isNegative: true },
      2: { description: '+1 Cost to all other cards in hand', special: 'draining_2', isNegative: true },
      1: { description: '+2 Cost to all other cards in hand', special: 'draining_1', isNegative: true },
    },
  },
  {
    id: 'P35', name: 'Flickering', type: 'prefix', applicableTo: ['script'], weight: 300,
    tiers: {
      3: { description: '30% chance to fizzle when played', special: 'flickering_3', isNegative: true },
      2: { description: '40% chance to fizzle when played', special: 'flickering_2', isNegative: true },
      1: { description: '50% chance to fizzle when played', special: 'flickering_1', isNegative: true },
    },
  },
  {
    id: 'P36', name: 'Corroded', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '-1 ATK per turn (min 0)', special: 'corroded_3', isNegative: true },
      2: { description: '-1 ATK per turn (min 0)', special: 'corroded_2', isNegative: true },
      1: { description: '-1 ATK and -1 DEF per turn', special: 'corroded_1', isNegative: true },
    },
  },
  {
    id: 'P37', name: 'Delayed', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'Enters play 1 turn late', special: 'delayed', isNegative: true },
      2: { description: 'Enters play 1 turn late', special: 'delayed', isNegative: true },
      1: { description: 'Enters play 1 turn late', special: 'delayed', isNegative: true },
    },
  },
  {
    id: 'P38', name: 'Bootleg', type: 'prefix', applicableTo: ['agent'], weight: 350,
    tiers: {
      3: { description: 'Base stats reduced by 50%', special: 'bootleg_3', isNegative: true },
      2: { description: 'Base stats reduced by 40%', special: 'bootleg_2', isNegative: true },
      1: { description: 'Base stats reduced by 30%', special: 'bootleg_1', isNegative: true },
    },
  },
  {
    id: 'P39', name: 'Unpatched', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'Takes +1 damage from all sources', special: 'unpatched_3', isNegative: true },
      2: { description: 'Takes +1 damage from all sources', special: 'unpatched_2', isNegative: true },
      1: { description: 'Takes +2 damage from all sources', special: 'unpatched_1', isNegative: true },
    },
  },
  {
    id: 'P40', name: 'Quarantined', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'Cannot benefit from buffs', special: 'quarantined', isNegative: true },
      2: { description: 'Cannot benefit from buffs', special: 'quarantined', isNegative: true },
      1: { description: 'Cannot benefit from buffs', special: 'quarantined', isNegative: true },
    },
  },
  {
    id: 'P41', name: 'Bricked', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'Cannot attack; contributes to shield only', special: 'bricked', isNegative: true },
      2: { description: 'Cannot attack; contributes to shield only', special: 'bricked', isNegative: true },
      1: { description: 'Cannot attack; contributes to shield only', special: 'bricked', isNegative: true },
    },
  },
  {
    id: 'P42', name: 'Backdated', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: '-1 ATK and -1 DEF for each ally Agent in play', special: 'backdated', isNegative: true },
      2: { description: '-1 ATK and -1 DEF for each ally Agent in play', special: 'backdated', isNegative: true },
      1: { description: '-1 ATK and -1 DEF for each ally Agent in play', special: 'backdated', isNegative: true },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — GOOD (Weight 30–80)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S01', name: 'of Overclocking', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'Overclock (attacks immediately)', keywords: ['overclock'], special: 'overclock_3' },
      2: { description: 'Overclock + first attack +1 damage', keywords: ['overclock'], special: 'overclock_2' },
      1: { description: 'Overclock + first attack +2 damage', keywords: ['overclock'], special: 'overclock_1' },
    },
  },
  {
    id: 'S02', name: 'of Stealth', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: 'Stealth for 1 turn', keywords: ['stealth'], special: 'stealth_3' },
      2: { description: 'Stealth for 2 turns', keywords: ['stealth'], special: 'stealth_2' },
      1: { description: 'Stealth until first attack', keywords: ['stealth'], special: 'stealth_1' },
    },
  },
  {
    id: 'S03', name: 'of the Firewall', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'Armor 1 (reduce all damage taken by 1)', keywords: ['armor'], special: 'armor_3' },
      2: { description: 'Armor 2', keywords: ['armor'], special: 'armor_2' },
      1: { description: 'Armor 3', keywords: ['armor'], special: 'armor_1' },
    },
  },
  {
    id: 'S04', name: 'of Regeneration', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'Regen 1 DEF at start of your turn', keywords: ['regen'], special: 'regen_3' },
      2: { description: 'Regen 2 DEF at start of your turn', keywords: ['regen'], special: 'regen_2' },
      1: { description: 'Regen 3 DEF at start of your turn', keywords: ['regen'], special: 'regen_1' },
    },
  },
  {
    id: 'S05', name: 'of Decryption', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: 'See next enemy card', special: 'decrypt_3' },
      2: { description: "See enemy's hand for 1 turn", special: 'decrypt_2' },
      1: { description: "See enemy's hand + next 3 cards", special: 'decrypt_1' },
    },
  },
  {
    id: 'S06', name: 'of Drain', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: {
      3: { description: 'On direct player damage: heal 1 HP', special: 'drain_3' },
      2: { description: 'On direct player damage: heal 2 HP', special: 'drain_2' },
      1: { description: 'On direct player damage: heal 3 HP', special: 'drain_1' },
    },
  },
  {
    id: 'S07', name: 'of Corrosion', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: 'On attack: permanently -1 DEF to target', special: 'corrode_3' },
      2: { description: 'On attack: permanently -1 ATK and -1 DEF to target', special: 'corrode_2' },
      1: { description: 'On attack: permanently -2 ATK and -1 DEF to target', special: 'corrode_1' },
    },
  },
  {
    id: 'S08', name: 'of the Grid', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: {
      3: { description: 'On entry: +1 temporary Data Cell', special: 'grid_3' },
      2: { description: 'On entry: +1 permanent Data Cell', special: 'grid_2' },
      1: { description: 'On entry: +2 permanent Data Cells', special: 'grid_1' },
    },
  },
  {
    id: 'S09', name: 'of Detonation', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: {
      3: { description: 'On death: 1 damage to all enemy Agents', special: 'detonate_3' },
      2: { description: 'On death: 2 damage to all enemy Agents', special: 'detonate_2' },
      1: { description: 'On death: 3 damage to all enemy Agents + player', special: 'detonate_1' },
    },
  },
  {
    id: 'S10', name: 'of Phasing', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: {
      3: { description: 'When attacking player: ignore 30% of shield', special: 'phasing_3' },
      2: { description: 'When attacking player: ignore 50% of shield', special: 'phasing_2' },
      1: { description: 'When attacking player: ignore all shield', special: 'phasing_1' },
    },
  },
  {
    id: 'S11', name: 'of Recursion', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: {
      3: { description: 'On death: 30% chance return to hand', special: 'recurse_3' },
      2: { description: 'On death: 50% chance return to hand', special: 'recurse_2' },
      1: { description: 'On death: return to hand', special: 'recurse_1' },
    },
  },
  {
    id: 'S12', name: 'of Command', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: {
      3: { description: 'On entry: +1/+1 to a random ally Agent', special: 'command_3' },
      2: { description: 'On entry: +2/+1 to a random ally Agent', special: 'command_2' },
      1: { description: 'On entry: +1/+1 to ALL ally Agents', special: 'command_1' },
    },
  },
  {
    id: 'S13', name: 'of Vampirism', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: {
      3: { description: 'Lifesteal 25% of damage dealt', special: 'vamp_3' },
      2: { description: 'Lifesteal 50% of damage dealt', special: 'vamp_2' },
      1: { description: 'Lifesteal 100% of damage dealt', special: 'vamp_1' },
    },
  },
  {
    id: 'S14', name: 'of Haste', type: 'suffix', applicableTo: ['agent'], weight: 30,
    tiers: {
      3: { description: 'Attacks twice (2nd at half damage)', special: 'haste_3' },
      2: { description: 'Attacks twice (2nd at full damage)', special: 'haste_2' },
      1: { description: 'Attacks three times', special: 'haste_1' },
    },
  },
  {
    id: 'S15', name: 'of Siphoning', type: 'suffix', applicableTo: ['script'], weight: 80,
    tiers: {
      3: { description: 'Heal 1 HP', special: 'siphon_3' },
      2: { description: 'Heal 2 HP', special: 'siphon_2' },
      1: { description: 'Heal 3 HP', special: 'siphon_1' },
    },
  },
  {
    id: 'S16', name: 'of Feedback', type: 'suffix', applicableTo: ['script'], weight: 60,
    tiers: {
      3: { description: 'Draw 1 card', special: 'feedback_3' },
      2: { description: 'Draw 1 card; enemy discards 1', special: 'feedback_2' },
      1: { description: 'Draw 2 cards; enemy discards 1', special: 'feedback_1' },
    },
  },
  {
    id: 'S17', name: 'of Disruption', type: 'suffix', applicableTo: ['script'], weight: 60,
    tiers: {
      3: { description: 'Enemy loses 1 Data Cell', special: 'disrupt_3' },
      2: { description: 'Enemy loses 2 Data Cells', special: 'disrupt_2' },
      1: { description: 'Enemy loses 3 Data Cells', special: 'disrupt_1' },
    },
  },
  {
    id: 'S18', name: 'of Chaining', type: 'suffix', applicableTo: ['script'], weight: 50,
    tiers: {
      3: { description: 'On kill: excess damage hits next Agent', special: 'chain_3' },
      2: { description: 'On kill: excess damage hits next Agent', special: 'chain_2' },
      1: { description: 'On kill: excess damage hits player', special: 'chain_1' },
    },
  },
  {
    id: 'S19', name: 'of Spreading', type: 'suffix', applicableTo: ['malware'], weight: 60,
    tiers: {
      3: { description: 'Effect also applies to 1 extra energy type', special: 'spreading_3' },
      2: { description: 'Effect also applies to 2 extra energy types', special: 'spreading_2' },
      1: { description: 'Effect applies to all energy types', special: 'spreading_1' },
    },
  },
  {
    id: 'S20', name: 'of Suppression', type: 'suffix', applicableTo: ['malware'], weight: 50,
    tiers: {
      3: { description: 'Enemy pays +1 for same-type cards', special: 'suppress_3' },
      2: { description: 'Enemy pays +1 for all cards', special: 'suppress_2' },
      1: { description: 'Enemy pays +2 for all cards', special: 'suppress_1' },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — MEDIOCRE / SITUATIONAL (Weight 100–250)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S21', name: 'of Desperation', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: '+3 ATK if you have ≤5 HP', special: 'desperation_3' },
      2: { description: '+4 ATK if you have ≤5 HP', special: 'desperation_2' },
      1: { description: '+5 ATK if you have ≤5 HP', special: 'desperation_1' },
    },
  },
  {
    id: 'S22', name: 'of the Underdog', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: '+2 ATK per extra enemy Agent vs yours', special: 'underdog_3' },
      2: { description: '+2 ATK per extra enemy Agent vs yours', special: 'underdog_2' },
      1: { description: '+3 ATK per extra enemy Agent vs yours', special: 'underdog_1' },
    },
  },
  {
    id: 'S23', name: 'of Hoarding', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: '+1 ATK per card in hand above 3', special: 'hoarding_3' },
      2: { description: '+1 ATK per card in hand above 3', special: 'hoarding_2' },
      1: { description: '+2 ATK per card in hand above 3', special: 'hoarding_1' },
    },
  },
  {
    id: 'S24', name: 'of Last Resort', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: '+5 ATK if only Agent in play', special: 'lastresort_3' },
      2: { description: '+6 ATK if only Agent in play', special: 'lastresort_2' },
      1: { description: '+8 ATK if only Agent in play', special: 'lastresort_1' },
    },
  },
  {
    id: 'S25', name: 'of Gambling', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '50% +3 ATK, 50% -3 ATK per attack', special: 'gamble_3' },
      2: { description: '50% +3 ATK, 50% -3 ATK per attack', special: 'gamble_2' },
      1: { description: '50% +4 ATK, 50% -4 ATK per attack', special: 'gamble_1' },
    },
  },
  {
    id: 'S26', name: 'of Conditional Logic', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+3 ATK only if you have exactly 1 Agent', special: 'conditional_3' },
      2: { description: '+3 ATK only if you have exactly 1 Agent', special: 'conditional_2' },
      1: { description: '+3 ATK only if you have exactly 1 Agent', special: 'conditional_1' },
    },
  },
  {
    id: 'S27', name: 'of Power Surge', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: 'Doubles ATK on entry turn, then halves', special: 'powersurge' },
      2: { description: 'Doubles ATK on entry turn, then halves', special: 'powersurge' },
      1: { description: 'Doubles ATK on entry turn, then halves', special: 'powersurge' },
    },
  },
  {
    id: 'S28', name: 'of Spaghetti Code', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 100,
    tiers: {
      3: { description: '??? (random suffix effect)', special: 'spaghetti' },
      2: { description: '??? (random suffix effect)', special: 'spaghetti' },
      1: { description: '??? (random suffix effect)', special: 'spaghetti' },
    },
  },
  {
    id: 'S29', name: 'of Salvage', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: 'On death: gain 10 credits', special: 'salvage_3' },
      2: { description: 'On death: gain 20 credits', special: 'salvage_2' },
      1: { description: 'On death: gain 50 credits', special: 'salvage_1' },
    },
  },
  {
    id: 'S30', name: 'of the Parasite', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '+2 ATK; start of turn: 1 damage to random ally', atkBonus: 2, special: 'parasite_3' },
      2: { description: '+2 ATK; start of turn: 1 damage to random ally', atkBonus: 2, special: 'parasite_2' },
      1: { description: '+2 ATK; start of turn: 2 damage to random ally', atkBonus: 2, special: 'parasite_1' },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — BAD / NEGATIVE (Weight 200–400)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S31', name: 'of Static', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'Must always attack the same target', special: 'static', isNegative: true },
      2: { description: 'Must always attack the same target', special: 'static', isNegative: true },
      1: { description: 'Must always attack the same target', special: 'static', isNegative: true },
    },
  },
  {
    id: 'S32', name: 'of Feedback Loop', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'On death: discard 1 random card', special: 'feedbackloop_3', isNegative: true },
      2: { description: 'On death: discard 1 random card', special: 'feedbackloop_2', isNegative: true },
      1: { description: 'On death: discard 2 random cards', special: 'feedbackloop_1', isNegative: true },
    },
  },
  {
    id: 'S33', name: 'of the Breach', type: 'suffix', applicableTo: ['agent'], weight: 350,
    tiers: {
      3: { description: 'Enemy draws 1 card when this enters', special: 'breach_3', isNegative: true },
      2: { description: 'Enemy draws 1 card when this enters', special: 'breach_2', isNegative: true },
      1: { description: 'Enemy draws 2 cards when this enters', special: 'breach_1', isNegative: true },
    },
  },
  {
    id: 'S34', name: 'of Short Circuit', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'On attack: 25% chance to take 1 self-damage', special: 'shortcircuit_3', isNegative: true },
      2: { description: 'On attack: 30% chance to take 1 self-damage', special: 'shortcircuit_2', isNegative: true },
      1: { description: 'On attack: 40% chance to take 1 self-damage', special: 'shortcircuit_1', isNegative: true },
    },
  },
  {
    id: 'S35', name: 'of Lag', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'This Agent always acts last', special: 'lag', isNegative: true },
      2: { description: 'This Agent always acts last', special: 'lag', isNegative: true },
      1: { description: 'This Agent always acts last', special: 'lag', isNegative: true },
    },
  },
  {
    id: 'S36', name: 'of Memory Leak', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: 'Each turn in play: +1 cost to cards in hand', special: 'memleak_3', isNegative: true },
      2: { description: 'Each turn in play: +1 cost to cards in hand', special: 'memleak_2', isNegative: true },
      1: { description: 'Each turn in play: +2 cost to cards in hand', special: 'memleak_1', isNegative: true },
    },
  },
  {
    id: 'S37', name: 'of Bloatware', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'Occupies 2 field slots instead of 1', special: 'bloatware', isNegative: true },
      2: { description: 'Occupies 2 field slots instead of 1', special: 'bloatware', isNegative: true },
      1: { description: 'Occupies 2 field slots instead of 1', special: 'bloatware', isNegative: true },
    },
  },
  {
    id: 'S38', name: 'of Telemetry', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'Enemy can see your entire hand', special: 'telemetry', isNegative: true },
      2: { description: 'Enemy can see your entire hand', special: 'telemetry', isNegative: true },
      1: { description: 'Enemy can see your entire hand', special: 'telemetry', isNegative: true },
    },
  },
  {
    id: 'S39', name: 'of False Positive', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '30% chance to attack a random ally instead', special: 'falsepositive_3', isNegative: true },
      2: { description: '25% chance to attack a random ally instead', special: 'falsepositive_2', isNegative: true },
      1: { description: '20% chance to attack a random ally instead', special: 'falsepositive_1', isNegative: true },
    },
  },
  {
    id: 'S40', name: 'of Slow Boot', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: "Cannot attack for the first 2 turns", special: 'slowboot_3', isNegative: true },
      2: { description: "Cannot attack for the first 2 turns", special: 'slowboot_2', isNegative: true },
      1: { description: "Cannot attack for the first 3 turns", special: 'slowboot_1', isNegative: true },
    },
  },
  {
    id: 'S41', name: 'of the Backdoor', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: {
      3: { description: 'On death: enemy gains +1 Data Cell', special: 'backdoor_3', isNegative: true },
      2: { description: 'On death: enemy gains +1 Data Cell', special: 'backdoor_2', isNegative: true },
      1: { description: 'On death: enemy gains +2 Data Cells', special: 'backdoor_1', isNegative: true },
    },
  },
  {
    id: 'S42', name: 'of Overallocation', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: {
      3: { description: '-1 max Data Cell while in play', special: 'overalloc_3', isNegative: true },
      2: { description: '-1 max Data Cell while in play', special: 'overalloc_2', isNegative: true },
      1: { description: '-2 max Data Cells while in play', special: 'overalloc_1', isNegative: true },
    },
  },
  {
    id: 'S43', name: 'of Narrow Bandwidth', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: {
      3: { description: 'Can only play 1 card per turn while in play', special: 'narrowbandwidth', isNegative: true },
      2: { description: 'Can only play 1 card per turn while in play', special: 'narrowbandwidth', isNegative: true },
      1: { description: 'Can only play 1 card per turn while in play', special: 'narrowbandwidth', isNegative: true },
    },
  },
  {
    id: 'S44', name: 'of Cache Miss', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 250,
    tiers: {
      3: { description: '30% chance to skip drawing next turn', special: 'cachemiss_3', isNegative: true },
      2: { description: '40% chance to skip drawing next turn', special: 'cachemiss_2', isNegative: true },
      1: { description: '50% chance to skip drawing next turn', special: 'cachemiss_1', isNegative: true },
    },
  },
  {
    id: 'S45', name: 'of Planned Obsolescence', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: {
      3: { description: 'Self-destructs after 3 turns', special: 'obsolete_3', isNegative: true },
      2: { description: 'Self-destructs after 3 turns', special: 'obsolete_2', isNegative: true },
      1: { description: 'Self-destructs after 2 turns', special: 'obsolete_1', isNegative: true },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — USELESS (Weight 300–400, no actual effect)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S46', name: 'of Noise', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: {
      3: { description: 'Signal interference detected', isUseless: true },
      2: { description: 'Signal interference detected', isUseless: true },
      1: { description: 'Signal interference detected', isUseless: true },
    },
  },
  {
    id: 'S47', name: 'of Deprecated Code', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: {
      3: { description: 'Legacy compatibility layer', isUseless: true },
      2: { description: 'Legacy compatibility layer', isUseless: true },
      1: { description: 'Legacy compatibility layer', isUseless: true },
    },
  },
  {
    id: 'S48', name: 'of Legacy Systems', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: {
      3: { description: 'Backward compatible (unused)', isUseless: true },
      2: { description: 'Backward compatible (unused)', isUseless: true },
      1: { description: 'Backward compatible (unused)', isUseless: true },
    },
  },
  {
    id: 'S49', name: 'of Dead Code', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: {
      3: { description: 'Unreachable branch', isUseless: true },
      2: { description: 'Unreachable branch', isUseless: true },
      1: { description: 'Unreachable branch', isUseless: true },
    },
  },
  {
    id: 'S50', name: 'of Lorem Ipsum', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: {
      3: { description: 'Placeholder text remaining', isUseless: true },
      2: { description: 'Placeholder text remaining', isUseless: true },
      1: { description: 'Placeholder text remaining', isUseless: true },
    },
  },
  {
    id: 'S51', name: 'of TODO', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: {
      3: { description: '// TODO: implement later', isUseless: true },
      2: { description: '// TODO: implement later', isUseless: true },
      1: { description: '// TODO: implement later', isUseless: true },
    },
  },
  {
    id: 'S52', name: 'of FIXME', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: {
      3: { description: '// FIXME: known issue', isUseless: true },
      2: { description: '// FIXME: known issue', isUseless: true },
      1: { description: '// FIXME: known issue', isUseless: true },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // BOSS MODS (isBossMod: true — only from Architect's Key drops)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'BM01', name: 'Flux Surge', type: 'suffix', applicableTo: ['agent'], weight: 5, isBossMod: true,
    tiers: {
      3: { description: '50% chance to attack again after attacking', special: 'fluxsurge_3' },
      2: { description: '65% chance to attack again after attacking', special: 'fluxsurge_2' },
      1: { description: 'Always attacks twice', special: 'fluxsurge_1' },
    },
  },
  {
    id: 'BM02', name: "Kael's Algorithm", type: 'suffix', applicableTo: ['agent', 'script'], weight: 5, isBossMod: true,
    tiers: {
      3: { description: "On play: copy the enemy's last used Script", special: 'kaelalgo_3' },
      2: { description: "On play: copy the enemy's last used Script", special: 'kaelalgo_2' },
      1: { description: "On play: copy the enemy's last used Script (free cast)", special: 'kaelalgo_1' },
    },
  },
  {
    id: 'BM03', name: 'Grid Override', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 5, isBossMod: true,
    tiers: {
      3: { description: 'Once per game: cast this card for free', special: 'gridoverride_3' },
      2: { description: 'Once per game: cast this card for free', special: 'gridoverride_2' },
      1: { description: 'Once per game: cast this card for free + draw 1', special: 'gridoverride_1' },
    },
  },
];

// ── Quick lookup by id ─────────────────────────────────────────────────────────
export const MOD_MAP: Record<string, Mod> = Object.fromEntries(MODS.map((m) => [m.id, m]));
