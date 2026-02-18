import type { CardType } from '@/types/card';
import { numericTiers, percentTiers, inverseTiers } from '@/utils/tierUtils';

export type ModType = 'prefix' | 'suffix';

export interface ModEffect {
  description: string;
  atkBonus?: number;
  defBonus?: number;
  costReduction?: number;
  costIncrease?: number;
  shieldBonus?: number;
  keywords?: string[];      // keyword ids to add
  special?: string;         // category name, e.g. 'drain', 'corrode' (no tier suffix)
  specialValue?: number;    // numeric value for the special effect
  specialValue2?: number;   // second numeric value if needed
  isNegative?: boolean;     // marks as bad/useless mod (shown in grey with ⚠️)
  isUseless?: boolean;      // truly no effect
}

export interface Mod {
  id: string;
  name: string;
  type: ModType;
  applicableTo: CardType[];
  tiers: Record<number, ModEffect>; // keys 1-10
  weight: number;          // relative frequency (higher = more common)
  isBossMod?: boolean;
  requiredEnergy?: string;
}

// ── Tier builder helpers ──────────────────────────────────────────────────────
const nt = numericTiers;
const pt = percentTiers;
const it = inverseTiers;

type TierFn = (v: number, tierIdx: number) => ModEffect;
function build(values: number[], fn: TierFn): Record<number, ModEffect> {
  return Object.fromEntries(values.map((v, i) => [i + 1, fn(v, i)]));
}

function build2(a: number[], b: number[], fn: (va: number, vb: number, tierIdx: number) => ModEffect): Record<number, ModEffect> {
  return Object.fromEntries(a.map((va, i) => [i + 1, fn(va, b[i], i)]));
}

function allSame(effect: ModEffect): Record<number, ModEffect> {
  return Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { ...effect }]));
}

function allSameNeg(effect: ModEffect, freeFrom: number = 9): Record<number, ModEffect> {
  return Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1,
    i + 1 >= freeFrom ? { ...effect, isNegative: false } : { ...effect },
  ]));
}

function uselessTiers(desc: string): Record<number, ModEffect> {
  return Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1,
    i < 7 ? { description: desc, isUseless: true }
    : i === 7 ? { description: '-1 Cost', costReduction: 1 }
    : i === 8 ? { description: '-1 Cost', costReduction: 1 }
    : { description: '-2 Cost (min 0)', costReduction: 2 },
  ]));
}

// ══════════════════════════════════════════════════════════════════════════════
// MOD DEFINITIONS — 10 TIER SYSTEM (T1 = weakest, T10 = strongest)
// ══════════════════════════════════════════════════════════════════════════════

