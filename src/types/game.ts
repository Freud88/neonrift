import type { Card } from './card';
import type { PlayerSkills } from './skills';

export type GameScene =
  | 'title' | 'exploration' | 'battle' | 'battle_rewards'
  | 'shop' | 'deckbuilder' | 'dialogue'
  | 'city_hub' | 'zone_select' | 'zone';

// ── Crafting items ────────────────────────────────────────────────────────────
export type CraftingItemId =
  | 'data_fragment'
  | 'wipe_drive'
  | 'recompiler'
  | 'tier_boost'
  | 'architects_key'
  | 'quantum_lock'
  | 'echo_prism';

export interface CraftingItem {
  id: CraftingItemId;
  quantity: number;
}

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
  maxZoneLevel: number;      // highest unlocked zone (starts at 1)
  zonesCompleted: number;    // total boss kills across all zones
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  animationSpeed: 'normal' | 'fast';
  language: string;
}

export interface RiftEssence {
  abilityId: string;
  tier: number;
}

export interface GameState {
  player: Player;
  deck: Card[];
  collection: Card[];
  inventory: CraftingItem[];
  progress: GameProgress;
  settings: GameSettings;
  skills?: PlayerSkills;
  riftEssences?: RiftEssence[];
  _tierVersion?: number; // 2 = 10-tier system
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
  craftingDrop?: CraftingItem | null; // bonus drop
}
