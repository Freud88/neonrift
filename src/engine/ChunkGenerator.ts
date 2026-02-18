import { TILE } from '@/data/maps';
import { BIOME_PALETTES } from '@/data/biomes';
import { seededRandom, seededInt } from '@/utils/seededRandom';
import type { ZoneConfig } from '@/types/zone';

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

/** Generate a single 16x16 chunk at (cx, cy) for the given zone config. */
export function generateChunk(cx: number, cy: number, config: ZoneConfig, decayStage: number = 0): ChunkData {
  const seed = `${config.seed}_${cx}_${cy}`;
  const rng = seededRandom(seed);
  const palette = BIOME_PALETTES[config.biome];

  // 1. Fill with floor
  const tiles: number[][] = Array.from({ length: CHUNK_SIZE }, () =>
    Array(CHUNK_SIZE).fill(TILE.FLOOR)
  );

  // 2. Scatter walls based on biome density
  for (let y = 0; y < CHUNK_SIZE; y++) {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      if (rng() < palette.wallDensity * 0.6) {
        tiles[y][x] = TILE.WALL;
      }
    }
  }

  // 3. Cellular automata smoothing (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const copy = tiles.map((r) => [...r]);
    for (let y = 1; y < CHUNK_SIZE - 1; y++) {
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (copy[y + dy][x + dx] === TILE.WALL) walls++;
          }
        }
        tiles[y][x] = walls >= 5 ? TILE.WALL : TILE.FLOOR;
      }
    }
  }

  // 4. Ensure 3-wide openings on all 4 borders (for seamless chunk transitions)
  const mid = Math.floor(CHUNK_SIZE / 2);
  for (let offset = -1; offset <= 1; offset++) {
    // Top edge
    tiles[0][mid + offset] = TILE.FLOOR;
    tiles[1][mid + offset] = TILE.FLOOR;
    // Bottom edge
    tiles[CHUNK_SIZE - 1][mid + offset] = TILE.FLOOR;
    tiles[CHUNK_SIZE - 2][mid + offset] = TILE.FLOOR;
    // Left edge
    tiles[mid + offset][0] = TILE.FLOOR;
    tiles[mid + offset][1] = TILE.FLOOR;
    // Right edge
    tiles[mid + offset][CHUNK_SIZE - 1] = TILE.FLOOR;
    tiles[mid + offset][CHUNK_SIZE - 2] = TILE.FLOOR;
  }

  // 5. Road strip through the center (horizontal or vertical based on chunk position)
  const roadDir = (cx + cy) % 2 === 0 ? 'horizontal' : 'vertical';
  if (roadDir === 'horizontal') {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      tiles[mid][x] = TILE.ROAD;
      tiles[mid - 1][x] = TILE.FLOOR;
      tiles[mid + 1][x] = TILE.FLOOR;
    }
  } else {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      tiles[y][mid] = TILE.ROAD;
      tiles[y][mid - 1] = TILE.FLOOR;
      tiles[y][mid + 1] = TILE.FLOOR;
    }
  }

  // 6. Scatter some water/accent tiles
  for (let y = 2; y < CHUNK_SIZE - 2; y++) {
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      if (tiles[y][x] === TILE.FLOOR && rng() < 0.03) {
        tiles[y][x] = TILE.WATER;
      }
    }
  }

  // 7. Ensure connectivity — flood fill from center, carve paths to any isolated floor
  ensureConnectivity(tiles, mid, mid);

  // 8. Place enemies (0-4 per chunk, scaled by decay stage, not in spawn chunk 0,0)
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
      if (tiles[ey][ex] === TILE.FLOOR || tiles[ey][ex] === TILE.ROAD) {
        enemies.push({
          localTx: ex,
          localTy: ey,
          profileSeed: `${seed}_enemy_${i}`,
        });
      }
    }
  }

  // 9. Place loot caches (0-1 per chunk)
  const caches: ChunkCache[] = [];
  if (!isSpawnChunk && rng() < 0.4) {
    const cx2 = seededInt(2, CHUNK_SIZE - 3, rng);
    const cy2 = seededInt(2, CHUNK_SIZE - 3, rng);
    if (tiles[cy2][cx2] === TILE.FLOOR) {
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