export const MODS: Mod[] = [

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — GOOD (Weight 60–100)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P01', name: 'Overloaded', type: 'prefix', applicableTo: ['agent'], weight: 100,
    tiers: build(nt(1, 12), v => ({ description: `+${v} ATK`, atkBonus: v })),
  },
  {
    id: 'P02', name: 'Reinforced', type: 'prefix', applicableTo: ['agent'], weight: 100,
    tiers: build(nt(1, 12), v => ({ description: `+${v} DEF`, defBonus: v })),
  },
  {
    id: 'P03', name: 'Ionized', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: build2(nt(1, 8), nt(1, 8), (a, d) => ({
      description: `+${a} ATK, +${d} DEF`, atkBonus: a, defBonus: d,
    })),
  },
  {
    id: 'P04', name: 'Optimized', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 60,
    tiers: build(nt(0, 4), v => ({
      description: v > 0 ? `-${v} Cost (min 0)` : 'No cost change', costReduction: v,
    })),
  },
  {
    id: 'P05', name: 'Augmented', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: build(nt(1, 5), v => ({
      description: `Enters with +${v} Shield`, special: 'shield', specialValue: v,
    })),
  },
  {
    id: 'P06', name: 'Replicated', type: 'prefix', applicableTo: ['agent'], weight: 20,
    tiers: build2(nt(1, 3), nt(1, 3), (a, d) => ({
      description: `On entry: summon a ${a}/${d} copy`,
      special: 'replicate', specialValue: a, specialValue2: d,
    })),
  },
  {
    id: 'P07', name: 'Adaptive', type: 'prefix', applicableTo: ['agent'], weight: 60,
    tiers: build2(nt(1, 3), nt(2, 10), (gain, max) => ({
      description: `+${gain} ATK per turn in play (max +${max})`,
      special: 'adaptive', specialValue: gain, specialValue2: max,
    })),
  },
  {
    id: 'P08', name: 'Networked', type: 'prefix', applicableTo: ['agent'], weight: 60,
    tiers: build2(nt(1, 3), nt(0, 3), (a, d) => ({
      description: d > 0 ? `+${a} ATK and +${d} DEF per other ally Agent` : `+${a} ATK per other ally Agent`,
      special: 'networked', specialValue: a, specialValue2: d,
    })),
  },
  {
    id: 'P09', name: 'Encrypted', type: 'prefix', applicableTo: ['agent'], weight: 80,
    tiers: build(nt(1, 99), v => ({
      description: v >= 99 ? 'Permanently untargetable by Scripts' : `Untargetable by Scripts for ${v} turn${v > 1 ? 's' : ''}`,
      special: 'encrypted', specialValue: v,
    })),
  },
  {
    id: 'P10', name: 'Amplified', type: 'prefix', applicableTo: ['script'], weight: 80,
    tiers: build(nt(1, 8), v => ({
      description: `+${v} damage`, special: 'amp', specialValue: v,
    })),
  },
  {
    id: 'P11', name: 'Cascading', type: 'prefix', applicableTo: ['script'], weight: 60,
    tiers: build(nt(1, 99), v => ({
      description: v >= 99 ? 'Hits all enemies' : `Hits ${v} extra target${v > 1 ? 's' : ''}`,
      special: 'cascade', specialValue: v,
    })),
  },
  {
    id: 'P12', name: 'Recursive', type: 'prefix', applicableTo: ['script'], weight: 50,
    tiers: build(pt(30, 100), v => ({
      description: v >= 100 ? '100% returns to hand' : `${v}% chance to return to hand`,
      special: 'recurse', specialValue: v,
    })),
  },
  {
    id: 'P13', name: 'Persistent', type: 'prefix', applicableTo: ['malware'], weight: 80,
    tiers: build(nt(1, 99), v => ({
      description: v >= 99 ? 'Permanent duration' : `+${v} turn${v > 1 ? 's' : ''} duration`,
      special: 'persistent', specialValue: v,
    })),
  },
  {
    id: 'P14', name: 'Distributed', type: 'prefix', applicableTo: ['malware'], weight: 60,
    tiers: build(pt(25, 100), v => ({
      description: `Effect +${v}%`, special: 'distributed', specialValue: v,
    })),
  },
  {
    id: 'P15', name: 'Layered', type: 'prefix', applicableTo: ['trap'], weight: 60,
    // T1–T4: +1 extra trigger, T5–T7: +2, T8–T10: +3
    tiers: build([1,1,1,1,2,2,2,3,3,3], (v) => ({
      description: `Triggers ${v + 1}x total (+${v} extra)`,
      special: 'layered', specialValue: v,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — MEDIOCRE / SITUATIONAL (Weight 150–250)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P16', name: 'Volatile', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 8), it(3), (a, penalty) => ({
      description: penalty > 0 ? `+${a} ATK, -${penalty} DEF` : `+${a} ATK`,
      atkBonus: a, defBonus: penalty > 0 ? -penalty : 0,
    })),
  },
  {
    id: 'P17', name: 'Oversized', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 6), it(3), (a, cost) => ({
      description: cost > 0 ? `+${a} ATK, +${cost} Cost` : `+${a} ATK`,
      atkBonus: a, costIncrease: cost > 0 ? cost : undefined,
    })),
  },
  {
    id: 'P18', name: 'Lightweight', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(1, 3), it(3), (cost, atkPen) => ({
      description: atkPen > 0 ? `-${cost} Cost, -${atkPen} ATK` : `-${cost} Cost`,
      costReduction: cost, atkBonus: atkPen > 0 ? -atkPen : 0,
    })),
  },
  {
    id: 'P19', name: 'Refurbished', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: build(nt(1, 3), v => ({
      description: `Random +${v} ATK or +${v} DEF each turn`,
      special: 'refurbished', specialValue: v,
    })),
  },
  {
    id: 'P20', name: 'Narrow-Band', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 5), nt(2, 6), (atk, threshold) => ({
      description: `+${atk} ATK only vs Agents with cost <=${threshold}`,
      special: 'narrowband', specialValue: atk, specialValue2: threshold,
    })),
  },
  {
    id: 'P21', name: 'Mirrored', type: 'prefix', applicableTo: ['agent'], weight: 150,
    tiers: build(nt(0, 2), v => ({
      description: v > 0 ? `Copies stats of a random enemy Agent (+${v}/+${v} bonus)` : 'Copies stats of a random enemy Agent',
      special: 'mirrored', specialValue: v,
    })),
  },
  {
    id: 'P22', name: 'Parasitic', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 6), it(4), (atk, selfDmg) => ({
      description: selfDmg > 0 ? `+${atk} ATK; on death: deal ${selfDmg} damage to yourself` : `+${atk} ATK`,
      atkBonus: atk, special: 'parasitic', specialValue: selfDmg,
    })),
  },
  {
    id: 'P23', name: 'Overheating', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 5), it(3), (boost, penalty) => ({
      description: penalty > 0 ? `+${boost} ATK turn 1, -${penalty} ATK from turn 2` : `+${boost} ATK turn 1`,
      special: 'overheating', specialValue: boost, specialValue2: penalty,
    })),
  },
  {
    id: 'P24', name: 'Anti-Cipher', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build(nt(2, 6), v => ({
      description: `+${v} ATK only vs Cipher cards`,
      special: 'anticipher', specialValue: v,
    })),
  },
  {
    id: 'P25', name: 'Anti-Volt', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build(nt(2, 6), v => ({
      description: `+${v} ATK only vs Volt cards`,
      special: 'antivolt', specialValue: v,
    })),
  },
  {
    id: 'P26', name: 'Scavenger', type: 'prefix', applicableTo: ['agent'], weight: 150,
    tiers: build2(nt(1, 3), nt(0, 2), (a, d) => ({
      description: d > 0 ? `On kill: gain +${a}/+${d} permanently` : `On kill: gain +${a}/+0 permanently`,
      special: 'scavenger', specialValue: a, specialValue2: d,
    })),
  },
  {
    id: 'P27', name: 'Forked', type: 'prefix', applicableTo: ['script'], weight: 150,
    tiers: build(pt(10, 100), v => ({
      description: v >= 100 ? 'Guaranteed to launch again at full damage' : `${v}% chance to launch again at full damage`,
      special: 'forked', specialValue: v,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — BAD / NEGATIVE (Weight 250–400)
  // T1 = max penalty, T10 = no penalty or small bonus
  // ══════════════════════════════════════════════════════════════════════

  // Glitched: T1-T5 = -ATK penalty, T6-T7 = DEF-ignore on first attack, T8+ = bonus ATK + ignore all DEF
  {
    id: 'P28', name: 'Glitched', type: 'prefix', applicableTo: ['agent'], weight: 350,
    tiers: Object.fromEntries([
      [1,  { description: '-5 ATK',                                        atkBonus: -5, isNegative: true }],
      [2,  { description: '-4 ATK',                                        atkBonus: -4, isNegative: true }],
      [3,  { description: '-3 ATK',                                        atkBonus: -3, isNegative: true }],
      [4,  { description: '-2 ATK',                                        atkBonus: -2, isNegative: true }],
      [5,  { description: '-1 ATK',                                        atkBonus: -1, isNegative: true }],
      [6,  { description: '-1 ATK. First attack each turn ignores 1 DEF',  atkBonus: -1, special: 'glitchstrike', specialValue: 1, isNegative: true }],
      [7,  { description: 'First attack each turn ignores 2 DEF',          special: 'glitchstrike', specialValue: 2 }],
      [8,  { description: '+1 ATK. First attack ignores 3 DEF',            atkBonus: 1,  special: 'glitchstrike', specialValue: 3 }],
      [9,  { description: '+1 ATK. First attack ignores all DEF',          atkBonus: 1,  special: 'glitchstrike', specialValue: 99 }],
      [10, { description: '+2 ATK. Glitch Strike: all attacks ignore DEF', atkBonus: 2,  special: 'glitchstrike', specialValue: 999 }],
    ]),
  },
  // Fragile: T1-T5 = -DEF, T6-T7 = on-death burst, T8+ = bonus DEF + on-death AoE
  {
    id: 'P29', name: 'Fragile', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: Object.fromEntries([
      [1,  { description: '-5 DEF',                                               defBonus: -5, isNegative: true }],
      [2,  { description: '-4 DEF',                                               defBonus: -4, isNegative: true }],
      [3,  { description: '-3 DEF',                                               defBonus: -3, isNegative: true }],
      [4,  { description: '-2 DEF',                                               defBonus: -2, isNegative: true }],
      [5,  { description: '-1 DEF',                                               defBonus: -1, isNegative: true }],
      [6,  { description: '-1 DEF. On death: 2 damage to a random enemy',         defBonus: -1, special: 'fragile_death', specialValue: 2, isNegative: true }],
      [7,  { description: 'On death: 4 damage to a random enemy',                 special: 'fragile_death', specialValue: 4 }],
      [8,  { description: '+1 DEF. On death: 4 damage to ALL enemies',            defBonus: 1,  special: 'fragile_death', specialValue: -4 }],
      [9,  { description: '+2 DEF. On death: 6 damage to ALL enemies',            defBonus: 2,  special: 'fragile_death', specialValue: -6 }],
      [10, { description: '+3 DEF. On death: ATK damage to all enemies + heal 3', defBonus: 3,  special: 'fragile_death', specialValue: -999 }],
    ]),
  },
  // Bloated: T1-T5 = +cost, T6-T7 = draws on play, T8+ = -cost + draws
  {
    id: 'P30', name: 'Bloated', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: Object.fromEntries([
      [1,  { description: '+4 Cost',                          costIncrease: 4, isNegative: true }],
      [2,  { description: '+3 Cost',                          costIncrease: 3, isNegative: true }],
      [3,  { description: '+3 Cost',                          costIncrease: 3, isNegative: true }],
      [4,  { description: '+2 Cost',                          costIncrease: 2, isNegative: true }],
      [5,  { description: '+1 Cost',                          costIncrease: 1, isNegative: true }],
      [6,  { description: '+1 Cost. Draw 1 when played',      costIncrease: 1, special: 'bloated_draw', specialValue: 1, isNegative: true }],
      [7,  { description: 'Draw 1 when played',               special: 'bloated_draw', specialValue: 1 }],
      [8,  { description: '-1 Cost. Draw 1 when played',      costReduction: 1, special: 'bloated_draw', specialValue: 1 }],
      [9,  { description: '-1 Cost. Draw 2 when played',      costReduction: 1, special: 'bloated_draw', specialValue: 2 }],
      [10, { description: '-2 Cost. Data Overflow: draw to full hand when played', costReduction: 2, special: 'bloated_draw', specialValue: 99 }],
    ]),
  },
  // Unstable: T1-T5 = % self-destruct, T6-T7 = survives → gains stats, T8+ = guaranteed survive + permanent growth
  {
    id: 'P31', name: 'Unstable', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: Object.fromEntries([
      [1,  { description: '80% self-destruct at end of turn',                     special: 'unstable', specialValue: 80, isNegative: true }],
      [2,  { description: '70% self-destruct at end of turn',                     special: 'unstable', specialValue: 70, isNegative: true }],
      [3,  { description: '55% self-destruct at end of turn',                     special: 'unstable', specialValue: 55, isNegative: true }],
      [4,  { description: '40% self-destruct at end of turn',                     special: 'unstable', specialValue: 40, isNegative: true }],
      [5,  { description: '25% self-destruct at end of turn',                     special: 'unstable', specialValue: 25, isNegative: true }],
      [6,  { description: '15% self-destruct. If survives: +1 ATK permanently',   special: 'unstable', specialValue: 15, specialValue2: 1, isNegative: true }],
      [7,  { description: '10% self-destruct. If survives: +2 ATK permanently',   special: 'unstable', specialValue: 10, specialValue2: 2, isNegative: true }],
      [8,  { description: '5% self-destruct. If survives: +2 ATK +1 DEF permanently', special: 'unstable', specialValue: 5,  specialValue2: 21 }],
      [9,  { description: '3% self-destruct. If survives: +2 ATK +1 DEF permanently', special: 'unstable', specialValue: 3,  specialValue2: 21 }],
      [10, { description: 'Reactor Core: stable. Gains +2 ATK +1 DEF every turn', special: 'unstable', specialValue: 0,  specialValue2: 21 }],
    ]),
  },
  // Sluggish: T1-T4 = can't attack N turns, T5-T7 = 1 turn delay + bonus DEF, T8+ = no delay + Taunt
  {
    id: 'P32', name: 'Sluggish', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: Object.fromEntries([
      [1,  { description: "Cannot attack for 3 turns after deploy",      special: 'sluggish', specialValue: 3, isNegative: true }],
      [2,  { description: "Cannot attack for 2 turns after deploy",      special: 'sluggish', specialValue: 2, isNegative: true }],
      [3,  { description: "Cannot attack for 2 turns after deploy",      special: 'sluggish', specialValue: 2, isNegative: true }],
      [4,  { description: "Cannot attack for 1 turn after deploy",       special: 'sluggish', specialValue: 1, isNegative: true }],
      [5,  { description: "Cannot attack for 1 turn. +2 DEF per wait turn", special: 'sluggish', specialValue: 1, specialValue2: 2, isNegative: true }],
      [6,  { description: "Cannot attack for 1 turn. +3 DEF +1 ATK per wait turn", special: 'sluggish', specialValue: 1, specialValue2: 31, isNegative: true }],
      [7,  { description: "Cannot attack for 1 turn. +3 DEF +1 ATK per wait turn", special: 'sluggish', specialValue: 1, specialValue2: 31, isNegative: true }],
      [8,  { description: "Attacks immediately. Taunt (enemies must target this)",  special: 'sluggish', specialValue: 0, specialValue2: 100 }],
      [9,  { description: "Attacks immediately. Taunt. +2 DEF on deploy",           special: 'sluggish', specialValue: 0, specialValue2: 102, defBonus: 2 }],
      [10, { description: "Fortified Deploy: attacks immediately. Taunt. +5 DEF. Immune first turn", special: 'sluggish', specialValue: 0, specialValue2: 105, defBonus: 5 }],
    ]),
  },
  // Leaking: T1-T4 = lose HP/turn, T5 = neutral, T6-T7 = lose HP but big ATK bonus, T8+ = regen
  {
    id: 'P33', name: 'Leaking', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: Object.fromEntries([
      [1,  { description: 'Lose 3 HP per turn while in play',                     special: 'leaking', specialValue: 3,  isNegative: true }],
      [2,  { description: 'Lose 2 HP per turn while in play',                     special: 'leaking', specialValue: 2,  isNegative: true }],
      [3,  { description: 'Lose 2 HP per turn while in play',                     special: 'leaking', specialValue: 2,  isNegative: true }],
      [4,  { description: 'Lose 1 HP per turn while in play',                     special: 'leaking', specialValue: 1,  isNegative: true }],
      [5,  { description: 'Lose 1 HP per turn while in play',                     special: 'leaking', specialValue: 1,  isNegative: true }],
      [6,  { description: 'Lose 1 HP per turn. +3 ATK',                           special: 'leaking', specialValue: 1,  atkBonus: 3, isNegative: true }],
      [7,  { description: 'Lose 1 HP per turn. +4 ATK',                           special: 'leaking', specialValue: 1,  atkBonus: 4, isNegative: true }],
      [8,  { description: '+4 ATK. No HP loss',                                   special: 'leaking', specialValue: 0,  atkBonus: 4 }],
      [9,  { description: 'Regen 1 HP per turn. +4 ATK',                          special: 'leaking', specialValue: -1, atkBonus: 4 }],
      [10, { description: 'Life Siphon Field: regen 2 HP per turn. All allies +1 ATK', special: 'leaking', specialValue: -2, atkBonus: 4 }],
    ]),
  },
  {
    id: 'P34', name: 'Draining', type: 'prefix', applicableTo: ['malware'], weight: 250,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `+${v} Cost to all other cards in hand` : 'No effect',
      special: 'draining', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P35', name: 'Flickering', type: 'prefix', applicableTo: ['script'], weight: 300,
    tiers: build(it(50), (v, i) => ({
      description: v > 0 ? `${v}% chance to fizzle when played` : 'No penalty',
      special: 'flickering', specialValue: v,
      isNegative: i < 8,
    })),
  },
  // Corroded: T1-T4 = lose ATK/DEF per turn, T5 = lose only DEF, T6+ = gain stats per turn
  {
    id: 'P36', name: 'Corroded', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: Object.fromEntries([
      [1,  { description: '-2 ATK and -2 DEF per turn',                 special: 'corroded', specialValue: -22, isNegative: true }],
      [2,  { description: '-1 ATK and -1 DEF per turn',                 special: 'corroded', specialValue: -11, isNegative: true }],
      [3,  { description: '-1 ATK and -1 DEF per turn',                 special: 'corroded', specialValue: -11, isNegative: true }],
      [4,  { description: '-1 ATK per turn (min 0)',                     special: 'corroded', specialValue: -10, isNegative: true }],
      [5,  { description: '-1 DEF per turn (min 1)',                     special: 'corroded', specialValue: -1,  isNegative: true }],
      [6,  { description: '+1 ATK every 2 turns',                        special: 'corroded', specialValue: 5   }],
      [7,  { description: '+1 ATK every turn',                           special: 'corroded', specialValue: 10  }],
      [8,  { description: '+1 ATK and +1 DEF every turn',                special: 'corroded', specialValue: 11  }],
      [9,  { description: '+2 ATK and +1 DEF every turn',                special: 'corroded', specialValue: 21  }],
      [10, { description: 'Adaptive Alloy: +2 ATK +2 DEF every turn',    special: 'corroded', specialValue: 22  }],
    ]),
  },
  {
    id: 'P37', name: 'Delayed', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Enters play ${v} turn${v > 1 ? 's' : ''} late` : 'No delay',
      special: 'delayed', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P38', name: 'Bootleg', type: 'prefix', applicableTo: ['agent'], weight: 350,
    tiers: build(it(50), (v, i) => ({
      description: v > 0 ? `Base stats reduced by ${v}%` : 'No penalty',
      special: 'bootleg', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P39', name: 'Unpatched', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Takes +${v} damage from all sources` : 'No penalty',
      special: 'unpatched', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P40', name: 'Quarantined', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Cannot benefit from buffs' : 'No restriction',
      special: 'quarantined', specialValue: v,
      isNegative: i < 8,
    })),
  },
  // Bricked: T1-T3 = can't attack, T4-T6 = partial attack, T7+ = full attack + bonus DEF/Taunt
  {
    id: 'P41', name: 'Bricked', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: Object.fromEntries([
      [1,  { description: "Cannot attack. Does not contribute to shield",          special: 'bricked', specialValue: 1,   isNegative: true }],
      [2,  { description: "Cannot attack",                                          special: 'bricked', specialValue: 2,   isNegative: true }],
      [3,  { description: "Cannot attack",                                          special: 'bricked', specialValue: 3,   isNegative: true }],
      [4,  { description: "Can only attack if alone on field",                      special: 'bricked', specialValue: 4,   isNegative: true }],
      [5,  { description: "Can only attack every 2 turns",                          special: 'bricked', specialValue: 5,   isNegative: true }],
      [6,  { description: "Can only attack Agents (not player directly)",           special: 'bricked', specialValue: 6,   isNegative: true }],
      [7,  { description: "Attacks normally. +2 DEF",                              special: 'bricked', specialValue: 0,   defBonus: 2 }],
      [8,  { description: "Attacks normally. +3 DEF. Taunt",                       special: 'bricked', specialValue: 0,   defBonus: 3, specialValue2: 1 }],
      [9,  { description: "+4 DEF. Taunt. Counterattacks for double damage",        special: 'bricked', specialValue: 0,   defBonus: 4, specialValue2: 2 }],
      [10, { description: "Firewall Mode: +5 DEF. Taunt. Armor 2. Full counterattack", special: 'bricked', specialValue: 0, defBonus: 5, specialValue2: 3 }],
    ]),
  },
  {
    id: 'P42', name: 'Backdated', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? `-${v} ATK and -${v} DEF for each ally Agent in play` : 'No penalty',
      special: 'backdated', specialValue: v,
      isNegative: i < 8,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — GOOD (Weight 30–80)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S01', name: 'of Overclocking', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: build(nt(0, 3), v => ({
      description: v > 0 ? `Overclock + first attack +${v} damage` : 'Overclock (attacks immediately)',
      keywords: ['overclock'], special: 'overclock', specialValue: v,
    })),
  },
  {
    id: 'S02', name: 'of Stealth', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: build(nt(1, 99), v => ({
      description: v >= 99 ? 'Stealth until first attack' : `Stealth for ${v} turn${v > 1 ? 's' : ''}`,
      keywords: ['stealth'], special: 'stealth', specialValue: v,
    })),
  },
  {
    id: 'S03', name: 'of the Firewall', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: build(nt(1, 5), v => ({
      description: `Armor ${v} (reduce all damage taken by ${v})`,
      keywords: ['armor'], special: 'armor', specialValue: v,
    })),
  },
  {
    id: 'S04', name: 'of Regeneration', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: build(nt(1, 5), v => ({
      description: `Regen ${v} DEF at start of your turn`,
      keywords: ['regen'], special: 'regen', specialValue: v,
    })),
  },
  {
    id: 'S05', name: 'of Decryption', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: build(nt(1, 5), v => ({
      description: v >= 5 ? "See enemy's hand + next 3 cards" : v >= 3 ? "See enemy's hand for 1 turn" : `See next ${v} enemy card${v > 1 ? 's' : ''}`,
      special: 'decrypt', specialValue: v,
    })),
  },
  {
    id: 'S06', name: 'of Drain', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: build(pt(5, 100), v => ({
      description: `On direct player damage: heal ${v}% of damage dealt`,
      special: 'drain', specialValue: v,
    })),
  },
  {
    id: 'S07', name: 'of Corrosion', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: build2(nt(0, 3), nt(1, 2), (a, d) => ({
      description: a > 0 ? `On attack: permanently -${a} ATK and -${d} DEF to target` : `On attack: permanently -${d} DEF to target`,
      special: 'corrode', specialValue: a, specialValue2: d,
    })),
  },
  {
    id: 'S08', name: 'of the Grid', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: build(nt(1, 3), v => ({
      description: v >= 2 ? `On entry: +${v} permanent Data Cells` : 'On entry: +1 temporary Data Cell',
      special: 'grid', specialValue: v,
    })),
  },
  {
    id: 'S09', name: 'of Detonation', type: 'suffix', applicableTo: ['agent'], weight: 80,
    tiers: build2(nt(1, 8), nt(0, 5), (dmg, playerDmg) => ({
      description: playerDmg > 0 ? `On death: ${dmg} damage to all enemy Agents + ${playerDmg} to player` : `On death: ${dmg} damage to all enemy Agents`,
      special: 'detonate', specialValue: dmg, specialValue2: playerDmg,
    })),
  },
  {
    id: 'S10', name: 'of Phasing', type: 'suffix', applicableTo: ['agent'], weight: 60,
    tiers: build(pt(30, 100), v => ({
      description: v >= 100 ? 'When attacking player: ignore all shield' : `When attacking player: ignore ${v}% of shield`,
      special: 'phasing', specialValue: v,
    })),
  },
  {
    id: 'S11', name: 'of Recursion', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: build(pt(30, 100), v => ({
      description: v >= 100 ? 'On death: return to hand' : `On death: ${v}% chance return to hand`,
      special: 'recurse', specialValue: v,
    })),
  },
  {
    id: 'S12', name: 'of Command', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: build2(nt(1, 3), nt(0, 2), (a, d) => ({
      description: a >= 3 ? `On entry: +${a}/+${d} to ALL ally Agents` : `On entry: +${a}/+${d} to a random ally Agent`,
      special: 'command', specialValue: a, specialValue2: d,
    })),
  },
  {
    id: 'S13', name: 'of Vampirism', type: 'suffix', applicableTo: ['agent'], weight: 50,
    tiers: build(pt(25, 100), v => ({
      description: `Lifesteal ${v}% of damage dealt`,
      special: 'vamp', specialValue: v,
    })),
  },
  {
    id: 'S14', name: 'of Haste', type: 'suffix', applicableTo: ['agent'], weight: 30,
    tiers: build(nt(2, 4), (v, i) => ({
      description: v >= 4 ? 'Attacks four times' : v >= 3 ? 'Attacks three times' : i < 4 ? 'Attacks twice (2nd at half damage)' : 'Attacks twice (2nd at full damage)',
      special: 'haste', specialValue: v, specialValue2: i < 4 ? 50 : 100,
    })),
  },
  {
    id: 'S15', name: 'of Siphoning', type: 'suffix', applicableTo: ['script'], weight: 80,
    tiers: build(nt(1, 5), v => ({
      description: `Heal ${v} HP`, special: 'siphon', specialValue: v,
    })),
  },
  {
    id: 'S16', name: 'of Feedback', type: 'suffix', applicableTo: ['script'], weight: 60,
    tiers: build2(nt(1, 3), nt(0, 2), (draw, discard) => ({
      description: discard > 0 ? `Draw ${draw} card${draw > 1 ? 's' : ''}; enemy discards ${discard}` : `Draw ${draw} card${draw > 1 ? 's' : ''}`,
      special: 'feedback', specialValue: draw, specialValue2: discard,
    })),
  },
  {
    id: 'S17', name: 'of Disruption', type: 'suffix', applicableTo: ['script'], weight: 60,
    tiers: build(nt(1, 3), v => ({
      description: `Enemy loses ${v} Data Cell${v > 1 ? 's' : ''}`,
      special: 'disrupt', specialValue: v,
    })),
  },
  {
    id: 'S18', name: 'of Chaining', type: 'suffix', applicableTo: ['script'], weight: 50,
    tiers: build(nt(0, 1), (v, i) => ({
      description: v > 0 ? 'On kill: excess damage hits player' : 'On kill: excess damage hits next Agent',
      special: 'chain', specialValue: v,
    })),
  },
  {
    id: 'S19', name: 'of Spreading', type: 'suffix', applicableTo: ['malware'], weight: 60,
    tiers: build(nt(1, 5), v => ({
      description: v >= 5 ? 'Effect applies to all energy types' : `Effect also applies to ${v} extra energy type${v > 1 ? 's' : ''}`,
      special: 'spreading', specialValue: v,
    })),
  },
  {
    id: 'S20', name: 'of Suppression', type: 'suffix', applicableTo: ['malware'], weight: 50,
    tiers: build(nt(1, 3), (v, i) => ({
      description: i < 4 ? `Enemy pays +${v} for same-type cards` : `Enemy pays +${v} for all cards`,
      special: 'suppress', specialValue: v,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — MEDIOCRE / SITUATIONAL (Weight 100–250)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S21', name: 'of Desperation', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: build(nt(3, 8), v => ({
      description: `+${v} ATK if you have <=5 HP`,
      special: 'desperation', specialValue: v,
    })),
  },
  {
    id: 'S22', name: 'of the Underdog', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: build(nt(2, 4), v => ({
      description: `+${v} ATK per extra enemy Agent vs yours`,
      special: 'underdog', specialValue: v,
    })),
  },
  {
    id: 'S23', name: 'of Hoarding', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: build(nt(1, 3), v => ({
      description: `+${v} ATK per card in hand above 3`,
      special: 'hoarding', specialValue: v,
    })),
  },
  {
    id: 'S24', name: 'of Last Resort', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: build(nt(5, 12), v => ({
      description: `+${v} ATK if only Agent in play`,
      special: 'lastresort', specialValue: v,
    })),
  },
  {
    id: 'S25', name: 'of Gambling', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(nt(3, 6), v => ({
      description: `50% +${v} ATK, 50% -${v} ATK per attack`,
      special: 'gamble', specialValue: v,
    })),
  },
  {
    id: 'S26', name: 'of Conditional Logic', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(nt(3, 6), v => ({
      description: `+${v} ATK only if you have exactly 1 Agent`,
      special: 'conditional', specialValue: v,
    })),
  },
  {
    id: 'S27', name: 'of Power Surge', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: allSame({ description: 'Doubles ATK on entry turn, then halves', special: 'powersurge' }),
  },
  {
    id: 'S28', name: 'of Spaghetti Code', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 100,
    tiers: allSame({ description: '??? (random suffix effect)', special: 'spaghetti' }),
  },
  {
    id: 'S29', name: 'of Salvage', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(nt(10, 100), v => ({
      description: `On death: gain ${v} credits`,
      special: 'salvage', specialValue: v,
    })),
  },
  {
    id: 'S30', name: 'of the Parasite', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build2(nt(2, 5), it(2), (atk, allyDmg) => ({
      description: allyDmg > 0 ? `+${atk} ATK; start of turn: ${allyDmg} damage to random ally` : `+${atk} ATK`,
      atkBonus: atk, special: 'parasite', specialValue: allyDmg,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — BAD / NEGATIVE (Weight 200–400)
  // T1 = max penalty, T10 = no penalty
  // ══════════════════════════════════════════════════════════════════════

  // Static: T1-T4 = locked target (if dies: skip turn), T5+ = bonus on repeat attacks, T10 = Target Lock
  {
    id: 'S31', name: 'of Static', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: Object.fromEntries([
      [1,  { description: 'Must attack same target. If it dies: skip attack',     special: 'static', specialValue: 1, isNegative: true }],
      [2,  { description: 'Must attack same target. If it dies: pick new one',    special: 'static', specialValue: 2, isNegative: true }],
      [3,  { description: 'Must attack same target. Free to switch if it dies',   special: 'static', specialValue: 3, isNegative: true }],
      [4,  { description: 'Must attack same target. Free to switch if it dies',   special: 'static', specialValue: 3, isNegative: true }],
      [5,  { description: '+1 damage vs fixed target',                            special: 'static', specialValue: 0, specialValue2: 1, isNegative: true }],
      [6,  { description: '+2 damage vs fixed target',                            special: 'static', specialValue: 0, specialValue2: 2 }],
      [7,  { description: '+3 damage vs any target, free to switch',              special: 'static', specialValue: 0, specialValue2: 3 }],
      [8,  { description: '+2 damage on first attack vs each new target',         special: 'static', specialValue: 0, specialValue2: 20 }],
      [9,  { description: '+3 damage on first attack vs each new target',         special: 'static', specialValue: 0, specialValue2: 30 }],
      [10, { description: 'Target Lock: +4 dmg. 3rd consecutive hit = triple dmg', special: 'static', specialValue: 0, specialValue2: 40 }],
    ]),
  },
  // Feedback Loop: T1-T3 = discard when ally dies, T4-T5 = chance, T6+ = gain stats on ally death
  {
    id: 'S32', name: 'of Feedback Loop', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: Object.fromEntries([
      [1,  { description: 'When any ally dies: this card is discarded',              special: 'feedbackloop', specialValue: -1, isNegative: true }],
      [2,  { description: 'When ally dies: discarded if in hand (not field)',        special: 'feedbackloop', specialValue: -2, isNegative: true }],
      [3,  { description: 'When ally dies: discarded if in hand',                   special: 'feedbackloop', specialValue: -2, isNegative: true }],
      [4,  { description: '50% chance to discard when ally dies',                   special: 'feedbackloop', specialValue: -3, isNegative: true }],
      [5,  { description: '25% chance to discard when ally dies',                   special: 'feedbackloop', specialValue: -4, isNegative: true }],
      [6,  { description: 'When ally dies: +1 ATK',                                 special: 'feedbackloop', specialValue: 1  }],
      [7,  { description: 'When ally dies: +2 ATK',                                 special: 'feedbackloop', specialValue: 2  }],
      [8,  { description: 'When ally dies: +2 ATK +1 DEF',                          special: 'feedbackloop', specialValue: 21 }],
      [9,  { description: 'When ally dies: +3 ATK +1 DEF, draw 1',                  special: 'feedbackloop', specialValue: 31 }],
      [10, { description: 'Avenger: when ally dies: +3 ATK +2 DEF, draw 1, next attack double dmg', special: 'feedbackloop', specialValue: 32 }],
    ]),
  },
  {
    id: 'S33', name: 'of the Breach', type: 'suffix', applicableTo: ['agent'], weight: 350,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Enemy draws ${v} card${v > 1 ? 's' : ''} when this enters` : 'No effect',
      special: 'breach', specialValue: v, isNegative: i < 8,
    })),
  },
  // Short Circuit: T1-T5 = self-damage %, T6-T7 = low chance + bonus dmg, T8+ = no risk + bonus effects
  {
    id: 'S34', name: 'of Short Circuit', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: Object.fromEntries([
      [1,  { description: 'On attack: 50% chance to take ATK self-damage',          special: 'shortcircuit', specialValue: 50, isNegative: true }],
      [2,  { description: 'On attack: 40% chance to take ATK self-damage',          special: 'shortcircuit', specialValue: 40, isNegative: true }],
      [3,  { description: 'On attack: 30% chance to take ATK self-damage',          special: 'shortcircuit', specialValue: 30, isNegative: true }],
      [4,  { description: 'On attack: 25% chance to take ATK self-damage',          special: 'shortcircuit', specialValue: 25, isNegative: true }],
      [5,  { description: 'On attack: 15% chance to take ATK self-damage',          special: 'shortcircuit', specialValue: 15, isNegative: true }],
      [6,  { description: '10% self-damage. If no misfire: +1 bonus damage',        special: 'shortcircuit', specialValue: 10, specialValue2: 1, isNegative: true }],
      [7,  { description: '5% self-damage. If no misfire: +2 bonus damage',         special: 'shortcircuit', specialValue: 5,  specialValue2: 2, isNegative: true }],
      [8,  { description: '+2 bonus damage on all attacks',                          special: 'shortcircuit', specialValue: 0,  specialValue2: 2 }],
      [9,  { description: '+3 bonus damage. 15% stun on hit',                        special: 'shortcircuit', specialValue: 0,  specialValue2: 3 }],
      [10, { description: 'Overcharge: +4 dmg. 25% stun. Hits all enemies on attack', special: 'shortcircuit', specialValue: 0, specialValue2: 4 }],
    ]),
  },
  // Lag: T1-T2 = acts last + ATK pen, T3-T4 = acts last, T5-T6 = acts last + DEF bonus, T7-T8+ = normal/first
  {
    id: 'S35', name: 'of Lag', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: Object.fromEntries([
      [1,  { description: 'Acts last. -2 ATK',    atkBonus: -2, special: 'lag', specialValue: 1, isNegative: true }],
      [2,  { description: 'Acts last. -1 ATK',    atkBonus: -1, special: 'lag', specialValue: 1, isNegative: true }],
      [3,  { description: 'Acts last',                          special: 'lag', specialValue: 1, isNegative: true }],
      [4,  { description: 'Acts last',                          special: 'lag', specialValue: 1, isNegative: true }],
      [5,  { description: 'Acts last. +2 DEF',    defBonus: 2,  special: 'lag', specialValue: 1, isNegative: true }],
      [6,  { description: 'Acts last. +2 DEF. If no ally died this turn: +2 ATK', defBonus: 2, special: 'lag', specialValue: 2, isNegative: true }],
      [7,  { description: 'Normal order. +2 DEF', defBonus: 2,  special: 'lag', specialValue: 0 }],
      [8,  { description: 'Acts FIRST. +1 ATK',   atkBonus: 1,  special: 'lag', specialValue: -1 }],
      [9,  { description: 'Acts FIRST. +2 ATK',   atkBonus: 2,  special: 'lag', specialValue: -1 }],
      [10, { description: 'Priority Override: acts first. +3 ATK. Pre-emptive strike.', atkBonus: 3, special: 'lag', specialValue: -2 }],
    ]),
  },
  // Memory Leak: T1-T4 = cost +N per turn in hand, T5 = neutral, T6+ = cost decreases per turn in hand
  {
    id: 'S36', name: 'of Memory Leak', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: Object.fromEntries([
      [1,  { description: 'Each turn in hand: +1 cost',                                    special: 'memleak', specialValue: 1,  isNegative: true }],
      [2,  { description: 'Each 2 turns in hand: +1 cost',                                 special: 'memleak', specialValue: 2,  isNegative: true }],
      [3,  { description: 'Each 2 turns in hand: +1 cost',                                 special: 'memleak', specialValue: 3,  isNegative: true }],
      [4,  { description: 'Each 3 turns in hand: +1 cost',                                 special: 'memleak', specialValue: 4,  isNegative: true }],
      [5,  { description: 'No cost change',                                                 special: 'memleak', specialValue: 0  }],
      [6,  { description: 'Each 3 turns in hand: -1 cost (min 0)',                          special: 'memleak', specialValue: -4 }],
      [7,  { description: 'Each 2 turns in hand: -1 cost (min 0)',                          special: 'memleak', specialValue: -3 }],
      [8,  { description: 'Each turn in hand: -1 cost (min 0)',                             special: 'memleak', specialValue: -1 }],
      [9,  { description: 'Each turn: -1 cost. At 0 cost: +2 ATK bonus',                   special: 'memleak', specialValue: -1, specialValue2: 1 }],
      [10, { description: 'Memory Compression: -1 cost/turn. At 0 cost: played twice',     special: 'memleak', specialValue: -1, specialValue2: 2 }],
    ]),
  },
  {
    id: 'S37', name: 'of Bloatware', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Occupies 2 field slots instead of 1' : 'No penalty',
      special: 'bloatware', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S38', name: 'of Telemetry', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Enemy can see your entire hand' : 'No penalty',
      special: 'telemetry', specialValue: v, isNegative: i < 8,
    })),
  },
  // False Positive: T1-T5 = % attacks ally, T6-T7 = small cleave, T8+ = full cleave / berserker
  {
    id: 'S39', name: 'of False Positive', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: Object.fromEntries([
      [1,  { description: '50% chance to attack a random ally instead',            special: 'falsepositive', specialValue: 50, isNegative: true }],
      [2,  { description: '40% chance to attack a random ally instead',            special: 'falsepositive', specialValue: 40, isNegative: true }],
      [3,  { description: '35% chance to attack a random ally instead',            special: 'falsepositive', specialValue: 35, isNegative: true }],
      [4,  { description: '25% chance to attack a random ally instead',            special: 'falsepositive', specialValue: 25, isNegative: true }],
      [5,  { description: '15% chance to attack a random ally instead',            special: 'falsepositive', specialValue: 15, isNegative: true }],
      [6,  { description: '5% ally hit. 15% chance to hit a second enemy',         special: 'falsepositive', specialValue: 5,  specialValue2: 15, isNegative: true }],
      [7,  { description: 'No ally hits. 20% chance to hit a second enemy',        special: 'falsepositive', specialValue: 0,  specialValue2: 20 }],
      [8,  { description: '30% cleave (hits target + 1 additional enemy)',          special: 'falsepositive', specialValue: 0,  specialValue2: 30 }],
      [9,  { description: '40% cleave on every attack',                            special: 'falsepositive', specialValue: 0,  specialValue2: 40 }],
      [10, { description: 'Berserker Mode: always attacks 2 enemies. +2 ATK',      special: 'falsepositive', specialValue: 0,  specialValue2: 100, atkBonus: 2 }],
    ]),
  },
  {
    id: 'S40', name: 'of Slow Boot', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(3), (v, i) => ({
      description: v > 0 ? `Cannot attack for the first ${v} turn${v > 1 ? 's' : ''}` : 'No delay',
      special: 'slowboot', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S41', name: 'of the Backdoor', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `On death: enemy gains +${v} Data Cell${v > 1 ? 's' : ''}` : 'No effect',
      special: 'backdoor', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S42', name: 'of Overallocation', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `-${v} max Data Cell${v > 1 ? 's' : ''} while in play` : 'No effect',
      special: 'overalloc', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S43', name: 'of Narrow Bandwidth', type: 'suffix', applicableTo: ['agent'], weight: 150,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Can only play 1 card per turn while in play' : 'No restriction',
      special: 'narrowbandwidth', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S44', name: 'of Cache Miss', type: 'suffix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 250,
    tiers: build(it(50), (v, i) => ({
      description: v > 0 ? `${v}% chance to skip drawing next turn` : 'No penalty',
      special: 'cachemiss', specialValue: v, isNegative: i < 8,
    })),
  },
  // Planned Obsolescence: T1-T5 = self-destructs after N turns, T6+ = bonus on death, T9-T10 = eternal
  {
    id: 'S45', name: 'of Planned Obsolescence', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: Object.fromEntries([
      [1,  { description: 'Self-destructs after 2 turns',                         special: 'obsolete', specialValue: 2,  isNegative: true }],
      [2,  { description: 'Self-destructs after 2 turns',                         special: 'obsolete', specialValue: 2,  isNegative: true }],
      [3,  { description: 'Self-destructs after 3 turns',                         special: 'obsolete', specialValue: 3,  isNegative: true }],
      [4,  { description: 'Self-destructs after 3 turns',                         special: 'obsolete', specialValue: 3,  isNegative: true }],
      [5,  { description: 'Self-destructs after 4 turns',                         special: 'obsolete', specialValue: 4,  isNegative: true }],
      [6,  { description: 'After 5 turns: destroyed + draw 1',                    special: 'obsolete', specialValue: 5,  specialValue2: 1 }],
      [7,  { description: 'After 6 turns: destroyed + draw 2 + 3 dmg to a foe',   special: 'obsolete', specialValue: 6,  specialValue2: 2 }],
      [8,  { description: 'After 8 turns: destroyed + 4 AoE dmg',                 special: 'obsolete', specialValue: 8,  specialValue2: 4 }],
      [9,  { description: 'Never self-destructs',                                  special: 'obsolete', specialValue: 99 }],
      [10, { description: 'Eternal License: never destructs. +2 ATK. Every 4 turns: draw 1 + heal 1', special: 'obsolete', specialValue: 99, specialValue2: 10, atkBonus: 2 }],
    ]),
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — USELESS → UNIQUE T6-T10 EFFECTS (Weight 300–400)
  // T1-T5: no effect. T6-T10: unique tematic payoff per mod.
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S46', name: 'of Noise', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: Object.fromEntries([
      [1, { description: 'Signal interference detected', isUseless: true }],
      [2, { description: 'Signal interference detected', isUseless: true }],
      [3, { description: 'Signal interference detected', isUseless: true }],
      [4, { description: 'Signal interference detected', isUseless: true }],
      [5, { description: 'Signal interference detected', isUseless: true }],
      [6, { description: 'Generate 1 credit per battle',           special: 'noise_credits', specialValue: 1  }],
      [7, { description: 'Generate 2 credits per battle',          special: 'noise_credits', specialValue: 2  }],
      [8, { description: 'Generate 3 credits per battle',          special: 'noise_credits', specialValue: 3  }],
      [9, { description: 'Generate 5 credits per battle',          special: 'noise_credits', specialValue: 5  }],
      [10, { description: 'White Noise Field: 5 credits per battle + 10% enemy confusion per turn', special: 'noise_credits', specialValue: 5, specialValue2: 10 }],
    ]),
  },
  {
    id: 'S47', name: 'of Deprecated Code', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: Object.fromEntries([
      [1, { description: 'Legacy compatibility layer', isUseless: true }],
      [2, { description: 'Legacy compatibility layer', isUseless: true }],
      [3, { description: 'Legacy compatibility layer', isUseless: true }],
      [4, { description: 'Legacy compatibility layer', isUseless: true }],
      [5, { description: 'Legacy compatibility layer', isUseless: true }],
      [6,  { description: 'On death: leave a 1/1 Legacy Process token', special: 'deprecated_token', specialValue: 1  }],
      [7,  { description: 'On death: leave a 2/2 Legacy Process token', special: 'deprecated_token', specialValue: 2  }],
      [8,  { description: 'On death: leave a 3/3 Legacy Process token', special: 'deprecated_token', specialValue: 3  }],
      [9,  { description: 'On death: leave a 3/3 token with Taunt',     special: 'deprecated_token', specialValue: 4  }],
      [10, { description: 'Legacy Mainframe: on death, clone this Agent at base stats', special: 'deprecated_token', specialValue: 99 }],
    ]),
  },
  {
    id: 'S48', name: 'of Legacy Systems', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: Object.fromEntries([
      [1, { description: 'Backward compatible (unused)', isUseless: true }],
      [2, { description: 'Backward compatible (unused)', isUseless: true }],
      [3, { description: 'Backward compatible (unused)', isUseless: true }],
      [4, { description: 'Backward compatible (unused)', isUseless: true }],
      [5, { description: 'Backward compatible (unused)', isUseless: true }],
      [6,  { description: '+1 DEF',                               defBonus: 1  }],
      [7,  { description: '+2 DEF',                               defBonus: 2  }],
      [8,  { description: '+3 DEF',                               defBonus: 3  }],
      [9,  { description: '+3 DEF. Armor 1',                      defBonus: 3,  special: 'armor', specialValue: 1 }],
      [10, { description: 'Legacy Firewall: +5 DEF. Armor 2',     defBonus: 5,  special: 'armor', specialValue: 2 }],
    ]),
  },
  {
    id: 'S49', name: 'of Dead Code', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: Object.fromEntries([
      [1, { description: 'Unreachable branch', isUseless: true }],
      [2, { description: 'Unreachable branch', isUseless: true }],
      [3, { description: 'Unreachable branch', isUseless: true }],
      [4, { description: 'Unreachable branch', isUseless: true }],
      [5, { description: 'Unreachable branch', isUseless: true }],
      [6,  { description: 'In discard: all allies +1 ATK',                special: 'dead_code', specialValue: 1  }],
      [7,  { description: 'In discard: all allies +1 ATK +1 DEF',         special: 'dead_code', specialValue: 11 }],
      [8,  { description: 'In discard: all allies +2 ATK',                special: 'dead_code', specialValue: 20 }],
      [9,  { description: 'In discard: all allies +2 ATK +1 DEF',         special: 'dead_code', specialValue: 21 }],
      [10, { description: 'Necro Process: +3 ATK +2 DEF to allies. Can be recalled once from discard', special: 'dead_code', specialValue: 32 }],
    ]),
  },
  {
    id: 'S50', name: 'of Lorem Ipsum', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: Object.fromEntries([
      [1, { description: 'Placeholder text remaining', isUseless: true }],
      [2, { description: 'Placeholder text remaining', isUseless: true }],
      [3, { description: 'Placeholder text remaining', isUseless: true }],
      [4, { description: 'Placeholder text remaining', isUseless: true }],
      [5, { description: 'Placeholder text remaining', isUseless: true }],
      [6,  { description: '10% chance enemy skips action per turn (confused)',    special: 'lorem_confuse', specialValue: 10 }],
      [7,  { description: '15% chance enemy skips action per turn',               special: 'lorem_confuse', specialValue: 15 }],
      [8,  { description: '20% chance enemy skips action per turn',               special: 'lorem_confuse', specialValue: 20 }],
      [9,  { description: '25% chance enemy skips action per turn',               special: 'lorem_confuse', specialValue: 25 }],
      [10, { description: 'Incomprehensible: 30% per turn enemy cannot play cards', special: 'lorem_confuse', specialValue: 30 }],
    ]),
  },
  {
    id: 'S51', name: 'of TODO', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: Object.fromEntries([
      [1, { description: '// TODO: implement later', isUseless: true }],
      [2, { description: '// TODO: implement later', isUseless: true }],
      [3, { description: '// TODO: implement later', isUseless: true }],
      [4, { description: '// TODO: implement later', isUseless: true }],
      [5, { description: '// TODO: implement later', isUseless: true }],
      [6,  { description: '10% bonus card drop after battle',  special: 'todo_drop', specialValue: 10 }],
      [7,  { description: '15% bonus card drop after battle',  special: 'todo_drop', specialValue: 15 }],
      [8,  { description: '20% bonus card drop after battle',  special: 'todo_drop', specialValue: 20 }],
      [9,  { description: '30% bonus card drop after battle',  special: 'todo_drop', specialValue: 30 }],
      [10, { description: 'Completed TODO: guaranteed bonus drop + extra mod on dropped card', special: 'todo_drop', specialValue: 100 }],
    ]),
  },
  {
    id: 'S52', name: 'of FIXME', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: Object.fromEntries([
      [1, { description: '// FIXME: known issue', isUseless: true }],
      [2, { description: '// FIXME: known issue', isUseless: true }],
      [3, { description: '// FIXME: known issue', isUseless: true }],
      [4, { description: '// FIXME: known issue', isUseless: true }],
      [5, { description: '// FIXME: known issue', isUseless: true }],
      [6,  { description: '5% chance: auto-upgrade 1 mod +1 tier after battle',   special: 'fixme_patch', specialValue: 5  }],
      [7,  { description: '10% chance: auto-upgrade 1 mod +1 tier after battle',  special: 'fixme_patch', specialValue: 10 }],
      [8,  { description: '15% chance: auto-upgrade 1 mod +1 tier after battle',  special: 'fixme_patch', specialValue: 15 }],
      [9,  { description: '20% chance: auto-upgrade 1 mod +1 tier after battle',  special: 'fixme_patch', specialValue: 20 }],
      [10, { description: 'Auto-Patch: 30% after battle — card self-improves over time', special: 'fixme_patch', specialValue: 30 }],
    ]),
  },

  // ── Shield bypass ────────────────────────────────────────────────────
  {
    id: 'P43', name: 'Disrupting', type: 'prefix', applicableTo: ['script'], weight: 60,
    tiers: build(pt(30, 100), v => ({
      description: v >= 100 ? 'Damage bypasses all shield (direct hit)' : `Damage bypasses ${v}% of shield`,
      special: 'shieldbypass', specialValue: v,
    })),
  },
  {
    id: 'P44', name: 'Breaching', type: 'prefix', applicableTo: ['agent'], weight: 50,
    tiers: build(nt(1, 5), v => ({
      description: `Direct attacks deal +${v} bonus true damage (ignores shield)`,
      special: 'truedmg', specialValue: v,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // BOSS MODS (isBossMod: true — only from Architect's Key drops)
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'BM01', name: 'Flux Surge', type: 'suffix', applicableTo: ['agent'], weight: 5, isBossMod: true,
    tiers: build(pt(50, 100), v => ({
      description: v >= 100 ? 'Always attacks twice' : `${v}% chance to attack again after attacking`,
      special: 'fluxsurge', specialValue: v,
    })),
  },
  {
    id: 'BM02', name: "Kael's Algorithm", type: 'suffix', applicableTo: ['agent', 'script'], weight: 5, isBossMod: true,
    tiers: build(nt(0, 1), (v, i) => ({
      description: v > 0 ? "On play: copy the enemy's last used Script (free cast)" : "On play: copy the enemy's last used Script",
      special: 'kaelalgo', specialValue: v,
    })),
  },
  {
    id: 'BM03', name: 'Grid Override', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 5, isBossMod: true,
    tiers: build(nt(0, 2), v => ({
      description: v > 0 ? `Once per game: cast this card for free + draw ${v}` : 'Once per game: cast this card for free',
      special: 'gridoverride', specialValue: v,
    })),
  },
  // ── Graveyard Mods ───────────────────────────────────────────────────────────
  {
    id: 'S53', name: 'of Recall', type: 'suffix', applicableTo: ['agent'], weight: 12,
    tiers: build(nt(3, 1), v => ({
      description: `When destroyed: returns to hand after ${v} turn${v !== 1 ? 's' : ''}`,
      special: 'recall_death', specialValue: v,
    })),
  },
  {
    id: 'S54', name: 'of Haunting', type: 'suffix', applicableTo: ['agent'], weight: 10,
    tiers: build(nt(1, 3), v => ({
      description: `While in graveyard: all allies gain +${v} ATK`,
      special: 'haunt', specialValue: v,
    })),
  },
  {
    id: 'S55', name: 'of Scavenging', type: 'suffix', applicableTo: ['agent'], weight: 14,
    tiers: allSame({ description: 'When destroyed: draw 1 card', special: 'scavenge', specialValue: 1 }),
  },
  {
    id: 'P45', name: 'Undying', type: 'prefix', applicableTo: ['agent'], weight: 8,
    tiers: build(pt(10, 50), v => ({
      description: `${v}% chance to revive with 1 DEF when destroyed`,
      special: 'undying', specialValue: v,
    })),
  },
];

// ── Quick lookup by id ─────────────────────────────────────────────────────────
export const MOD_MAP: Record<string, Mod> = Object.fromEntries(MODS.map((m) => [m.id, m]));
