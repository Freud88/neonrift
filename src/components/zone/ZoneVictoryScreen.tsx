'use client';

import { motion } from 'framer-motion';
import NeonButton from '@/components/ui/NeonButton';

interface ZoneVictoryScreenProps {
  zoneLevel: number;
  bossName: string;
  onContinue: () => void;
}

export default function ZoneVictoryScreen({ zoneLevel, bossName, onContinue }: ZoneVictoryScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,5,20,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        zIndex: 60,
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <p style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 28,
          color: '#00f0ff',
          letterSpacing: '0.3em',
          textShadow: '0 0 30px rgba(0,240,255,0.5)',
          marginBottom: 12,
        }}>
          ZONE CLEARED
        </p>

        <p style={{ fontSize: 14, color: '#ff00aa', marginBottom: 8 }}>
          {bossName} DEFEATED
        </p>

        <div style={{
          border: '1px solid #00f0ff',
          padding: '16px 32px',
          margin: '16px 0',
          background: 'rgba(0,240,255,0.04)',
        }}>
          <p style={{ fontSize: 11, color: '#6666aa', marginBottom: 8 }}>
            ZONE LEVEL {zoneLevel} COMPLETED
          </p>
          <p style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 18,
            color: '#39ff14',
            letterSpacing: '0.2em',
          }}>
            LEVEL {zoneLevel + 1} UNLOCKED
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <NeonButton variant="cyan" size="lg" onClick={onContinue}>
            RETURN TO CITY
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
