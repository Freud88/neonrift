'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapEngine, type SpriteEntity } from '@/engine/MapEngine';
import { ChunkManager } from '@/engine/ChunkManager';
import { CHUNK_SIZE } from '@/engine/ChunkGenerator';
import type { ZoneConfig } from '@/types/zone';
import type { ZoneState } from '@/types/zone';

const TILE_SIZE = 32;
const PLAYER_SPEED = 2.4;
const PLAYER_RADIUS = 10;
const ENEMY_RADIUS = 11;
const ENEMY_WANDER_SPEED = 0.7;
const ENEMY_CHASE_SPEED = 1.4;
const ENEMY_AGGRO_RANGE = 96;
const ENEMY_WANDER_AREA = 3;
const INTERACTION_RANGE = 40;
const CONTACT_COOLDOWN = 5000;

export interface ZoneCallbacks {
  onEnemyContact: (enemyKey: string, profileSeed: string) => void;
  onCacheContact: (cacheKey: string, cacheSeed: string) => void;
}

export function useZoneExploration(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  zoneConfig: ZoneConfig,
  zoneState: ZoneState,
  callbacks: ZoneCallbacks,
  joystick: { x: number; y: number },
  isActive: boolean = true,
) {
  const engineRef = useRef<MapEngine | null>(null);
  const chunkMgrRef = useRef<ChunkManager | null>(null);
  const entitiesRef = useRef<SpriteEntity[]>([]);
  const playerRef = useRef<SpriteEntity | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const lastInteraction = useRef<number>(0);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const zoneStateRef = useRef(zoneState);
  zoneStateRef.current = zoneState;

  // World position of (0,0) in the current composite map
  const originRef = useRef({ px: 0, py: 0 });
  // Player world position (persists across chunk rebases)
  const worldPosRef = useRef({ x: 0, y: 0 });

  // ── Input ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Rebuild composite map + entities ─────────────────────────────────────
  const rebuildComposite = useCallback((mgr: ChunkManager, engine: MapEngine, cx: number, cy: number) => {
    const { mapData, originPx, originPy } = mgr.buildCompositeMap(cx, cy);
    engine.setMapData(mapData);
    originRef.current = { px: originPx, py: originPy };

    // Build zone entities (enemies + caches)
    const zoneEntities = mgr.buildEntities(cx, cy, zoneStateRef.current, originPx, originPy);

    // Player entity (rebase world pos to local)
    const localPx = worldPosRef.current.x - originPx;
    const localPy = worldPosRef.current.y - originPy;

    const player: SpriteEntity = playerRef.current ?? {
      id: 'player',
      type: 'player',
      x: localPx,
      y: localPy,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      color: '#00f0ff',
      glowColor: '#00f0ff',
    };
    player.x = localPx;
    player.y = localPy;
    playerRef.current = player;

    entitiesRef.current = [player, ...zoneEntities];

    mgr.pruneDistantChunks(cx, cy, 3);
  }, []);

  // ── Main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize chunk manager and composite map
    const mgr = new ChunkManager(zoneConfig);
    chunkMgrRef.current = mgr;

    // Player spawns at world (0,0) center → chunk (0,0) center tile
    const spawnWorldX = (CHUNK_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
    const spawnWorldY = (CHUNK_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
    worldPosRef.current = { x: spawnWorldX, y: spawnWorldY };

    const { mapData, originPx, originPy } = mgr.buildCompositeMap(0, 0);
    originRef.current = { px: originPx, py: originPy };

    const engine = new MapEngine(canvas, mapData);
    engineRef.current = engine;

    // Build initial entities
    const localPx = spawnWorldX - originPx;
    const localPy = spawnWorldY - originPy;
    const player: SpriteEntity = {
      id: 'player',
      type: 'player',
      x: localPx,
      y: localPy,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      color: '#00f0ff',
      glowColor: '#00f0ff',
    };
    playerRef.current = player;

    const zoneEntities = mgr.buildEntities(0, 0, zoneStateRef.current, originPx, originPy);
    entitiesRef.current = [player, ...zoneEntities];

    const loop = () => {
      const entities = entitiesRef.current;
      const pl = playerRef.current!;

      // ── Player movement ──────────────────────────────────────────────
      const keys = keysRef.current;
      let dx = joystick.x;
      let dy = joystick.y;
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup') || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) dy += 1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }

      const nx = pl.x + dx * PLAYER_SPEED;
      const ny = pl.y + dy * PLAYER_SPEED;

      if (!engine.circleCollidesWithWalls(nx, pl.y, pl.radius)) pl.x = nx;
      if (!engine.circleCollidesWithWalls(pl.x, ny, pl.radius)) pl.y = ny;

      pl.vx = dx;
      pl.vy = dy;
      if (dx < -0.1) pl.facing = 'left';
      else if (dx > 0.1) pl.facing = 'right';

      // Update world position
      worldPosRef.current.x = pl.x + originRef.current.px;
      worldPosRef.current.y = pl.y + originRef.current.py;

      // ── Check chunk transition ────────────────────────────────────────
      const { cx: newCX, cy: newCY } = mgr.playerToChunk(
        worldPosRef.current.x,
        worldPosRef.current.y,
      );
      if (mgr.hasCenterChanged(newCX, newCY)) {
        rebuildComposite(mgr, engine, newCX, newCY);
      }

      // ── Enemy AI ──────────────────────────────────────────────────────
      for (const e of entities) {
        if (e.type !== 'enemy' || e.defeated) continue;
        const distToPlayer = Math.hypot(pl.x - e.x, pl.y - e.y);
        const aggro = distToPlayer < (e.aggroRange ?? ENEMY_AGGRO_RANGE);

        if (aggro) {
          const edx = pl.x - e.x;
          const edy = pl.y - e.y;
          const d = Math.hypot(edx, edy);
          if (d > 2) {
            const enx = e.x + (edx / d) * ENEMY_CHASE_SPEED;
            const eny = e.y + (edy / d) * ENEMY_CHASE_SPEED;
            if (!engine.circleCollidesWithWalls(enx, e.y, e.radius)) e.x = enx;
            if (!engine.circleCollidesWithWalls(e.x, eny, e.radius)) e.y = eny;
          }
        } else {
          e.wanderTimer = (e.wanderTimer ?? 0) - 1;
          if ((e.wanderTimer ?? 0) <= 0 || !e.wanderTarget) {
            const range = ENEMY_WANDER_AREA * TILE_SIZE;
            e.wanderTarget = {
              x: e.x + (Math.random() * 2 - 1) * range,
              y: e.y + (Math.random() * 2 - 1) * range,
            };
            e.wanderTimer = 80 + Math.random() * 120;
          }
          if (e.wanderTarget) {
            const edx = e.wanderTarget.x - e.x;
            const edy = e.wanderTarget.y - e.y;
            const d = Math.hypot(edx, edy);
            if (d > 4) {
              const enx = e.x + (edx / d) * ENEMY_WANDER_SPEED;
              const eny = e.y + (edy / d) * ENEMY_WANDER_SPEED;
              if (!engine.circleCollidesWithWalls(enx, e.y, e.radius)) e.x = enx;
              if (!engine.circleCollidesWithWalls(e.x, eny, e.radius)) e.y = eny;
            }
          }
        }
      }

      // ── Collision detection ───────────────────────────────────────────
      if (isActiveRef.current) {
        const now = Date.now();
        for (const e of entities) {
          if (e.defeated || e.id === 'player') continue;
          const dist = Math.hypot(pl.x - e.x, pl.y - e.y);

          if (e.type === 'enemy') {
            const contactRange = pl.radius + e.radius;
            if (dist < contactRange && now - lastInteraction.current > CONTACT_COOLDOWN) {
              lastInteraction.current = now;
              // Extract key and seed from entity id
              const key = e.id.replace('zone_enemy_', '');
              // Find the chunk and enemy data to get profileSeed
              const parts = key.split('_');
              if (parts.length >= 3) {
                const ecx = parseInt(parts[0]);
                const ecy = parseInt(parts[1]);
                const idx = parseInt(parts[2]);
                const chunk = mgr.getChunk(ecx, ecy);
                if (chunk.enemies[idx]) {
                  callbacksRef.current.onEnemyContact(key, chunk.enemies[idx].profileSeed);
                }
              }
            }
          } else if (e.type === 'terminal' && dist < INTERACTION_RANGE) {
            if (now - lastInteraction.current > CONTACT_COOLDOWN) {
              lastInteraction.current = now;
              const key = e.id.replace('zone_cache_', '');
              const parts = key.split('_');
              if (parts.length >= 4) {
                const ecx = parseInt(parts[0]);
                const ecy = parseInt(parts[1]);
                const idx = parseInt(parts[3]);
                const chunk = mgr.getChunk(ecx, ecy);
                if (chunk.caches[idx]) {
                  callbacksRef.current.onCacheContact(key, chunk.caches[idx].cacheSeed);
                }
              }
            }
          }
        }
      }

      // ── Camera & render ───────────────────────────────────────────────
      engine.updateCamera(pl.x, pl.y);
      engine.render(entities);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, zoneConfig]);

  const markEnemyDefeated = useCallback((enemyKey: string) => {
    const e = entitiesRef.current.find((en) => en.id === `zone_enemy_${enemyKey}`);
    if (e) e.defeated = true;
  }, []);

  const markCacheLooted = useCallback((cacheKey: string) => {
    const e = entitiesRef.current.find((en) => en.id === `zone_cache_${cacheKey}`);
    if (e) e.defeated = true;
  }, []);

  const resetContactCooldown = useCallback(() => {
    lastInteraction.current = Date.now() - CONTACT_COOLDOWN + 1500;
  }, []);

  return { engineRef, entitiesRef, markEnemyDefeated, markCacheLooted, resetContactCooldown };
}
