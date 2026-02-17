import type { Card } from './card';

export type GameScene = 'title' | 'exploration' | 'battle' | 'battle_rewards' | 'shop' | 'deckbuilder' | 'dialogue';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  name: string;
  health: number;
  maxHealth: number;
  credits: number;
  xp: number;
  level: number;
  position: Position;
  currentDistrict: string;
}

export interface GameProgress {
  defeatedBosses: string[];
  unlockedDistricts: string[];
  defeatedEnemies: string[];   // enemy instance IDs
  totalWins: number;
  totalLosses: number;
  tutorialSeen: boolean;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  animationSpeed: 'normal' | 'fast';
  language: string;
}

export interface GameState {
  player: Player;
  deck: Card[];
  collection: Card[];
  progress: GameProgress;
  settings: GameSettings;
}

export type DistrictId = 'neon_row' | 'chrome_heights' | 'the_sprawl' | 'synth_garden' | 'core_nexus';

export interface District {
  id: DistrictId;
  name: string;
  description: string;
  unlocked: boolean;
  bossDefeated: boolean;
  requiredWins: number; // wins needed to access boss gate
}

export interface NPCDialogue {
  id: string;
  lines: string[];
}

export interface MapObject {
  id: string;
  type: 'enemy' | 'npc' | 'dealer' | 'boss_gate' | 'terminal' | 'checkpoint';
  position: Position;
  defeated?: boolean;
}

export interface BattleRewards {
  credits: number;
  xp: number;
  cardChoices: Card[]; // 3 cards to choose from
}
