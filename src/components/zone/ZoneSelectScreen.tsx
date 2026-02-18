'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import NeonButton from '@/components/ui/NeonButton';
import type { BiomeId } from '@/types/zone';

const BIOME_ORDER: BiomeId[] = [
  'neon_streets', 'industrial_wasteland', 'data_swamp',
  'chrome_forest', 'void_sector', 'rusted_depths',
];

const BIOME_DISPLAY: Record<BiomeId, { name: string; color: string; icon: string }> = {
  neon_streets:         { name: 'Neon Streets',         color: '#00f0ff', icon: '🏙' },
  industrial_wasteland: { name: 'Industrial Wasteland', color: '#ff8800', icon: '🏭' },
  data_swamp:           { name: 'Data Swamp',           color: '#44ff88', icon: '🌿' },
  chrome_forest:        { name: 'Chrome Forest',        color: '#cc88ff', icon: '🌲' },
  void_sector:          { name: 'Void Sector',          color: '#ff0066', icon: '🕳' },
  rusted_depths:        { name: 'Rusted Depths',        color: '#ff4422', icon: '⛏' },
};

interface ZoneSelectScreenProps {
  maxLevel: number;
  onEnterZone: (level: number) => void;
  onBack: () => void;
}

const DEBUG_MAX_LEVEL = 50; // [DEBUG] show all levels up to this; remove cap before release

export default function ZoneSelectScreen({ maxLevel, onEnterZone, onBack }: ZoneSelectScreenProps) {
  const [selected, setSelected] = useState<number>(maxLevel);

  const biome = BIOME_ORDER[(selected - 1) % BIOME_ORDER.length];
  const biomeInfo = BIOME_DISPLAY[biome];
  const shardsRequired = Math.min(15, 3 + Math.floor(selected / 3));

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,20,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      zIndex: 40,
      overflowY: 'auto',
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 600, marginBottom: 24 }}>
        <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, color: '#00f0ff', letterSpacing: '0.2em' }}>
          GRID PORTAL
        </p>
        <NeonButton variant="ghost" size="sm" onClick={onBack}>{'<'} BACK</NeonButton>
      </div>

      {/* Level grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
        gap: 8,
        width: '100%',
        maxWidth: 600,
        marginBottom: 24,
        maxHeight: 280,
        overflowY: 'auto',
        padding: '4px 0',
      }}>
        {Array.from({ length: DEBUG_MAX_LEVEL }, (_, i) => {
          const level = i + 1;
          const b = BIOME_ORDER[(level - 1) % BIOME_ORDER.length];
          const info = BIOME_DISPLAY[b];
          const isSelected = selected === level;
          const isLocked = level > maxLevel;
          return (
            <motion.button
              key={level}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(level)}
              style={{
                background: isSelected ? `rgba(0,240,255,0.12)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? info.color : isLocked ? '#1a1a33' : '#222244'}`,
                color: isSelected ? info.color : isLocked ? '#333355' : '#6666aa',
                padding: '10px 6px',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                borderRadius: 3,
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 16 }}>{info.icon}</span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 13 }}>L{level}</span>
              {isLocked && <span style={{ fontSize: 7, color: '#ff4444', letterSpacing: '0.05em' }}>DBG</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Selected level preview */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 600,
          border: `1px solid ${biomeInfo.color}`,
          background: 'rgba(10,10,30,0.8)',
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, color: biomeInfo.color, letterSpacing: '0.15em' }}>
              {biomeInfo.icon} LEVEL {selected}
            </p>
            <p style={{ fontSize: 11, color: biomeInfo.color, opacity: 0.7, marginTop: 4 }}>
              {biomeInfo.name}
            </p>
          </div>
          {selected === maxLevel && (
            <span style={{
              fontSize: 9,
              color: '#00f0ff',
              border: '1px solid #00f0ff',
              padding: '2px 8px',
              letterSpacing: '0.15em',
            }}>
              HIGHEST
            </span>
          )}
          {selected > maxLevel && (
            <span style={{
              fontSize: 9,
              color: '#ff4444',
              border: '1px solid #ff4444',
              padding: '2px 8px',
              letterSpacing: '0.15em',
            }}>
              [DEBUG]
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 11 }}>
          <div style={{ color: '#6666aa' }}>
            Key Shards needed: <span style={{ color: '#00f0ff' }}>{shardsRequired}</span>
          </div>
          <div style={{ color: '#6666aa' }}>
            Enemy ATK: <span style={{ color: '#ff4444' }}>x{(1 + (selected - 1) * 0.15).toFixed(2)}</span>
          </div>
          <div style={{ color: '#6666aa' }}>
            Enemy DEF: <span style={{ color: '#ff8800' }}>x{(1 + (selected - 1) * 0.12).toFixed(2)}</span>
          </div>
          <div style={{ color: '#6666aa' }}>
            Enemy HP: <span style={{ color: '#44ff88' }}>x{(1 + (selected - 1) * 0.2).toFixed(2)}</span>
          </div>
        </div>
      </motion.div>

      {/* Enter button */}
      <NeonButton
        variant="cyan"
        size="lg"
        onClick={() => onEnterZone(selected)}
      >
        ENTER THE RIFT — LEVEL {selected}
      </NeonButton>
    </div>
  );
}
