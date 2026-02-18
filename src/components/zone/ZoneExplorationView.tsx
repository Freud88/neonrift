'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useZoneExploration, type ZoneCallbacks } from '@/hooks/useZoneExploration';
import { RiftDecayEngine } from '@/engine/RiftDecayEngine';
import { rollCorruption } from '@/data/riftCorruptions';
import ZoneHUD from './ZoneHUD';
import StageTransition from './StageTransition';
import VirtualJoystick from '@/components/exploration/VirtualJoystick';
import type { ZoneConfig } from '@/types/zone';
import type { ZoneState } from '@/types/zone';

interface ZoneExplorationViewProps {
  zoneConfig: ZoneConfig;
  zoneState: ZoneState;
  onEnemyBattle: (enemyKey: string, profileSeed: string) => void;
  onCacheLoot: (cacheKey: string, cacheSeed: string) => void;
  onBossBattle: () => void;
  onExit: () => void;
  onForgeKey: () => void;
  isActive: boolean;
}

export default function ZoneExplorationView({
  zoneConfig,
  zoneState,
  onEnemyBattle,
  onCacheLoot,
  onBossBattle,
  onExit,
  onForgeKey,
  isActive,
}: ZoneExplorationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState } = useGameStore();
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });

  // ── Rift Decay Engine ────────────────────────────────────────────────────
  const [riftElapsedMs, setRiftElapsedMs] = useState(zoneState.riftClock?.elapsedMs ?? 0);
  const [riftStage, setRiftStage] = useState(zoneState.riftClock?.currentStage ?? 0);
  const [riftStageProgress, setRiftStageProgress] = useState(0);
  const [transitionStage, setTransitionStage] = useState<number | null>(null);

  const decayRef = useRef<RiftDecayEngine | null>(null);
  if (!decayRef.current) {
    decayRef.current = new RiftDecayEngine(zoneConfig.level, (newStage) => {
      setRiftStage(newStage);
      // Show stage transition overlay
      setTransitionStage(newStage);
      setTimeout(() => setTransitionStage(null), 2000);
      // Roll a new corruption at stage 2+
      useGameStore.setState((s) => {
        if (!s.activeZone) return s;
        const existing = s.activeZone.activeCorruptions ?? [];
        let newCorruptions = existing;
        if (newStage >= 2) {
          const corruption = rollCorruption(newStage, existing);
          if (corruption) {
            newCorruptions = [...existing, corruption.id];
          }
        }
        return {
          activeZone: {
            ...s.activeZone,
            riftClock: { elapsedMs: decayRef.current!.getElapsedMs(), currentStage: newStage },
            activeCorruptions: newCorruptions,
          },
        };
      });
    });
    // Restore from saved state
    if (zoneState.riftClock?.elapsedMs > 0) {
      decayRef.current.restore(zoneState.riftClock.elapsedMs, zoneState.riftClock.currentStage);
    }
  }

  // Tick the decay engine each frame
  useEffect(() => {
    if (!isActive) return;
    let lastTime = performance.now();
    let lastSave = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (decayRef.current && delta > 0 && delta < 1000) {
        decayRef.current.tick(delta);
        setRiftElapsedMs(decayRef.current.getElapsedMs());
        setRiftStageProgress(decayRef.current.getStageProgress());
        // Persist rift clock to store every 2 seconds so it survives unmount
        if (now - lastSave > 2000) {
          lastSave = now;
          useGameStore.setState((s) => {
            if (!s.activeZone) return s;
            return {
              activeZone: {
                ...s.activeZone,
                riftClock: {
                  elapsedMs: decayRef.current!.getElapsedMs(),
                  currentStage: decayRef.current!.getCurrentStage(),
                },
              },
            };
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Save rift clock on cleanup (battle transition, exit, etc.)
      if (decayRef.current) {
        useGameStore.setState((s) => {
          if (!s.activeZone) return s;
          return {
            activeZone: {
              ...s.activeZone,
              riftClock: {
                elapsedMs: decayRef.current!.getElapsedMs(),
                currentStage: decayRef.current!.getCurrentStage(),
              },
            },
          };
        });
      }
    };
  }, [isActive]);

  const handleEnemyContact: ZoneCallbacks['onEnemyContact'] = useCallback(
    (enemyKey, profileSeed) => {
      onEnemyBattle(enemyKey, profileSeed);
    },
    [onEnemyBattle],
  );

  const handleCacheContact: ZoneCallbacks['onCacheContact'] = useCallback(
    (cacheKey, cacheSeed) => {
      onCacheLoot(cacheKey, cacheSeed);
    },
    [onCacheLoot],
  );

  const handleBossContact: ZoneCallbacks['onBossContact'] = useCallback(() => {
    onBossBattle();
  }, [onBossBattle]);

  const { engineRef, chunkMgrRef, entitiesRef, resetContactCooldown, spawnBoss, markBossDefeated } = useZoneExploration(
    canvasRef,
    zoneConfig,
    zoneState,
    { onEnemyContact: handleEnemyContact, onCacheContact: handleCacheContact, onBossContact: handleBossContact },
    joystick,
    isActive,
  );

  // Spawn boss when key is forged
  const prevBossSpawned = useRef(false);
  useEffect(() => {
    if (zoneState.bossSpawned && !prevBossSpawned.current) {
      prevBossSpawned.current = true;
      spawnBoss();
    }
  }, [zoneState.bossSpawned, spawnBoss]);

  // Mark boss defeated visually
  useEffect(() => {
    if (zoneState.bossDefeated) {
      markBossDefeated();
    }
  }, [zoneState.bossDefeated, markBossDefeated]);

  useEffect(() => {
    if (isActive) resetContactCooldown();
  }, [isActive, resetContactCooldown]);

  // Sync decay stage to chunk manager (new chunks will use the current stage)
  useEffect(() => {
    if (chunkMgrRef.current) {
      chunkMgrRef.current.decayStage = riftStage;
    }
  }, [riftStage, chunkMgrRef]);

  const handleForgeKey = useCallback(() => {
    onForgeKey();
  }, [onForgeKey]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
      />

      <ZoneHUD
        health={gameState?.player.health ?? 20}
        maxHealth={gameState?.player.maxHealth ?? 20}
        credits={gameState?.player.credits ?? 0}
        zoneState={zoneState}
        engineRef={engineRef}
        entitiesRef={entitiesRef}
        riftElapsedMs={riftElapsedMs}
        riftStage={riftStage}
        riftStageProgress={riftStageProgress}
        onExit={onExit}
        onForgeKey={handleForgeKey}
      />

      {/* Stage transition overlay */}
      <StageTransition stage={transitionStage} />

      <div
        className="absolute bottom-5 left-5"
        style={{ zIndex: 10, touchAction: 'none' }}
      >
        <VirtualJoystick onChange={(x, y) => setJoystick({ x, y })} />
      </div>
    </div>
  );
}
