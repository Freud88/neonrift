import { TILE } from '@/data/maps';
import { BIOME_PALETTES } from '@/data/biomes';
import { seededRandom, seededInt } from '@/utils/seededRandom';
import type { ZoneConfig, BiomeId } from '@/types/zone';

export const CHUNK_SIZE = 16; // tiles per chunk side

export interface ChunkEnemy {
  localTx: number; // tile coords within chunk
  localTy: number;
  profileSeed: string;
}

export interface ChunkCache {
  localTx: number;
  localTy: number;
  cacheSeed: string;
}

export interface ChunkData {
  cx: number;
  cy: number;
  tiles: number[][]; // CHUNK_SIZE x CHUNK_SIZE
  enemies: ChunkEnemy[];
  caches: ChunkCache[];
}

// Decay stage spawn multipliers: [stable, flickering, unstable, fracturing, collapsing, void breach]
const DECAY_SPAWN_MULT = [1.0, 1.0, 1.5, 2.0, 3.0, 4.0];

// ── Biome layout parameters ──────────────────────────────────────────────────
interface LayoutParams {
  streetWidth: number;      // main street width (2-4)
  alleyChance: number;      // 0-1 probability of extra alleys
  plazaChance: number;      // 0-1 probability of a plaza at intersection
  waterChance: number;      // per-floor-tile chance of water/accent
  irregularity: number;     // 0-1 how jagged walls are
}

const BIOME_LAYOUTS: Record<BiomeId, LayoutParams> = {
  neon_streets:          { streetWidth: 3, alleyChance: 0.6, plazaChance: 0.5,  waterChance: 0.02, irregularity: 0.1 },
  industrial_wasteland:  { streetWidth: 2, alleyChance: 0.4, plazaChance: 0.25, waterChance: 0.04, irregularity: 0.35 },
  data_swamp:            { streetWidth: 2, alleyChance: 0.3, plazaChance: 0.2,  waterChance: 0.12, irregularity: 0.2 },
  chrome_forest:         { streetWidth: 2, alleyChance: 0.5, plazaChance: 0.3,  waterChance: 0.01, irregularity: 0.15 },
  void_sector:           { streetWidth: 3, alleyChance: 0.3, plazaChance: 0.15, waterChance: 0.06, irregularity: 0.4 },
  rusted_depths:         { streetWidth: 2, alleyChance: 0.7, plazaChance: 0.15, waterChance: 0.03, irregularity: 0.25 },
};

