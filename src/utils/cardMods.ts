import type { Card, AppliedMod, CardMods, ModRarity } from '@/types/card';
import { MODS, MOD_MAP } from '@/data/mods';
import type { Mod } from '@/data/mods';
import { generateCardName } from './nameGenerator';

// ── Rarity from mod count ─────────────────────────────────────────────────────

export function rarityFromModCount(count: number): ModRarity {
  if (count === 0) return 'common';
  if (count === 1) return 'coded';
  if (count === 2) return 'enhanced';
  if (count === 3) return 'overclocked';
  return 'corrupted';
}

export const MOD_RARITY_COLOR: Record<ModRarity, string> = {
  common:      '#555566',
  coded:       '#cccccc',
  enhanced:    '#4488ff',
  overclocked: '#ffe600',
  corrupted:   '#ff6622',
};

// ── Tier roll (60% T3, 30% T2, 10% T1) ──────────────────────────────────────

function rollTier(): 1 | 2 | 3 {
  const r = Math.random();
  if (r < 0.10) return 1;
  if (r < 0.40) return 2;
  return 3;
}

// ── Pick random mods for a card ───────────────────────────────────────────────

function pickMods(card: Card, count: number): AppliedMod[] {
  // Filter eligible mods (right type, not boss)
  const eligible = MODS.filter(
    (m) => !m.isBossMod && m.applicableTo.includes(card.type)
  );

  const prefixes = eligible.filter((m) => m.type === 'prefix');
  const suffixes = eligible.filter((m) => m.type === 'suffix');

  const chosen: AppliedMod[] = [];
  const usedIds = new Set<string>();

  const pick = (pool: Mod[], maxSlots: number) => {
    // Weighted random pick
    const available = pool.filter((m) => !usedIds.has(m.id));
    if (available.length === 0 || chosen.filter((c) => {
      const mod = MOD_MAP[c.modId];
      return mod.type === pool[0]?.type;
    }).length >= maxSlots) return;

    const totalWeight = available.reduce((s, m) => s + m.weight, 0);
    let rnd = Math.random() * totalWeight;
    for (const m of available) {
      rnd -= m.weight;
      if (rnd <= 0) {
        usedIds.add(m.id);
        chosen.push({ modId: m.id, tier: rollTier() });
        return;
      }
    }
  };

  // Fill up to count, alternating prefix/suffix or filling available slots
  let prefixCount = 0;
  let suffixCount = 0;
  for (let i = 0; i < count; i++) {
    if (prefixCount < 2 && suffixCount < 2) {
      // Alternate or pick randomly
      if (Math.random() < 0.5 && prefixes.length > 0) {
        pick(prefixes, 2);
        prefixCount++;
      } else if (suffixes.length > 0) {
        pick(suffixes, 2);
        suffixCount++;
      } else {
        pick(prefixes, 2);
        prefixCount++;
      }
    } else if (prefixCount < 2) {
      pick(prefixes, 2);
      prefixCount++;
    } else {
      pick(suffixes, 2);
      suffixCount++;
    }
  }

  return chosen;
}

// ── Build display name ────────────────────────────────────────────────────────

function buildDisplayName(card: Card, mods: AppliedMod[]): string {
  const prefixMod = mods.find((m) => MOD_MAP[m.modId]?.type === 'prefix');
  const suffixMod = mods.find((m) => MOD_MAP[m.modId]?.type === 'suffix');

  const prefix = prefixMod ? MOD_MAP[prefixMod.modId].name + ' ' : '';
  const suffix = suffixMod ? ' ' + MOD_MAP[suffixMod.modId].name : '';
  return `${prefix}${card.name}${suffix}`;
}

// ── Apply mods to base stats ──────────────────────────────────────────────────

function applyModStats(card: Card, mods: AppliedMod[]): Partial<Card> {
  let atkBonus = 0;
  let defBonus = 0;
  let costReduction = 0;
  const extraKeywords: { keyword: string; value?: number }[] = [];

  for (const applied of mods) {
    const mod = MOD_MAP[applied.modId];
    if (!mod) continue;
    const effect = mod.tiers[applied.tier];

    atkBonus      += effect.atkBonus      ?? 0;
    defBonus      += effect.defBonus      ?? 0;
    costReduction += effect.costReduction ?? 0;

    if (effect.keywords) {
      for (const kw of effect.keywords) {
        // armor/regen get value from tier
        const val = kw === 'armor' || kw === 'regen' ? (4 - applied.tier) : undefined;
        extraKeywords.push({ keyword: kw, value: val });
      }
    }
  }

  const newCost = Math.max(0, card.cost - costReduction);
  const newAtk  = (card.attack  ?? 0) + atkBonus;
  const newDef  = (card.defense ?? 0) + defBonus;

  // Merge keywords
  const baseKw = card.keywords ?? [];
  const merged = [...baseKw];
  for (const ek of extraKeywords) {
    if (!merged.some((k) => k.keyword === ek.keyword)) {
      merged.push(ek as { keyword: import('@/types/card').Keyword; value?: number });
    }
  }

  return {
    cost: newCost,
    ...(card.attack  !== undefined ? { attack:  newAtk } : {}),
    ...(card.defense !== undefined ? { defense: newDef } : {}),
    ...(merged.length > 0 ? { keywords: merged } : {}),
  };
}

// ── Main function: generate a modded copy of a base card ─────────────────────

export function generateModdedCard(baseCard: Card, modCount: number): Card {
  if (modCount === 0) return baseCard;

  const clampedCount = Math.min(4, Math.max(0, modCount));
  const mods = pickMods(baseCard, clampedCount);

  // Deterministic unique id: baseCard.id + sorted mod fingerprint
  const modKey = mods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_');
  const uniqueId = `${baseCard.id}__${modKey}`;

  // Generated unique name (cyberpunk, deterministic)
  const generatedName = generateCardName(baseCard, mods);
  // Legacy display name (Prefix CardName of Suffix) — kept for mod tooltip header
  const displayName = generatedName;

  const modRarity = rarityFromModCount(mods.length);
  const statOverrides = applyModStats(baseCard, mods);

  const cardMods: CardMods = {
    mods,
    modRarity,
    displayName,
    locked: [],
  };

  return {
    ...baseCard,
    ...statOverrides,
    name: generatedName,
    uniqueId,
    mods: cardMods,
  };
}

// ── Helper: how many mods to generate based on enemy difficulty ───────────────

export function modCountForDifficulty(difficulty: number, isBoss: boolean): number {
  if (isBoss) return 2 + Math.floor(Math.random() * 2);  // 2–3
  if (difficulty >= 3) return 1 + Math.floor(Math.random() * 2); // 1–2
  if (difficulty >= 2) return Math.random() < 0.5 ? 1 : 0;       // 0–1
  return 0; // difficulty 1: no mods
}
