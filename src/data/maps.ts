import type { Position } from '@/types/game';

// Tile type constants
export const TILE = {
  FLOOR: 0,
  WALL: 1,
  WATER: 2,
  ROAD: 3,
  ALLEY: 4,
} as const;

export type TileType = (typeof TILE)[keyof typeof TILE];

// Map object type constants
export type MapObjType = 'enemy' | 'npc' | 'dealer' | 'boss_gate' | 'terminal';

export interface MapObject {
  id: string;
  type: MapObjType;
  tile: Position;           // tile coords
  enemyProfileId?: string;  // for enemies
  npcId?: string;           // for NPCs
  dialogueId?: string;      // for terminals / NPCs
  requiredKills?: number;   // for boss gate
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];        // 2D grid of TileType
  playerSpawn: Position;
  objects: MapObject[];
}

// ─── Neon Row (40 × 30) ───────────────────────────────────────────────────────
// Legend:
//   1 = WALL  0 = FLOOR  3 = ROAD  4 = ALLEY  2 = WATER
//
// Layout (condensed): outer ring of walls, central road N→S,
// side alleys, plaza area, boss gate at south.

const W = TILE.WALL;
const F = TILE.FLOOR;
const R = TILE.ROAD;
const A = TILE.ALLEY;
const T = TILE.WATER; // toxic puddle decoration

// prettier-ignore
const NEON_ROW_TILES: number[][] = [
//0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
 [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 0
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, R, R, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 1
 [W, F, W, W, F, F, W, W, F, F, F, F, W, W, F, F, F, F, R, F, F, R, F, F, F, F, W, W, F, F, F, F, W, W, F, F, F, F, F, W], // 2
 [W, F, W, W, F, F, W, W, F, F, F, F, W, W, F, F, F, F, R, F, F, R, F, F, F, F, W, W, F, F, F, F, W, W, F, F, F, F, F, W], // 3
 [W, F, F, F, F, F, F, F, F, F, A, A, A, F, F, F, F, F, R, F, F, R, F, F, F, A, A, A, F, F, F, F, F, F, F, F, F, F, F, W], // 4
 [W, F, F, F, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 5
 [W, F, W, W, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, W, W, F, F, F, F, F, W], // 6
 [W, F, W, W, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, W, W, F, F, F, F, F, W], // 7
 [W, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, W], // 8  main road
 [W, F, F, F, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 9
 [W, F, W, W, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, W, W, F, F, F, F, F, W], // 10
 [W, F, W, W, F, F, F, F, F, F, A, A, A, F, F, F, F, F, R, F, F, R, F, F, F, A, A, A, F, F, F, F, W, W, F, F, F, F, F, W], // 11
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 12
 [W, F, F, F, F, F, W, W, F, F, F, F, F, F, W, W, F, F, R, F, F, R, F, F, W, W, F, F, F, F, W, W, F, F, F, F, F, F, F, W], // 13
 [W, F, F, F, F, F, W, W, F, F, F, F, F, F, W, W, F, F, R, F, F, R, F, F, W, W, F, F, F, F, W, W, F, F, F, F, F, F, F, W], // 14
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, T, T, F, F, W], // 15
 [W, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, W], // 16  cross road
 [W, F, F, F, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 17
 [W, F, W, W, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, W, W, F, F, F, F, F, W], // 18
 [W, F, W, W, F, F, F, F, F, F, A, A, A, F, F, F, F, F, R, F, F, R, F, F, F, A, A, A, F, F, F, F, W, W, F, F, F, F, F, W], // 19
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 20
 [W, F, F, F, F, F, W, W, F, F, F, F, F, F, W, W, F, F, R, F, F, R, F, F, W, W, F, F, F, F, W, W, F, F, T, T, F, F, F, W], // 21
 [W, F, F, F, F, F, W, W, F, F, F, F, F, F, W, W, F, F, R, F, F, R, F, F, W, W, F, F, F, F, W, W, F, F, F, F, F, F, F, W], // 22
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 23
 [W, F, F, F, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 24
 [W, F, W, W, F, F, F, F, F, F, A, F, F, F, F, F, F, F, R, F, F, R, F, F, F, A, F, F, F, F, F, F, W, W, F, F, F, F, F, W], // 25
 [W, F, W, W, F, F, F, F, F, F, A, A, A, F, F, F, F, F, R, F, F, R, F, F, F, A, A, A, F, F, F, F, W, W, F, F, F, F, F, W], // 26
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 27
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, R, R, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 28
 [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 29
];

export const NEON_ROW_MAP: MapData = {
  id: 'neon_row',
  name: 'Neon Row',
  width: 40,
  height: 30,
  tileSize: 32,
  tiles: NEON_ROW_TILES,
  playerSpawn: { x: 19, y: 2 },  // top of main road
  objects: [
    // ── Enemies (5) ──────────────────────────────────────────────────────
    { id: 'e1', type: 'enemy', tile: { x: 5,  y: 5  }, enemyProfileId: 'script_kiddie' },
    { id: 'e2', type: 'enemy', tile: { x: 34, y: 5  }, enemyProfileId: 'neon_thug' },
    { id: 'e3', type: 'enemy', tile: { x: 5,  y: 20 }, enemyProfileId: 'data_pirate' },
    { id: 'e4', type: 'enemy', tile: { x: 34, y: 20 }, enemyProfileId: 'chrome_enforcer' },
    { id: 'e5', type: 'enemy', tile: { x: 11, y: 13 }, enemyProfileId: 'rogue_drone' },
    // ── Boss gate (south, on main road) ──────────────────────────────────
    { id: 'boss_gate', type: 'boss_gate', tile: { x: 19, y: 28 }, enemyProfileId: 'madame_flux', requiredKills: 3 },
    // ── NPC (2) ───────────────────────────────────────────────────────────
    { id: 'npc1', type: 'npc', tile: { x: 8,  y: 12 }, npcId: 'zero', dialogueId: 'zero_intro' },
    { id: 'npc2', type: 'npc', tile: { x: 30, y: 12 }, npcId: 'raya', dialogueId: 'raya_intro' },
    // ── Dealer ────────────────────────────────────────────────────────────
    { id: 'dealer1', type: 'dealer', tile: { x: 8, y: 16 } },
    // ── Terminals (lore) ─────────────────────────────────────────────────
    { id: 'term1', type: 'terminal', tile: { x: 11, y: 5  }, dialogueId: 'lore_grid_origin' },
    { id: 'term2', type: 'terminal', tile: { x: 28, y: 24 }, dialogueId: 'lore_madame_flux' },
  ],
};

export const MAPS: Record<string, MapData> = {
  neon_row: NEON_ROW_MAP,
};
