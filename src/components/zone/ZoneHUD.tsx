'use client';

import { useRef, useEffect } from 'react';
import NeonButton from '@/components/ui/NeonButton';
import type { ZoneState } from '@/types/zone';
import type { MapEngine, SpriteEntity } from '@/engine/MapEngine';

interface ZoneHUDProps {
  health: number;
  maxHealth: number;
  credits: number;
  zoneState: ZoneState;
  engineRef: React.RefObject<MapEngine | null>;
  entitiesRef: React.RefObject<SpriteEntity[]>;
  onExit: () => void;
  onForgeKey: () => void;
}

export default function ZoneHUD({
  health,
  maxHealth,
  credits,
  zoneState,
  engineRef,
  entitiesRef,
  onExit,
  onForgeKey,
}: ZoneHUDProps) {
  const miniRef = useRef<HTMLCanvasElement>(null);
  const { config, shardsCollected, gridKeyForged, bossDefeated } = zoneState;
  const canForge = shardsCollected >= config.shardsRequired && !gridKeyForged;

  // Minimap
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const mini = miniRef.current;
      const engine = engineRef.current;
      const entities = entitiesRef.current;
      if (mini && engine && entities) {
        const ctx = mini.getContext('2d')!;
        const player = entities.find((e) => e.id === 'player');
        if (player) {
          engine.drawMinimap(ctx, mini.width, mini.height, player, entities);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engineRef, entitiesRef]);

  const hpPct = Math.round((health / maxHealth) * 100);
  const hpColor = hpPct > 50 ? '#39ff14' : hpPct > 25 ? '#ff8800' : '#ff0044';

  return (
    <>
      {/* Top-left stats */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, color: '#8888aa',
        background: 'rgba(5,5,15,0.85)',
        padding: '8px 12px',
        border: '1px solid rgba(0,240,255,0.15)',
        display: 'flex', flexDirection: 'column', gap: 4,
        minWidth: 160,
      }}>
        {/* Zone info */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#00f0ff', fontFamily: 'Orbitron, sans-serif', fontSize: 9, letterSpacing: '0.15em' }}>
            ZONE L{config.level}
          </span>
          <span style={{ color: '#6666aa', fontSize: 8 }}>
            {config.biome.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        {/* HP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: hpColor }}>HP</span>
          <div style={{ flex: 1, height: 6, background: '#111', border: '1px solid #333' }}>
            <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: hpColor, fontSize: 9 }}>{health}/{maxHealth}</span>
        </div>

        {/* Credits */}
        <div style={{ color: '#ffe600' }}>
          $ {credits}
        </div>

        {/* Shard counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <span style={{ color: '#00f0ff' }}>&#9670;</span>{' '}
            {shardsCollected}/{config.shardsRequired} SHARDS
          </span>
          {gridKeyForged && (
            <span style={{ color: '#ff00aa', fontSize: 8, letterSpacing: '0.1em' }}>
              KEY FORGED
            </span>
          )}
        </div>

        {/* Forge button */}
        {canForge && (
          <NeonButton variant="cyan" size="sm" onClick={onForgeKey}>
            FORGE GRID KEY
          </NeonButton>
        )}

        {/* Boss status */}
        {gridKeyForged && !bossDefeated && (
          <div style={{ color: '#ff0044', fontSize: 9, textAlign: 'center', marginTop: 2 }}>
            BOSS SPAWNED — FIND THE RIFT GATE
          </div>
        )}
        {bossDefeated && (
          <div style={{ color: '#39ff14', fontSize: 9, textAlign: 'center', marginTop: 2 }}>
            BOSS DEFEATED — EXIT TO CITY
          </div>
        )}
      </div>

      {/* Minimap (top-right) */}
      <canvas
        ref={miniRef}
        width={140}
        height={140}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          border: '1px solid rgba(0,240,255,0.3)',
          background: 'rgba(5,5,15,0.85)',
        }}
      />

      {/* Exit button (bottom-right) */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10 }}>
        <NeonButton variant="ghost" size="sm" onClick={onExit}>
          EXIT ZONE
        </NeonButton>
      </div>
    </>
  );
}
