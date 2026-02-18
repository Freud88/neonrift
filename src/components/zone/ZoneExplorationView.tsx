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
  onExit: () => void;
  onForgeKey: () => void;
  isActive: boolean;
}

export default function ZoneExplorationView({
  zoneConfig,
  zoneState,
  onEnemyBattle,
  onCacheLoot,
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

  const { engineRef, entitiesRef, resetContactCooldown } = useZoneExploration(
    canvasRef,
    zoneConfig,
    zoneState,
    { onEnemyContact: handleEnemyContact, onCacheContact: handleCacheContact },
    joystick,
    isActive,
  );

  useEffect(() => {
    if (isActive) resetContactCooldown();
  }, [isActive, resetContactCooldown]);

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
        onForgeKey={onForgeKey}
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
