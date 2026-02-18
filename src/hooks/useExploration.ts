'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapEngine, type SpriteEntity } from '@/engine/MapEngine';
import type { MapData } from '@/data/maps';
import { ENEMIES } from '@/data/enemies';

const TILE_SIZE = 32;
const PLAYER_SPEED = 2.4;
const PLAYER_RADIUS = 10;
const ENEMY_RADIUS = 11;
const NPC_RADIUS = 10;
const DEALER_RADIUS = 14;
const BOSS_GATE_RADIUS = 18;
const TERMINAL_RADIUS = 10;

const ENEMY_WANDER_SPEED = 0.7;
const ENEMY_CHASE_SPEED = 1.4;
const ENEMY_AGGRO_RANGE = 96;   // px
const ENEMY_WANDER_AREA = 3;    // tiles
const INTERACTION_RANGE = 40;   // px from center

export interface ExplorationCallbacks {
  onEnemyContact: (enemyId: string, enemyProfileId: string) => void;
  onNPCContact: (npcId: string, dialogueId: string) => void;
  onDealerContact: () => void;
  onBossGateContact: (bossProfileId: string, requiredKills: number) => void;
  onTerminalContact: (dialogueId: string) => void;
}

export function useExploration(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mapData: MapData,
  defeatedEnemies: string[],
  callbacks: ExplorationCallbacks,
  joystick: { x: number; y: number },   // normalized -1..1 from virtual joystick
  isActive: boolean = true              // false when hidden behind battle/shop screens
) {
  const engineRef   = useRef<MapEngine | null>(null);
  const entitiesRef = useRef<SpriteEntity[]>([]);
  const keysRef     = useRef<Set<string>>(new Set());
  const rafRef      = useRef<number>(0);
  const lastInteraction = useRef<number>(0);
  const isActiveRef = useRef<boolean>(isActive);
  // Keep ref in sync with prop (readable inside RAF loop without closure issues)
  isActiveRef.current = isActive;
  // Keep callbacks ref in sync so the RAF loop always calls the latest version
  const callbacksRef = useRef<ExplorationCallbacks>(callbacks);
  callbacksRef.current = callbacks;
  // Prevent re-triggering contacts for 5 s after a battle/interaction starts
  const CONTACT_COOLDOWN = 5000;

  // ── Build initial entities from map data ──────────────────────────────────
  // Keep mapData ref in sync for RAF loop access
  const mapDataRef = useRef<MapData>(mapData);
  mapDataRef.current = mapData;

  const buildEntities = useCallback((): SpriteEntity[] => {
    const map = mapData;
    const entities: SpriteEntity[] = [];

    // Player
    entities.push({
      id: 'player',
      type: 'player',
      x: map.playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
      y: map.playerSpawn.y * TILE_SIZE + TILE_SIZE / 2,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      color: '#00f0ff',
      glowColor: '#00f0ff',
    });

    // Map objects
    for (const obj of map.objects) {
      const px = obj.tile.x * TILE_SIZE + TILE_SIZE / 2;
      const py = obj.tile.y * TILE_SIZE + TILE_SIZE / 2;

      if (obj.type === 'enemy') {
        const profile = obj.enemyProfileId ? ENEMIES[obj.enemyProfileId] : null;
        entities.push({
          id: obj.id,
          type: 'enemy',
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          radius: ENEMY_RADIUS,
          color: profile?.spriteColor ?? '#ff4444',
          glowColor: profile?.spriteColor ?? '#ff4444',
          defeated: defeatedEnemies.includes(obj.id),
          difficulty: profile?.difficulty,
          isBoss: profile?.isBoss,
          label: profile?.name,
          wanderTarget: { x: px, y: py },
          wanderTimer: Math.random() * 120,
          aggroRange: ENEMY_AGGRO_RANGE,
          chaseRange: ENEMY_AGGRO_RANGE * 1.5,
        });
      } else if (obj.type === 'npc') {
        entities.push({
          id: obj.id,
          type: 'npc',
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          radius: NPC_RADIUS,
          color: '#39ff14',
          glowColor: '#39ff14',
          label: obj.npcId ?? '',
        });
      } else if (obj.type === 'dealer') {
        entities.push({
          id: obj.id,
          type: 'dealer',
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          radius: DEALER_RADIUS,
          color: '#c850ff',
          glowColor: '#c850ff',
        });
      } else if (obj.type === 'boss_gate') {
        entities.push({
          id: obj.id,
          type: 'boss_gate',
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          radius: BOSS_GATE_RADIUS,
          color: '#ff0044',
          glowColor: '#ff0044',
          isBoss: true,
        });
      } else if (obj.type === 'terminal') {
        entities.push({
          id: obj.id,
          type: 'terminal',
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          radius: TERMINAL_RADIUS,
          color: '#ffe600',
          glowColor: '#ffe600',
          label: obj.label,
        });
      }
    }

    return entities;
  }, [mapData, defeatedEnemies]);

  // ── Input ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const onKeyUp   = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = canvas.clientWidth  || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const engine = new MapEngine(canvas, mapData);
    engineRef.current = engine;
    entitiesRef.current = buildEntities();

    const loop = () => {
      const entities = entitiesRef.current;
      const player = entities.find((e) => e.id === 'player')!;

      // ── Player movement ──────────────────────────────────────────────────
      const keys = keysRef.current;
      let dx = joystick.x;
      let dy = joystick.y;

      if (keys.has('arrowleft')  || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup')    || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown')  || keys.has('s')) dy += 1;

      // Normalize diagonal
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }

      const nx = player.x + dx * PLAYER_SPEED;
      const ny = player.y + dy * PLAYER_SPEED;

      if (!engine.circleCollidesWithWalls(nx, player.y, player.radius)) {
        player.x = nx;
      }
      if (!engine.circleCollidesWithWalls(player.x, ny, player.radius)) {
        player.y = ny;
      }

      // Update velocity + facing for sprite animation
      player.vx = dx;
      player.vy = dy;
      if (dx < -0.1) player.facing = 'left';
      else if (dx > 0.1) player.facing = 'right';

      // ── Enemy AI ─────────────────────────────────────────────────────────
      for (const e of entities) {
        if (e.type !== 'enemy' || e.defeated) continue;

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        const aggro = distToPlayer < (e.aggroRange ?? ENEMY_AGGRO_RANGE);

        if (aggro) {
          // Chase player
          const edx = player.x - e.x;
          const edy = player.y - e.y;
          const d = Math.hypot(edx, edy);
          if (d > 2) {
            const enx = e.x + (edx / d) * ENEMY_CHASE_SPEED;
            const eny = e.y + (edy / d) * ENEMY_CHASE_SPEED;
            if (!engine.circleCollidesWithWalls(enx, e.y, e.radius)) e.x = enx;
            if (!engine.circleCollidesWithWalls(e.x, eny, e.radius)) e.y = eny;
          }
        } else {
          // Wander
          e.wanderTimer = (e.wanderTimer ?? 0) - 1;
          if ((e.wanderTimer ?? 0) <= 0 || !e.wanderTarget) {
            // Pick new wander target near spawn
            const mapObj = mapDataRef.current.objects.find((o) => o.id === e.id);
            if (mapObj) {
              const spawnPx = mapObj.tile.x * TILE_SIZE + TILE_SIZE / 2;
              const spawnPy = mapObj.tile.y * TILE_SIZE + TILE_SIZE / 2;
              const range = ENEMY_WANDER_AREA * TILE_SIZE;
              const wtx = spawnPx + (Math.random() * 2 - 1) * range;
              const wty = spawnPy + (Math.random() * 2 - 1) * range;
              e.wanderTarget = { x: wtx, y: wty };
            }
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

      // ── Collision detection (skip when screen is not active) ─────────────
      if (!isActiveRef.current) {
        engine.updateCamera(player.x, player.y);
        engine.render(entities);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = Date.now();

      for (const e of entities) {
        if (e.defeated) continue;
        const dist = Math.hypot(player.x - e.x, player.y - e.y);

        if (e.type === 'enemy') {
          const contactRange = player.radius + e.radius;
          if (dist < contactRange && now - lastInteraction.current > CONTACT_COOLDOWN) {
            lastInteraction.current = now;
            const mapObj = mapDataRef.current.objects.find((o) => o.id === e.id);
            if (mapObj?.enemyProfileId) {
              callbacksRef.current.onEnemyContact(e.id, mapObj.enemyProfileId);
            }
          }
        } else if (e.type === 'npc' && dist < INTERACTION_RANGE) {
          if (now - lastInteraction.current > CONTACT_COOLDOWN) {
            lastInteraction.current = now;
            const mapObj = mapDataRef.current.objects.find((o) => o.id === e.id);
            if (mapObj?.npcId && mapObj.dialogueId) {
              callbacksRef.current.onNPCContact(mapObj.npcId, mapObj.dialogueId);
            }
          }
        } else if (e.type === 'dealer' && dist < INTERACTION_RANGE) {
          if (now - lastInteraction.current > CONTACT_COOLDOWN) {
            lastInteraction.current = now;
            callbacksRef.current.onDealerContact();
          }
        } else if (e.type === 'boss_gate' && dist < INTERACTION_RANGE) {
          if (now - lastInteraction.current > CONTACT_COOLDOWN) {
            lastInteraction.current = now;
            const mapObj = mapDataRef.current.objects.find((o) => o.id === e.id);
            callbacksRef.current.onBossGateContact(
              mapObj?.enemyProfileId ?? 'madame_flux',
              mapObj?.requiredKills ?? 3
            );
          }
        } else if (e.type === 'terminal' && dist < INTERACTION_RANGE) {
          if (now - lastInteraction.current > CONTACT_COOLDOWN) {
            lastInteraction.current = now;
            const mapObj = mapDataRef.current.objects.find((o) => o.id === e.id);
            if (mapObj?.dialogueId) {
              callbacksRef.current.onTerminalContact(mapObj.dialogueId);
            }
          }
        }
      }

      // ── Camera & render ──────────────────────────────────────────────────
      engine.updateCamera(player.x, player.y);
      engine.render(entities);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, mapData, buildEntities]);

  // Expose method to mark enemy as defeated on the canvas
  const markEnemyDefeated = useCallback((enemyId: string) => {
    const e = entitiesRef.current.find((en) => en.id === enemyId);
    if (e) e.defeated = true;
  }, []);

  // Reset contact cooldown (call after returning from battle/shop)
  // Sets a short grace period (1.5s) so the player can walk away before interactions re-trigger
  const resetContactCooldown = useCallback(() => {
    lastInteraction.current = Date.now() - CONTACT_COOLDOWN + 1500;
  }, []);

  // Teleport player back to spawn point (after a loss)
  const teleportToSpawn = useCallback(() => {
    const player = entitiesRef.current.find((e) => e.id === 'player');
    if (player) {
      const spawn = mapDataRef.current.playerSpawn;
      player.x = spawn.x * TILE_SIZE + TILE_SIZE / 2;
      player.y = spawn.y * TILE_SIZE + TILE_SIZE / 2;
    }
    lastInteraction.current = 0;
  }, []);

  return { engineRef, entitiesRef, markEnemyDefeated, resetContactCooldown, teleportToSpawn };
}