/** Generate a single 16x16 chunk at (cx, cy) for the given zone config. */
export function generateChunk(cx: number, cy: number, config: ZoneConfig, decayStage: number = 0): ChunkData {
  const seed = `${config.seed}_${cx}_${cy}`;
  const rng = seededRandom(seed);
  const palette = BIOME_PALETTES[config.biome];
  const layout = BIOME_LAYOUTS[config.biome];

  // ── 1. Start all walls ────────────────────────────────────────────────────
  const tiles: number[][] = Array.from({ length: CHUNK_SIZE }, () =>
    Array(CHUNK_SIZE).fill(TILE.WALL)
  );

  const mid = Math.floor(CHUNK_SIZE / 2);
  const sw = layout.streetWidth;

  // ── 2. Carve main streets ─────────────────────────────────────────────────
  // Horizontal main street
  const hStreetY = mid - Math.floor(sw / 2) + seededInt(-1, 1, rng);
  for (let y = hStreetY; y < Math.min(hStreetY + sw, CHUNK_SIZE); y++) {
    if (y < 0 || y >= CHUNK_SIZE) continue;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      tiles[y][x] = TILE.ROAD;
    }
  }

  // Vertical main street
  const vStreetX = mid - Math.floor(sw / 2) + seededInt(-1, 1, rng);
  for (let x = vStreetX; x < Math.min(vStreetX + sw, CHUNK_SIZE); x++) {
    if (x < 0 || x >= CHUNK_SIZE) continue;
    for (let y = 0; y < CHUNK_SIZE; y++) {
      tiles[y][x] = TILE.ROAD;
    }
  }

  // ── 3. Carve secondary street (50% chance) ───────────────────────────────
  if (rng() < 0.5) {
    const secondaryDir = rng() < 0.5 ? 'h' : 'v';
    if (secondaryDir === 'h') {
      const y2 = seededInt(2, CHUNK_SIZE - 4, rng);
      if (Math.abs(y2 - hStreetY) > 3) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          tiles[y2][x] = TILE.ROAD;
          if (y2 + 1 < CHUNK_SIZE) tiles[y2 + 1][x] = TILE.ROAD;
        }
      }
    } else {
      const x2 = seededInt(2, CHUNK_SIZE - 4, rng);
      if (Math.abs(x2 - vStreetX) > 3) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
          tiles[y][x2] = TILE.ROAD;
          if (x2 + 1 < CHUNK_SIZE) tiles[y][x2 + 1] = TILE.ROAD;
        }
      }
    }
  }

  // ── 4. Carve alleys (1-tile wide paths) ──────────────────────────────────
  const alleyCount = seededInt(1, 4, rng);
  for (let a = 0; a < alleyCount; a++) {
    if (rng() > layout.alleyChance) continue;
    const alleyDir = rng() < 0.5 ? 'h' : 'v';
    if (alleyDir === 'h') {
      const ay = seededInt(1, CHUNK_SIZE - 2, rng);
      const start = seededInt(0, 4, rng);
      const end = seededInt(CHUNK_SIZE - 5, CHUNK_SIZE - 1, rng);
      for (let x = start; x <= end; x++) {
        if (tiles[ay][x] === TILE.WALL) tiles[ay][x] = TILE.ALLEY;
      }
    } else {
      const ax = seededInt(1, CHUNK_SIZE - 2, rng);
      const start = seededInt(0, 4, rng);
      const end = seededInt(CHUNK_SIZE - 5, CHUNK_SIZE - 1, rng);
      for (let y = start; y <= end; y++) {
        if (tiles[y][ax] === TILE.WALL) tiles[y][ax] = TILE.ALLEY;
      }
    }
  }

  // ── 5. Carve plazas at intersections ─────────────────────────────────────
  if (rng() < layout.plazaChance) {
    // Find road intersection near center and make a 3x3 or 4x4 plaza
    const px = seededInt(mid - 2, mid + 2, rng);
    const py = seededInt(mid - 2, mid + 2, rng);
    const ps = seededInt(2, 4, rng);
    for (let dy = 0; dy < ps; dy++) {
      for (let dx = 0; dx < ps; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE) {
          tiles[ny][nx] = TILE.FLOOR;
        }
      }
    }
  }

  // ── 6. Add wall irregularity ──────────────────────────────────────────────
  // Randomly erode wall edges for organic feel
  if (layout.irregularity > 0) {
    for (let y = 1; y < CHUNK_SIZE - 1; y++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        if (tiles[y][x] !== TILE.WALL) continue;
        // Check if adjacent to non-wall
        let adjOpen = 0;
        if (tiles[y - 1][x] !== TILE.WALL) adjOpen++;
        if (tiles[y + 1][x] !== TILE.WALL) adjOpen++;
        if (tiles[y][x - 1] !== TILE.WALL) adjOpen++;
        if (tiles[y][x + 1] !== TILE.WALL) adjOpen++;
        if (adjOpen >= 2 && rng() < layout.irregularity) {
          tiles[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  // ── 7. Ensure 3-wide openings on all 4 borders ──────────────────────────
  for (let offset = -1; offset <= 1; offset++) {
    // Top edge
    tiles[0][mid + offset] = TILE.ROAD;
    tiles[1][mid + offset] = TILE.ROAD;
    // Bottom edge
    tiles[CHUNK_SIZE - 1][mid + offset] = TILE.ROAD;
    tiles[CHUNK_SIZE - 2][mid + offset] = TILE.ROAD;
    // Left edge
    tiles[mid + offset][0] = TILE.ROAD;
    tiles[mid + offset][1] = TILE.ROAD;
    // Right edge
    tiles[mid + offset][CHUNK_SIZE - 1] = TILE.ROAD;
    tiles[mid + offset][CHUNK_SIZE - 2] = TILE.ROAD;
  }

  // ── 8. Scatter water/accent tiles ────────────────────────────────────────
  for (let y = 1; y < CHUNK_SIZE - 1; y++) {
    for (let x = 1; x < CHUNK_SIZE - 1; x++) {
      if ((tiles[y][x] === TILE.FLOOR || tiles[y][x] === TILE.ROAD) && rng() < layout.waterChance) {
        tiles[y][x] = TILE.WATER;
      }
    }
  }

  // ── 9. Ensure connectivity ───────────────────────────────────────────────
  ensureConnectivity(tiles, mid, mid);

  // ── 10. Place enemies (0-4 per chunk, scaled by decay stage) ─────────────
  const enemies: ChunkEnemy[] = [];
  const isSpawnChunk = cx === 0 && cy === 0;
  if (!isSpawnChunk) {
    const baseMax = Math.min(4, 1 + Math.floor(config.level / 2));
    const spawnMult = DECAY_SPAWN_MULT[Math.min(decayStage, DECAY_SPAWN_MULT.length - 1)];
    const scaledMax = Math.min(8, Math.round(baseMax * spawnMult));
    const enemyCount = seededInt(0, scaledMax, rng);
    for (let i = 0; i < enemyCount; i++) {
      const ex = seededInt(3, CHUNK_SIZE - 4, rng);
      const ey = seededInt(3, CHUNK_SIZE - 4, rng);
      if (tiles[ey][ex] !== TILE.WALL && tiles[ey][ex] !== TILE.WATER) {
        enemies.push({
          localTx: ex,
          localTy: ey,
          profileSeed: `${seed}_enemy_${i}`,
        });
      }
    }
  }

  // ── 11. Place loot caches (0-1 per chunk) ────────────────────────────────
  const caches: ChunkCache[] = [];
  if (!isSpawnChunk && rng() < 0.4) {
    const cx2 = seededInt(2, CHUNK_SIZE - 3, rng);
    const cy2 = seededInt(2, CHUNK_SIZE - 3, rng);
    if (tiles[cy2][cx2] !== TILE.WALL && tiles[cy2][cx2] !== TILE.WATER) {
      caches.push({
        localTx: cx2,
        localTy: cy2,
        cacheSeed: `${seed}_cache_0`,
      });
    }
  }

  return { cx, cy, tiles, enemies, caches };
}

/** Flood fill from (sx, sy). Carve walls to connect any unreachable floor tiles. */
function ensureConnectivity(tiles: number[][], sx: number, sy: number) {
  const visited = Array.from({ length: CHUNK_SIZE }, () => Array(CHUNK_SIZE).fill(false));
  const queue: [number, number][] = [[sx, sy]];
  visited[sy][sx] = true;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= CHUNK_SIZE || ny >= CHUNK_SIZE) continue;
      if (visited[ny][nx]) continue;
      if (tiles[ny][nx] === TILE.WALL) continue;
      visited[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }

  // Find unreachable floor tiles and carve a path to (sx, sy)
  for (let y = 1; y < CHUNK_SIZE - 1; y++) {
    for (let x = 1; x < CHUNK_SIZE - 1; x++) {
      if (tiles[y][x] !== TILE.WALL && !visited[y][x]) {
        // Carve straight path toward center
        let cx = x, cy = y;
        while (!visited[cy][cx]) {
          tiles[cy][cx] = TILE.FLOOR;
          visited[cy][cx] = true;
          if (cx < sx) cx++;
          else if (cx > sx) cx--;
          else if (cy < sy) cy++;
          else if (cy > sy) cy--;
          else break;
        }
      }
    }
  }
}
