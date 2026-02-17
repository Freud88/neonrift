'use client';

import { useRef, useEffect } from 'react';
import type { SpriteEntity } from '@/engine/MapEngine';
import type { MapEngine } from '@/engine/MapEngine';

interface ExplorationHUDProps {
  health: number;
  maxHealth: number;
  credits: number;
  defeatedCount: number;
  requiredKills: number;
  engineRef: React.RefObject<MapEngine | null>;
  entitiesRef: React.RefObject<SpriteEntity[]>;
  onInventory: () => void;
}

export default function ExplorationHUD({
  health,
  maxHealth,
  credits,
  defeatedCount,
  requiredKills,
  engineRef,
  entitiesRef,
  onInventory,
}: ExplorationHUDProps) {
  const miniRef = useRef<HTMLCanvasElement>(null);

  const hpPct = Math.max(0, health / maxHealth);
  const hpColor = hpPct > 0.5 ? '#00f0ff' : hpPct > 0.25 ? '#ffe600' : '#ff0044';

  // Draw minimap each frame
  useEffect(() => {
    let rafId: number;
    const draw = () => {
      const mini = miniRef.current;
      const engine = engineRef.current;
      const entities = entitiesRef.current;
      if (mini && engine && entities) {
        const ctx = mini.getContext('2d');
        if (ctx) {
          engine.drawMinimap(ctx, mini.width, mini.height, entities[0], entities);
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [engineRef, entitiesRef]);

  return (
    <>
      {/* Top-left: health + credits */}
      <div
        className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* HP bar */}
        <div
          className="flex items-center gap-2"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${hpColor}`,
            padding: '4px 8px',
            minWidth: 140,
          }}
        >
          <span className="font-mono text-xs" style={{ color: hpColor, minWidth: 18 }}>HP</span>
          <div style={{ flex: 1, height: 6, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${hpPct * 100}%`,
                height: '100%',
                background: hpColor,
                boxShadow: `0 0 6px ${hpColor}`,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span className="font-mono text-xs" style={{ color: hpColor }}>{health}/{maxHealth}</span>
        </div>

        {/* Credits */}
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(200,80,255,0.6)',
            padding: '3px 8px',
          }}
        >
          <span className="font-mono text-xs" style={{ color: '#c850ff' }}>¢ {credits}</span>
        </div>

        {/* Kill counter */}
        <div
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,230,0,0.4)',
            padding: '3px 8px',
          }}
        >
          <span className="font-mono text-xs" style={{ color: '#ffe600' }}>
            KILLS {defeatedCount}/{requiredKills} ★
          </span>
        </div>
      </div>

      {/* Top-right: minimap */}
      <div
        className="absolute top-3 right-3 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <canvas
          ref={miniRef}
          width={100}
          height={80}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Bottom-right: inventory button */}
      <button
        onClick={onInventory}
        className="absolute bottom-5 right-5 font-mono text-xs tracking-widest"
        style={{
          zIndex: 10,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(0,240,255,0.5)',
          color: '#00f0ff',
          padding: '8px 14px',
          minWidth: 44,
          minHeight: 44,
          cursor: 'pointer',
        }}
      >
        [DECK]
      </button>
    </>
  );
}
