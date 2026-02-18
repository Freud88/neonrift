import type { Card, AppliedMod, CardMods, ModRarity } from '@/types/card';
import { MODS, MOD_MAP } from '@/data/mods';
import type { Mod } from '@/data/mods';
import { generateCardName } from './nameGenerator';
import { rollTier as rollTierUtil } from '@/utils/tierUtils';

// ── Rarity from mod count ─────────────────────────────────────────────────────

export function rarityFromModCount(count: number): ModRarity {
  if (count === 0) return 'common';
  if (count === 1) return 'coded';
  if (count === 2) return 'enhanced';
  if (count <= 4)  return 'overclocked';
  if (count === 5) return 'corrupted';
  return 'mythic';  // 6 mods
}

export const MOD_RARITY_COLOR: Record<ModRarity, string> = {
  common:      '#555566',
  coded:       '#cccccc',
  enhanced:    '#4488ff',
  overclocked: '#ffe600',
  corrupted:   '#ff8c00',
  mythic:      '#ff2222',
};

// ── Tier roll (10-tier weighted distribution) ────────────────────────────────
let _riftLevelForTierRoll = 0;
export function setRiftLevelForTierRoll(level: number) { _riftLevelForTierRoll = level; }

function rollTier(riftLevel?: number): number {
  return rollTierUtil(riftLevel ?? _riftLevelForTierRoll);
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

  // Fill up to count, max 3 prefix + 3 suffix
  const MAX_PER_TYPE = 3;
  let prefixCount = 0;
  let suffixCount = 0;
  for (let i = 0; i < count; i++) {
    const canPrefix = prefixCount < MAX_PER_TYPE && prefixes.length > 0;
    const canSuffix = suffixCount < MAX_PER_TYPE && suffixes.length > 0;
    if (canPrefix && canSuffix) {
      if (Math.random() < 0.5) {
        pick(prefixes, MAX_PER_TYPE); prefixCount++;
      } else {
        pick(suffixes, MAX_PER_TYPE); suffixCount++;
      }
    } else if (canPrefix) {
      pick(prefixes, MAX_PER_TYPE); prefixCount++;
    } else if (canSuffix) {
      pick(suffixes, MAX_PER_TYPE); suffixCount++;
    }
  }

  return chosen;
}

// ── Pick a single new mod that doesn't duplicate existing ones ────────────────

export function pickSingleMod(card: Card, existingModIds: string[]): AppliedMod | null {
  const eligible = MODS.filter(
    (m) => !m.isBossMod && m.applicableTo.includes(card.type) && !existingModIds.includes(m.id)
  );
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((s, m) => s + m.weight, 0);
  let rnd = Math.random() * totalWeight;
  for (const m of eligible) {
    rnd -= m.weight;
    if (rnd <= 0) {
      return { modId: m.id, tier: rollTier() };
    }
  }
  return { modId: eligible[eligible.length - 1].id, tier: rollTier() };
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

export function applyModStats(card: Card, mods: AppliedMod[]): Partial<Card> {
  let atkBonus = 0;
  let defBonus = 0;
  let costReduction = 0;
  let costIncrease = 0;
  let effectBonus = 0;   // +damage/+heal/+draw from specials like amp_X
  const extraKeywords: { keyword: string; value?: number }[] = [];
  const degradation = card.mods?.tierDegradation ?? {};

  for (const applied of mods) {
    const mod = MOD_MAP[applied.modId];
    if (!mod) continue;
    // Apply tier degradation (temporary, from decay mods)
    const effectiveTier = Math.max(1, applied.tier - (degradation[applied.modId] ?? 0));
    if (effectiveTier <= 0) continue; // mod fully degraded
    const effect = mod.tiers[effectiveTier];
    if (!effect) continue;

    atkBonus      += effect.atkBonus      ?? 0;
    defBonus      += effect.defBonus      ?? 0;
    costReduction += effect.costReduction ?? 0;
    costIncrease  += effect.costIncrease  ?? 0;

    // Parse specials that modify effect value (script damage/draw/heal)
    if (effect.special === 'amp') {
      effectBonus += effect.specialValue ?? 0;
    }

    if (effect.keywords) {
      for (const kw of effect.keywords) {
        // armor/regen get value from specialValue on the ModEffect
        const val = (kw === 'armor' || kw === 'regen') ? (effect.specialValue ?? 1) : undefined;
        extraKeywords.push({ keyword: kw, value: val });
      }
    }
  }

  const newCost = Math.max(0, card.cost - costReduction + costIncrease);
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

  const result: Partial<Card> = {
    cost: newCost,
    ...(card.attack  !== undefined ? { attack:  newAtk } : {}),
    ...(card.defense !== undefined ? { defense: newDef } : {}),
    ...(merged.length > 0 ? { keywords: merged } : {}),
  };

  // Bake effect bonus into card's effect value (scripts: damage, heal, draw)
  if (card.effect && effectBonus > 0) {
    const baseVal = card.effect.value ?? 0;
    const newVal = baseVal + effectBonus;
    const newDesc = card.effect.description.replace(String(baseVal), String(newVal));
    result.effect = { ...card.effect, value: newVal, description: newDesc };
    // Also update main description
    result.description = card.description.replace(String(baseVal), String(newVal));
  }

  return result;
}

// ── Assign a random art index to any card (call when adding to shop/deck) ─────

export function withRandomArt(card: Card): Card {
  return { ...card, artIndex: Math.floor(Math.random() * 1000) };
}

// ── Main function: generate a modded copy of a base card ─────────────────────

export function generateModdedCard(baseCard: Card, modCount: number): Card {
  if (modCount === 0) return { ...baseCard, artIndex: Math.floor(Math.random() * 1000) };

  const clampedCount = Math.min(6, Math.max(0, modCount));
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
    artIndex: Math.floor(Math.random() * 1000),
  };
}

// ── Helper: how many mods to generate based on enemy difficulty ───────────────

export function modCountForDifficulty(difficulty: number, isBoss: boolean): number {
  if (isBoss) {
    // Boss mod count scales with difficulty
    if (difficulty <= 1) return Math.floor(Math.random() * 2);      // 0–1
    if (difficulty <= 2) return 1 + Math.floor(Math.random() * 2);  // 1–2
    return 3 + Math.floor(Math.random() * 4);                       // 3–6
  }
  if (difficulty >= 4) return 3 + Math.floor(Math.random() * 3); // 3–5
  if (difficulty >= 3) return 1 + Math.floor(Math.random() * 3); // 1–3
  if (difficulty >= 2) return Math.random() < 0.5 ? 1 : 0;       // 0–1
  return 0; // difficulty 1: no mods
}
