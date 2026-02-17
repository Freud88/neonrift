export type EnergyType = 'volt' | 'cipher' | 'rust' | 'phantom' | 'synth' | 'neutral';
export type CardType = 'agent' | 'script' | 'malware' | 'trap';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Keyword = 'overclock' | 'decrypt' | 'stealth' | 'armor' | 'regen';

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
