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
    tiers: build(nt(2, 99), v => ({
      description: v >= 99 ? 'Triggers every time (permanent)' : `Triggers ${v} times`,
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
    tiers: build(pt(50, 100), v => ({
      description: v >= 100 ? 'Launches effect twice at 100% efficacy' : `Launches effect twice at ${v}% efficacy`,
      special: 'forked', specialValue: v,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // PREFIXES — BAD / NEGATIVE (Weight 250–400)
  // T1 = max penalty, T10 = no penalty or small bonus
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'P28', name: 'Glitched', type: 'prefix', applicableTo: ['agent'], weight: 350,
    tiers: build2(it(5), it(3), (aPen, dPen, i) => ({
      description: aPen === 0 && dPen === 0
        ? (i === 9 ? '+1 ATK' : 'No effect')
        : dPen > 0 ? `-${aPen} ATK, -${dPen} DEF` : `-${aPen} ATK`,
      atkBonus: aPen === 0 && i === 9 ? 1 : aPen > 0 ? -aPen : 0,
      defBonus: dPen > 0 ? -dPen : 0,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P29', name: 'Fragile', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(5), (v, i) => ({
      description: v > 0 ? `-${v} DEF` : (i === 9 ? '+1 DEF' : 'No effect'),
      defBonus: v > 0 ? -v : (i === 9 ? 1 : 0),
      isNegative: i < 8,
    })),
  },
  {
    id: 'P30', name: 'Bloated', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: build(it(4), (v, i) => ({
      description: v > 0 ? `+${v} Cost` : (i === 9 ? '-1 Cost' : 'No effect'),
      costIncrease: v > 0 ? v : undefined,
      costReduction: i === 9 ? 1 : undefined,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P31', name: 'Unstable', type: 'prefix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(80), (v, i) => ({
      description: v > 0 ? `${v}% self-destruct at end of turn` : 'Stable',
      special: 'unstable', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P32', name: 'Sluggish', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? "Cannot attack the turn it's played" : 'No penalty',
      special: 'sluggish', specialValue: v,
      isNegative: i < 8,
    })),
  },
  {
    id: 'P33', name: 'Leaking', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Lose ${v} HP at start of your turn while in play` : 'No effect',
      special: 'leaking', specialValue: v,
      isNegative: i < 8,
    })),
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
  {
    id: 'P36', name: 'Corroded', type: 'prefix', applicableTo: ['agent'], weight: 200,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `-${v} ATK per turn (min 0)` : 'No effect',
      special: 'corroded', specialValue: v,
      isNegative: i < 8,
    })),
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
  {
    id: 'P41', name: 'Bricked', type: 'prefix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Cannot attack; contributes to shield only' : 'No restriction',
      special: 'bricked', specialValue: v,
      isNegative: i < 8,
    })),
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

  {
    id: 'S31', name: 'of Static', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'Must always attack the same target' : 'No restriction',
      special: 'static', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S32', name: 'of Feedback Loop', type: 'suffix', applicableTo: ['agent'], weight: 300,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `On death: discard ${v} random card${v > 1 ? 's' : ''}` : 'No effect',
      special: 'feedbackloop', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S33', name: 'of the Breach', type: 'suffix', applicableTo: ['agent'], weight: 350,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Enemy draws ${v} card${v > 1 ? 's' : ''} when this enters` : 'No effect',
      special: 'breach', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S34', name: 'of Short Circuit', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(40), (v, i) => ({
      description: v > 0 ? `On attack: ${v}% chance to take 1 self-damage` : 'No penalty',
      special: 'shortcircuit', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S35', name: 'of Lag', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: build(it(1), (v, i) => ({
      description: v > 0 ? 'This Agent always acts last' : 'No penalty',
      special: 'lag', specialValue: v, isNegative: i < 8,
    })),
  },
  {
    id: 'S36', name: 'of Memory Leak', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(it(2), (v, i) => ({
      description: v > 0 ? `Each turn in play: +${v} cost to cards in hand` : 'No effect',
      special: 'memleak', specialValue: v, isNegative: i < 8,
    })),
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
  {
    id: 'S39', name: 'of False Positive', type: 'suffix', applicableTo: ['agent'], weight: 200,
    tiers: build(it(50), (v, i) => ({
      description: v > 0 ? `${v}% chance to attack a random ally instead` : 'No penalty',
      special: 'falsepositive', specialValue: v, isNegative: i < 8,
    })),
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
  {
    id: 'S45', name: 'of Planned Obsolescence', type: 'suffix', applicableTo: ['agent'], weight: 250,
    tiers: build(nt(2, 99), (v, i) => ({
      description: v >= 99 ? 'Never self-destructs' : `Self-destructs after ${v} turns`,
      special: 'obsolete', specialValue: v, isNegative: i < 7,
    })),
  },

  // ══════════════════════════════════════════════════════════════════════
  // SUFFIXES — USELESS (Weight 300–400)
  // T1-T7: no effect. T8: +1 ATK. T9: +1/+1. T10: +2/+2.
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'S46', name: 'of Noise', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: uselessTiers('Signal interference detected'),
  },
  {
    id: 'S47', name: 'of Deprecated Code', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 400,
    tiers: uselessTiers('Legacy compatibility layer'),
  },
  {
    id: 'S48', name: 'of Legacy Systems', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: uselessTiers('Backward compatible (unused)'),
  },
  {
    id: 'S49', name: 'of Dead Code', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: uselessTiers('Unreachable branch'),
  },
  {
    id: 'S50', name: 'of Lorem Ipsum', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: uselessTiers('Placeholder text remaining'),
  },
  {
    id: 'S51', name: 'of TODO', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 350,
    tiers: uselessTiers('// TODO: implement later'),
  },
  {
    id: 'S52', name: 'of FIXME', type: 'suffix',
    applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 300,
    tiers: uselessTiers('// FIXME: known issue'),
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
];

// ── Quick lookup by id ─────────────────────────────────────────────────────────
export const MOD_MAP: Record<string, Mod> = Object.fromEntries(MODS.map((m) => [m.id, m]));
