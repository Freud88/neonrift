export type EnergyType = 'volt' | 'cipher' | 'rust' | 'phantom' | 'synth' | 'neutral';
export type CardType = 'agent' | 'script' | 'malware' | 'trap';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Keyword = 'overclock' | 'decrypt' | 'stealth' | 'armor' | 'regen' | 'taunt';

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
  riftAbility?: { abilityId: string; tier: number }; // boss-dropped rift ability
}

export interface CardEffect {
  type: 'damage' | 'heal' | 'draw' | 'buff' | 'debuff' | 'bounce' | 'counter' | 'reveal' | 'summon' | 'recall' | 'resurrect' | 'recycle';
  value?: number;
  target?: 'any' | 'enemy_agent' | 'all_enemy_agents' | 'all_enemies' | 'player' | 'enemy_player' | 'enemy' | 'self' | 'self_agent' | 'all_agents';
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
  triggerCondition?: 'on_attack' | 'on_play_agent' | 'on_play_script' | 'on_damage' | 'on_ally_death' | 'on_enemy_script' | 'on_enemy_agent';
  // Mod system (absent on base cards)
  mods?: CardMods;
  /** Random index into the agent art pool, assigned at generation time */
  artIndex?: number;
  /** True if this card was duplicated by an Echo Prism — immutable, immune to crafting/decay */
  isEchoed?: boolean;
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
  /** Remaining extra triggers from Layered mod (undefined = not layered) */
  layeredCharges?: number;
  /** Remaining turns this agent cannot attack (Sluggish mod) */
  sluggishTurns?: number;
  /** Whether this agent has immunity this turn (Sluggish T10) */
  sluggishImmune?: boolean;
  /** Turn number when this agent was played (for Corroded T6 every-2-turns check) */
  playedOnTurn?: number;
  /** Number of turns this card has been in hand (for Memory Leak mod) */
  turnsInHand?: number;
  /** Turns this agent has been on the field (for Overheating mod) */
  turnsOnField?: number;
}
