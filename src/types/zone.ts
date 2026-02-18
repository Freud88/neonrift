import type { EnergyType } from './card';
import type { AIType } from './enemy';

// ── Biomes ───────────────────────────────────────────────────────────────────
export type BiomeId =
  | 'neon_streets'
  | 'industrial_wasteland'
  | 'data_swamp'
  | 'chrome_forest'
  | 'void_sector'
  | 'rusted_depths';

// ── Chunk coordinates ────────────────────────────────────────────────────────
export interface ChunkCoord {
  cx: number;
  cy: number;
}

// ── Zone configuration (computed from level) ─────────────────────────────────
export interface ZoneConfig {
  level: number;
  seed: string;
  biome: BiomeId;
  shardsRequired: number;
  enemyScaling: {
    atkMultiplier: number;
    defMultiplier: number;
    healthMultiplier: number;
    modCountMin: number;
    modCountMax: number;
  };
  bossScaling: {
    atkMultiplier: number;
    defMultiplier: number;
    healthMultiplier: number;
    modCountMin: number;
    modCountMax: number;
  };
}

// ── Rift Decay clock ─────────────────────────────────────────────────────────
export interface RiftClock {
  elapsedMs: number;
  currentStage: number;  // 0–5
}

// ── Live zone state (tracked during a zone run) ─────────────────────────────
export interface ZoneState {
  config: ZoneConfig;
  shardsCollected: number;
  gridKeyForged: boolean;
  bossSpawned: boolean;
  bossDefeated: boolean;
  defeatedEnemyKeys: string[];   // "cx_cy_idx" of killed enemies
  lootedCacheKeys: string[];     // "cx_cy_idx" of opened caches
  riftClock: RiftClock;
  activeCorruptions: string[];   // corruption IDs active this zone run
}

// ── Deck archetypes for procedural enemies ──────────────────────────────────
export type DeckArchetype =
  | 'aggro'
  | 'control'
  | 'midrange'
  | 'swarm'
  | 'burn'
  | 'tank'
  | 'chaos';

void undefined; // keep module non-empty for tree-shaking
