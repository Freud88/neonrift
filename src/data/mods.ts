import type { CardType } from '@/types/card';

export type ModType = 'prefix' | 'suffix';

export interface ModEffect {
  description: string;
  atkBonus?: number;
  defBonus?: number;
  costReduction?: number;
  shieldBonus?: number;
  keywords?: string[];   // keyword ids to add
  special?: string;      // handled by BattleEngine
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
  // ── PREFIXES — AGENT ──────────────────────────────────────────────────────

  {
    id: 'P01', name: 'Overloaded', type: 'prefix', applicableTo: ['agent'], weight: 10,
    tiers: {
      3: { description: '+1 ATK', atkBonus: 1 },
      2: { description: '+2 ATK', atkBonus: 2 },
      1: { description: '+3 ATK', atkBonus: 3 },
    },
  },
  {
    id: 'P02', name: 'Reinforced', type: 'prefix', applicableTo: ['agent'], weight: 10,
    tiers: {
      3: { description: '+1 DEF', defBonus: 1 },
      2: { description: '+2 DEF', defBonus: 2 },
      1: { description: '+3 DEF', defBonus: 3 },
    },
  },
  {
    id: 'P03', name: 'Ionized', type: 'prefix', applicableTo: ['agent'], weight: 8,
    tiers: {
      3: { description: '+1 ATK, +1 DEF', atkBonus: 1, defBonus: 1 },
      2: { description: '+1 ATK, +2 DEF', atkBonus: 1, defBonus: 2 },
      1: { description: '+2 ATK, +2 DEF', atkBonus: 2, defBonus: 2 },
    },
  },
  {
    id: 'P04', name: 'Optimized', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 7,
    tiers: {
      3: { description: '-1 Cost (min 1)', costReduction: 1 },
      2: { description: '-1 Cost (min 1)', costReduction: 1 },
      1: { description: '-2 Cost (min 1)', costReduction: 2 },
    },
  },
  {
    id: 'P05', name: 'Augmented', type: 'prefix', applicableTo: ['agent'], weight: 6,
    tiers: {
      3: { description: 'Enters with 1 Shield', shieldBonus: 1, special: 'shield_1' },
      2: { description: 'Enters with 2 Shield', shieldBonus: 2, special: 'shield_2' },
      1: { description: 'Enters with 3 Shield', shieldBonus: 3, special: 'shield_3' },
    },
  },
  {
    id: 'P07', name: 'Volatile', type: 'prefix', applicableTo: ['agent'], weight: 6,
    tiers: {
      3: { description: '+2 ATK, -1 DEF', atkBonus: 2, defBonus: -1 },
      2: { description: '+3 ATK, -2 DEF', atkBonus: 3, defBonus: -2 },
      1: { description: '+4 ATK, -3 DEF', atkBonus: 4, defBonus: -3 },
    },
  },
  {
    id: 'P09', name: 'Networked', type: 'prefix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: '+1 ATK per ally Agent', special: 'networked_3' },
      2: { description: '+1 ATK and +1 DEF per ally Agent', special: 'networked_2' },
      1: { description: '+2 ATK per ally Agent', special: 'networked_1' },
    },
  },
  {
    id: 'P10', name: 'Encrypted', type: 'prefix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: 'Cannot be targeted by Scripts for 1 turn', special: 'encrypted_3' },
      2: { description: 'Cannot be targeted by Scripts for 2 turns', special: 'encrypted_2' },
      1: { description: 'Cannot be targeted by Scripts permanently', special: 'encrypted_1' },
    },
  },

  // ── PREFIXES — SCRIPT ────────────────────────────────────────────────────

  {
    id: 'P11', name: 'Amplified', type: 'prefix', applicableTo: ['script'], weight: 9,
    tiers: {
      3: { description: '+1 damage', special: 'amp_3' },
      2: { description: '+2 damage', special: 'amp_2' },
      1: { description: '+3 damage', special: 'amp_1' },
    },
  },
  {
    id: 'P12', name: 'Cascading', type: 'prefix', applicableTo: ['script'], weight: 5,
    tiers: {
      3: { description: 'Hits 1 extra target', special: 'cascade_3' },
      2: { description: 'Hits 2 extra targets', special: 'cascade_2' },
      1: { description: 'Hits all enemies', special: 'cascade_1' },
    },
  },
  {
    id: 'P13', name: 'Recursive', type: 'prefix', applicableTo: ['script', 'trap'], weight: 4,
    tiers: {
      3: { description: '30% chance: return to hand', special: 'recursive_3' },
      2: { description: '30% chance: return to hand', special: 'recursive_3' },
      1: { description: '50% chance: return to hand', special: 'recursive_1' },
    },
  },

  // ── PREFIXES — MALWARE ───────────────────────────────────────────────────

  {
    id: 'P16', name: 'Persistent', type: 'prefix', applicableTo: ['malware'], weight: 6,
    tiers: {
      3: { description: '+1 turn duration', special: 'persist_3' },
      2: { description: '+2 turns duration', special: 'persist_2' },
      1: { description: 'Permanent (never expires)', special: 'persist_1' },
    },
  },
  {
    id: 'P17', name: 'Distributed', type: 'prefix', applicableTo: ['malware'], weight: 5,
    tiers: {
      3: { description: 'Effect +25%', special: 'dist_3' },
      2: { description: 'Effect +50%', special: 'dist_2' },
      1: { description: 'Effect +100%', special: 'dist_1' },
    },
  },

  // ── PREFIXES — TRAP ──────────────────────────────────────────────────────

  {
    id: 'P19', name: 'Layered', type: 'prefix', applicableTo: ['trap'], weight: 5,
    tiers: {
      3: { description: 'Activates 2 times', special: 'layered_3' },
      2: { description: 'Activates 3 times', special: 'layered_2' },
      1: { description: 'Activates every time (permanent)', special: 'layered_1' },
    },
  },

  // ── SUFFIXES — AGENT ─────────────────────────────────────────────────────

  {
    id: 'S01', name: 'of Overclocking', type: 'suffix', applicableTo: ['agent'], weight: 6,
    tiers: {
      3: { description: 'Overclock', keywords: ['overclock'] },
      2: { description: 'Overclock + first attack deals +1 damage', keywords: ['overclock'], special: 'oc_bonus_2' },
      1: { description: 'Overclock + first attack deals +2 damage', keywords: ['overclock'], special: 'oc_bonus_1' },
    },
  },
  {
    id: 'S02', name: 'of Stealth', type: 'suffix', applicableTo: ['agent'], weight: 6,
    tiers: {
      3: { description: 'Stealth 1', keywords: ['stealth'], special: 'stealth_1' },
      2: { description: 'Stealth 2', keywords: ['stealth'], special: 'stealth_2' },
      1: { description: 'Stealth (until first attack)', keywords: ['stealth'], special: 'stealth_perm' },
    },
  },
  {
    id: 'S03', name: 'of the Firewall', type: 'suffix', applicableTo: ['agent'], weight: 7,
    tiers: {
      3: { description: 'Armor 1', keywords: ['armor'], special: 'armor_1' },
      2: { description: 'Armor 2', keywords: ['armor'], special: 'armor_2' },
      1: { description: 'Armor 3', keywords: ['armor'], special: 'armor_3' },
    },
  },
  {
    id: 'S04', name: 'of Regeneration', type: 'suffix', applicableTo: ['agent'], weight: 6,
    tiers: {
      3: { description: 'Regen 1', keywords: ['regen'], special: 'regen_1' },
      2: { description: 'Regen 2', keywords: ['regen'], special: 'regen_2' },
      1: { description: 'Regen 3', keywords: ['regen'], special: 'regen_3' },
    },
  },
  {
    id: 'S06', name: 'of Drain', type: 'suffix', applicableTo: ['agent'], weight: 5,
    tiers: {
      3: { description: 'On direct damage: heal 1', special: 'drain_3' },
      2: { description: 'On direct damage: heal 2', special: 'drain_2' },
      1: { description: 'On direct damage: heal 3', special: 'drain_1' },
    },
  },
  {
    id: 'S07', name: 'of Corrosion', type: 'suffix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: 'On attack: target -1 DEF permanently', special: 'corrode_3' },
      2: { description: 'On attack: target -1 ATK, -1 DEF', special: 'corrode_2' },
      1: { description: 'On attack: target -2 ATK, -1 DEF', special: 'corrode_1' },
    },
  },
  {
    id: 'S09', name: 'of Detonation', type: 'suffix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: 'On death: deal 1 damage to all enemies', special: 'detonate_3' },
      2: { description: 'On death: deal 2 damage to all enemies', special: 'detonate_2' },
      1: { description: 'On death: deal 3 damage to all enemies and enemy player', special: 'detonate_1' },
    },
  },
  {
    id: 'S10', name: 'of Phasing', type: 'suffix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: '30% chance to bypass blockers', special: 'phase_3' },
      2: { description: '50% chance to bypass blockers', special: 'phase_2' },
      1: { description: 'Cannot be blocked', special: 'phase_1' },
    },
  },
  {
    id: 'S11', name: 'of Recursion', type: 'suffix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: 'On death: 30% chance return to hand', special: 'recurse_3' },
      2: { description: 'On death: 50% chance return to hand', special: 'recurse_2' },
      1: { description: 'On death: always return to hand', special: 'recurse_1' },
    },
  },
  {
    id: 'S12', name: 'of Command', type: 'suffix', applicableTo: ['agent'], weight: 4,
    tiers: {
      3: { description: 'On enter: random ally Agent gets +1/+1', special: 'command_3' },
      2: { description: 'On enter: random ally Agent gets +2/+1', special: 'command_2' },
      1: { description: 'On enter: all ally Agents get +1/+1', special: 'command_1' },
    },
  },
  {
    id: 'S13', name: 'of Vampirism', type: 'suffix', applicableTo: ['agent'], weight: 3,
    tiers: {
      3: { description: 'Lifesteal 25%', special: 'vamp_3' },
      2: { description: 'Lifesteal 50%', special: 'vamp_2' },
      1: { description: 'Lifesteal 100%', special: 'vamp_1' },
    },
  },

  // ── SUFFIXES — SCRIPT ────────────────────────────────────────────────────

  {
    id: 'S15', name: 'of Siphoning', type: 'suffix', applicableTo: ['script'], weight: 6,
    tiers: {
      3: { description: 'Also heal 1', special: 'siphon_3' },
      2: { description: 'Also heal 2', special: 'siphon_2' },
      1: { description: 'Also heal 3', special: 'siphon_1' },
    },
  },
  {
    id: 'S16', name: 'of Feedback', type: 'suffix', applicableTo: ['script', 'trap'], weight: 5,
    tiers: {
      3: { description: 'Draw 1 card', special: 'feedback_3' },
      2: { description: 'Draw 1, enemy discards 1', special: 'feedback_2' },
      1: { description: 'Draw 2, enemy discards 1', special: 'feedback_1' },
    },
  },
  {
    id: 'S17', name: 'of Disruption', type: 'suffix', applicableTo: ['script'], weight: 4,
    tiers: {
      3: { description: 'Enemy loses 1 Data Cell', special: 'disrupt_3' },
      2: { description: 'Enemy loses 2 Data Cells', special: 'disrupt_2' },
      1: { description: 'Enemy loses 3 Data Cells', special: 'disrupt_1' },
    },
  },

  // ── SUFFIXES — MALWARE ───────────────────────────────────────────────────

  {
    id: 'S19', name: 'of Spreading', type: 'suffix', applicableTo: ['malware'], weight: 4,
    tiers: {
      3: { description: 'Effect applies to 1 extra energy type', special: 'spread_3' },
      2: { description: 'Effect applies to 2 extra energy types', special: 'spread_2' },
      1: { description: 'Effect applies to all energy types', special: 'spread_1' },
    },
  },

  // ── BOSS MODS (isBossMod: true) ───────────────────────────────────────────

  {
    id: 'BM01', name: 'Flux Surge', type: 'suffix', applicableTo: ['agent'], weight: 0, isBossMod: true,
    tiers: {
      3: { description: 'On attack: 50% chance to attack again', special: 'flux_surge' },
      2: { description: 'On attack: 50% chance to attack again', special: 'flux_surge' },
      1: { description: 'On attack: 50% chance to attack again', special: 'flux_surge' },
    },
  },
  {
    id: 'BM02', name: "Kael's Algorithm", type: 'suffix', applicableTo: ['agent'], weight: 0, isBossMod: true,
    tiers: {
      3: { description: "On enter: copy enemy's last Script", special: 'kael_algo' },
      2: { description: "On enter: copy enemy's last Script", special: 'kael_algo' },
      1: { description: "On enter: copy enemy's last Script", special: 'kael_algo' },
    },
  },
  {
    id: 'BM03', name: 'Grid Override', type: 'prefix', applicableTo: ['agent', 'script', 'malware', 'trap'], weight: 0, isBossMod: true,
    tiers: {
      3: { description: 'Once per game: costs 0 Data Cells', special: 'grid_override' },
      2: { description: 'Once per game: costs 0 Data Cells', special: 'grid_override' },
      1: { description: 'Once per game: costs 0 Data Cells', special: 'grid_override' },
    },
  },
];

export const MOD_MAP: Record<string, Mod> = Object.fromEntries(MODS.map((m) => [m.id, m]));
