import { TILE, type MapData } from '@/data/maps';
import { generateChunk, CHUNK_SIZE, type ChunkData } from './ChunkGenerator';
import type { SpriteEntity } from './MapEngine';
import type { ZoneConfig } from '@/types/zone';
import type { ZoneState } from '@/types/zone';

const TILE_SIZE = 32;
const VIEW_RADIUS = 1; // 3x3 chunk grid (center ± 1)
const COMPOSITE_CHUNKS = 2 * VIEW_RADIUS + 1; // 3
const COMPOSITE_SIZE = COMPOSITE_CHUNKS * CHUNK_SIZE; // 48

const ENEMY_RADIUS = 11;
const CACHE_RADIUS = 10;

export class ChunkManager {
  private cache = new Map<string, ChunkData>();
  private config: ZoneConfig;
  private lastCenterCX = Infinity;
  private lastCenterCY = Infinity;
  decayStage = 0;

  constructor(config: ZoneConfig) {
    this.config = config;
  }

  private key(cx: number, cy: number): string {
    return `${cx}_${cy}`;
  }

  /** Get or generate a chunk at (cx, cy). */
  getChunk(cx: number, cy: number): ChunkData {
    const k = this.key(cx, cy);
    let chunk = this.cache.get(k);
    if (!chunk) {
      chunk = generateChunk(cx, cy, this.config, this.decayStage);
      this.cache.set(k, chunk);
    }
    return chunk;
  }

  /** Convert world pixel position to chunk coordinate. */
  playerToChunk(worldPx: number, worldPy: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(worldPx / (CHUNK_SIZE * TILE_SIZE)),
      cy: Math.floor(worldPy / (CHUNK_SIZE * TILE_SIZE)),
    };
  }

  /** Has the player moved to a different center chunk? */
  hasCenterChanged(cx: number, cy: number): boolean {
    return cx !== this.lastCenterCX || cy !== this.lastCenterCY;
  }

  /**
   * Build a composite MapData (48x48 tiles) from the 3x3 chunks surrounding (centerCX, centerCY).
   * Returns the MapData and the pixel offset for rebasing the player position.
   */
  buildCompositeMap(centerCX: number, centerCY: number): {
    mapData: MapData;
    originPx: number; // world pixel X of tile (0,0) in the composite
    originPy: number;
  } {
    this.lastCenterCX = centerCX;
    this.lastCenterCY = centerCY;

    const tiles: number[][] = Array.from({ length: COMPOSITE_SIZE }, () =>
      Array(COMPOSITE_SIZE).fill(TILE.FLOOR)
    );

    for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
        const chunk = this.getChunk(centerCX + dx, centerCY + dy);
        const baseX = (dx + VIEW_RADIUS) * CHUNK_SIZE;
        const baseY = (dy + VIEW_RADIUS) * CHUNK_SIZE;
        for (let y = 0; y < CHUNK_SIZE; y++) {
          for (let x = 0; x < CHUNK_SIZE; x++) {
            tiles[baseY + y][baseX + x] = chunk.tiles[y][x];
          }
        }
      }
    }

    const originCX = centerCX - VIEW_RADIUS;
    const originCY = centerCY - VIEW_RADIUS;

    const mapData: MapData = {
      id: `zone_composite_${centerCX}_${centerCY}`,
      name: `Zone L${this.config.level}`,
      width: COMPOSITE_SIZE,
      height: COMPOSITE_SIZE,
      tileSize: TILE_SIZE,
      tiles,
      playerSpawn: { x: COMPOSITE_SIZE / 2, y: COMPOSITE_SIZE / 2 },
      objects: [],
    };

    return {
      mapData,
      originPx: originCX * CHUNK_SIZE * TILE_SIZE,
      originPy: originCY * CHUNK_SIZE * TILE_SIZE,
    };
  }

  /**
   * Build SpriteEntity[] for enemies and caches in the current 3x3 window.
   * Filters out defeated enemies and looted caches using zoneState.
   */
  buildEntities(
    centerCX: number,
    centerCY: number,
    zoneState: ZoneState,
    originPx: number,
    originPy: number,
  ): SpriteEntity[] {
    const entities: SpriteEntity[] = [];

    for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
        const ccx = centerCX + dx;
        const ccy = centerCY + dy;
        const chunk = this.getChunk(ccx, ccy);

        // Enemies
        for (let i = 0; i < chunk.enemies.length; i++) {
          const e = chunk.enemies[i];
          const key = `${ccx}_${ccy}_${i}`;
          const defeated = zoneState.defeatedEnemyKeys.includes(key);

          // World pixel position
          const worldPx = (ccx * CHUNK_SIZE + e.localTx) * TILE_SIZE + TILE_SIZE / 2;
          const worldPy = (ccy * CHUNK_SIZE + e.localTy) * TILE_SIZE + TILE_SIZE / 2;
          // Rebase to composite local coords
          const localPx = worldPx - originPx;
          const localPy = worldPy - originPy;

          entities.push({
            id: `zone_enemy_${key}`,
            type: 'enemy',
            x: localPx,
            y: localPy,
            vx: 0,
            vy: 0,
            radius: ENEMY_RADIUS,
            color: '#ff4444',
            glowColor: '#ff4444',
            defeated,
            label: defeated ? undefined : 'HOSTILE',
            wanderTarget: { x: localPx, y: localPy },
            wanderTimer: 60 + Math.random() * 120,
            aggroRange: 96,
            chaseRange: 144,
          });
        }

        // Caches
        for (let i = 0; i < chunk.caches.length; i++) {
          const c = chunk.caches[i];
          const key = `${ccx}_${ccy}_cache_${i}`;
          const looted = zoneState.lootedCacheKeys.includes(key);

          const worldPx = (ccx * CHUNK_SIZE + c.localTx) * TILE_SIZE + TILE_SIZE / 2;
          const worldPy = (ccy * CHUNK_SIZE + c.localTy) * TILE_SIZE + TILE_SIZE / 2;
          const localPx = worldPx - originPx;
          const localPy = worldPy - originPy;

          entities.push({
            id: `zone_cache_${key}`,
            type: 'terminal',
            x: localPx,
            y: localPy,
            vx: 0,
            vy: 0,
            radius: CACHE_RADIUS,
            color: '#ffe600',
            glowColor: '#ffe600',
            defeated: looted,
            label: looted ? undefined : 'CACHE',
          });
        }
      }
    }

    return entities;
  }

  /** Remove chunks that are too far from the current center to save memory. */
  pruneDistantChunks(centerCX: number, centerCY: number, radius = 3) {
    for (const [k, chunk] of this.cache) {
      if (
        Math.abs(chunk.cx - centerCX) > radius ||
        Math.abs(chunk.cy - centerCY) > radius
      ) {
        this.cache.delete(k);
      }
    }
  }
}
