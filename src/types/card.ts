export type EnergyType = 'volt' | 'cipher' | 'rust' | 'phantom' | 'synth' | 'neutral';
export type CardType = 'agent' | 'script' | 'malware' | 'trap';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Keyword = 'overclock' | 'decrypt' | 'stealth' | 'armor' | 'regen';

// ── Mod system ────────────────────────────────────────────────────────────────
export type ModRarity = 'common' | 'coded' | 'enhanced' | 'overclocked' | 'corrupted' | 'mythic';

export interface AppliedMod {
  modId: string;    // references MODS[id]
  tier: number; // 1 (weakest/Faded) to 10 (strongest/Perfect)
}

// A card that has been randomized with mods. All optional so base cards still work.
export interface CardMods {
  mods: AppliedMod[];           // 0–6 mods (max 3 prefix + 3 suffix)
  modRarity: ModRarity;
  displayName: string;          // e.g. "Ionized Shock Trooper of Stealth"
  locked: string[];             // modIds locked by Quantum Lock
  tierDegradation?: Record<string, number>; // modId → tiers lost (temporary, cleared on zone exit)
}

export interface CardEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'bounce' | 'counter' | 'reveal' | 'summon';
  value?: number;
  target?: 'any' | 'enemy_agent' | 'all_enemy_agents' | 'player' | 'enemy_player' | 'self' | 'all_agents';
  description: string;
}

export interface KeywordData {
  keyword: Keyword;
  value?: number; // for Armor X / Regen X
}

export interface Card {
  id: string;
  name: string;
  /** Unique instance key (base id + mod fingerprint). Used for deck stacking. */
  uniqueId?: string;
  energy: EnergyType;
  type: CardType;
  cost: number;
  rarity: Rarity;
  description: string;
  // Agent only
  attack?: number;
  defense?: number;
  keywords?: KeywordData[];
  // Script / Malware / Trap
  effect?: CardEffect;
  // Trap trigger condition
  triggerCondition?: 'on_attack' | 'on_play_agent' | 'on_play_script' | 'on_damage';
  // Mod system (absent on base cards)
  mods?: CardMods;
  /** Random index into the agent art pool, assigned at generation time */
  artIndex?: number;
}

export interface CardInPlay {
  card: Card;
  instanceId: string;       // unique ID for this instance on the field
  currentAttack: number;
  currentDefense: number;
  tapped: boolean;          // has attacked this turn
  stealthTurns: number;     // turns remaining with stealth
  summonedThisTurn: boolean;
  buffs: { attack: number; defense: number; source: string }[];
}
