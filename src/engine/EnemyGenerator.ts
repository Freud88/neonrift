import { seededRandom, seededPick, seededShuffle, seededInt } from '@/utils/seededRandom';
import { CARDS } from '@/data/cards';
import type { EnemyProfile, AIType } from '@/types/enemy';
import type { ZoneConfig } from '@/types/zone';
import type { DeckArchetype } from '@/types/zone';
import {
  ENEMY_PREFIXES, ENEMY_NAMES,
  BOSS_PREFIXES, BOSS_NAMES, BOSS_TITLES,
  ENEMY_DIALOGUE_PRE, ENEMY_DIALOGUE_WIN, ENEMY_DIALOGUE_LOSE,
  BOSS_DIALOGUE_PRE, BOSS_DIALOGUE_WIN, BOSS_DIALOGUE_LOSE,
} from '@/data/bossNames';

const ARCHETYPES: DeckArchetype[] = ['aggro', 'control', 'midrange', 'swarm', 'burn', 'tank', 'chaos'];

const ARCHETYPE_AI: Record<DeckArchetype, AIType> = {
  aggro:    'aggressive',
  control:  'defensive',
  midrange: 'basic',
  swarm:    'aggressive',
  burn:     'aggressive',
  tank:     'defensive',
  chaos:    'basic',
};

const ARCHETYPE_ENERGY_BIAS: Record<DeckArchetype, 'volt' | 'cipher' | null> = {
  aggro:    'volt',
  control:  'cipher',
  midrange: null,
  swarm:    'volt',
  burn:     'volt',
  tank:     'cipher',
  chaos:    null,
};

const SPRITE_COLORS = [
  '#ff4444', '#ff8800', '#ffcc00', '#ff00aa',
  '#aa00ff', '#00aaff', '#44ff88', '#ff6644',
];

// Decay stage stat multipliers for ATK and DEF
const DECAY_ATK_MULT = [1.0, 1.0, 1.1, 1.2, 1.4, 1.6];
const DECAY_DEF_MULT = [1.0, 1.0, 1.05, 1.1, 1.2, 1.3];

/** Generate a procedural enemy profile from a seed and zone configuration. */
export function generateEnemyProfile(
  seed: string,
  config: ZoneConfig,
  isBoss: boolean = false,
  decayStage: number = 0,
): EnemyProfile {
  const rng = seededRandom(seed);
  const level = config.level;
  const scaling = isBoss ? config.bossScaling : config.enemyScaling;

  // Name
  const name = isBoss
    ? `${seededPick(BOSS_PREFIXES, rng)} ${seededPick(BOSS_NAMES, rng)}`
    : `${seededPick(ENEMY_PREFIXES, rng)} ${seededPick(ENEMY_NAMES, rng)}`;
  const title = isBoss
    ? seededPick(BOSS_TITLES, rng)
    : `Zone ${level} Hostile`;

  // Archetype
  const archetype = seededPick(ARCHETYPES, rng);
  const aiType: AIType = isBoss ? 'boss' : ARCHETYPE_AI[archetype];

  // Stats (scaled by decay stage, reduced for early levels)
  const dStage = Math.min(decayStage, DECAY_ATK_MULT.length - 1);
  const earlyHealthScale = level <= 2 ? 0.65 : level <= 4 ? 0.8 : 1.0;
  const baseHealth = isBoss ? (level <= 2 ? 15 : 20) : (level <= 2 ? 8 : 12);
  const health = Math.round(baseHealth * scaling.healthMultiplier * DECAY_DEF_MULT[dStage] * earlyHealthScale);
  const difficulty: 1 | 2 | 3 = isBoss ? (level <= 2 ? 1 : 3) : (level <= 3 ? 1 : level <= 6 ? 2 : 3);

  // Deck building (smaller decks for early levels)
  const deckSize = isBoss ? (level <= 2 ? 18 : 25) : (level <= 2 ? 15 : 20);
  const energyBias = ARCHETYPE_ENERGY_BIAS[archetype];
  const deck = buildDeck(deckSize, energyBias, archetype, rng, level);

  // Rewards
  const baseCredits = isBoss ? 50 : 15;
  const credits = Math.round(baseCredits * (1 + (level - 1) * 0.2));
  const xp = isBoss ? 50 + level * 10 : 10 + level * 3;

  // Dialogue
  const dialogue = isBoss
    ? {
        preBattle: seededPick(BOSS_DIALOGUE_PRE, rng),
        onWin: seededPick(BOSS_DIALOGUE_WIN, rng),
        onLose: seededPick(BOSS_DIALOGUE_LOSE, rng),
      }
    : {
        preBattle: seededPick(ENEMY_DIALOGUE_PRE, rng),
        onWin: seededPick(ENEMY_DIALOGUE_WIN, rng),
        onLose: seededPick(ENEMY_DIALOGUE_LOSE, rng),
      };

  return {
    id: `proc_${seed}`,
    name,
    title,
    health,
    deck,
    difficulty,
    aiType,
    isBoss,
    spriteColor: seededPick(SPRITE_COLORS, rng),
    rewards: { credits, xpGain: xp },
    dialogue,
  };
}

/** Build a deck of card IDs based on archetype and energy bias. */
function buildDeck(
  size: number,
  energyBias: 'volt' | 'cipher' | null,
  archetype: DeckArchetype,
  rng: () => number,
  level: number = 99,
): string[] {
  // Filter cards by energy type preference and rarity for early levels
  const pool = CARDS.filter((c) => {
    if (energyBias) {
      if (c.energy !== energyBias && c.energy !== 'neutral') return false;
    }
    // Early levels: only common cards (no uncommon/rare powerhouses)
    if (level <= 3 && c.rarity !== 'common') return false;
    if (level <= 5 && c.rarity === 'rare') return false;
    return true;
  });

  // Weight cards by archetype preference
  const weighted: { id: string; weight: number }[] = pool.map((c) => {
    let w = 1;
    if (archetype === 'aggro' || archetype === 'burn') {
      if (c.type === 'agent' && (c.attack ?? 0) >= 3) w += 2;
      if (c.effect?.type === 'damage') w += 2;
    }
    if (archetype === 'control' || archetype === 'tank') {
      if (c.type === 'agent' && (c.defense ?? 0) >= 3) w += 2;
      if (c.effect?.type === 'heal' || c.effect?.type === 'buff') w += 2;
      if (c.type === 'trap') w += 1;
    }
    if (archetype === 'swarm') {
      if (c.type === 'agent' && c.cost <= 2) w += 3;
    }
    if (archetype === 'midrange' || archetype === 'chaos') {
      w += 1; // all cards equal
    }
    return { id: c.id, weight: w };
  });

  // Weighted random pick
  const deck: string[] = [];
  for (let i = 0; i < size; i++) {
    const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
    let roll = rng() * totalWeight;
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) {
        deck.push(w.id);
        break;
      }
    }
  }

  return seededShuffle(deck, rng);
}
