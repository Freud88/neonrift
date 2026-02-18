'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useZoneExploration, type ZoneCallbacks } from '@/hooks/useZoneExploration';
import ZoneHUD from './ZoneHUD';
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

  const { engineRef, entitiesRef, resetContactCooldown, spawnBoss, markBossDefeated } = useZoneExploration(
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
        onExit={onExit}
        onForgeKey={handleForgeKey}
      />

      <div
        className="absolute bottom-5 left-5"
        style={{ zIndex: 10, touchAction: 'none' }}
      >
        <VirtualJoystick onChange={(x, y) => setJoystick({ x, y })} />
      </div>
    </div>
  );
}
