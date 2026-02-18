'use client';

import { motion } from 'framer-motion';
import { RiftDecayEngine } from '@/engine/RiftDecayEngine';
import { CORRUPTION_MAP } from '@/data/riftCorruptions';

interface RiftClockHUDProps {
  elapsedMs: number;
  currentStage: number;
  stageProgress: number;
  activeCorruptions?: string[];
}

export default function RiftClockHUD({ elapsedMs, currentStage, stageProgress, activeCorruptions = [] }: RiftClockHUDProps) {
  const info = RiftDecayEngine.getStageInfo(currentStage);

  const totalSec = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.7)',
      border: `1px solid ${info.color}44`,
      borderRadius: 4,
      minWidth: 120,
    }}>
      {/* Timer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          color: info.color,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textShadow: currentStage >= 3 ? `0 0 8px ${info.color}` : 'none',
        }}>
          {mm}:{ss}
        </span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8,
          color: info.color,
          letterSpacing: '0.15em',
          opacity: 0.9,
        }}>
          RIFT
        </span>
      </div>

      {/* Stage name */}
      <motion.div
        key={currentStage}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 9,
          color: info.color,
          letterSpacing: '0.2em',
          textAlign: 'center',
          textShadow: currentStage >= 4 ? `0 0 12px ${info.color}` : 'none',
        }}
      >
        {info.name}
      </motion.div>

      {/* Progress bar to next stage */}
      <div style={{
        height: 3,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <motion.div
          style={{
            height: '100%',
            background: info.color,
            boxShadow: `0 0 4px ${info.color}`,
          }}
          animate={{ width: `${stageProgress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Active corruptions */}
      {activeCorruptions.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 2,
          marginTop: 2,
        }}>
          {activeCorruptions.map((id) => {
            const c = CORRUPTION_MAP[id];
            if (!c) return null;
            return (
              <span
                key={id}
                title={`${c.name}: ${c.description}`}
                style={{
                  fontSize: 10,
                  cursor: 'help',
                  filter: 'saturate(0.7)',
                }}
              >
                {c.icon}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
