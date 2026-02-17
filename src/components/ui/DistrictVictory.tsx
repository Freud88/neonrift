'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import NeonButton from './NeonButton';

interface DistrictVictoryProps {
  districtName: string;
  onContinue: () => void;
}

export default function DistrictVictory({ districtName, onContinue }: DistrictVictoryProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowDetails(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5,5,20,0.98)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 90,
    }}>
      {/* Scan lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Glitch bars */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 2,
            top: `${20 + i * 30}%`,
            background: i % 2 === 0 ? '#00f0ff' : '#c850ff',
            opacity: 0,
          }}
          animate={{ opacity: [0, 0.6, 0, 0.4, 0], x: [0, -20, 20, -10, 0] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: 2, repeatDelay: 4 }}
        />
      ))}

      {/* District liberated title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 15 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: '#c850ff',
          letterSpacing: '0.4em',
          marginBottom: 12,
        }}>
          — DISTRICT LIBERATED —
        </p>
        <p style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 38,
          fontWeight: 900,
          letterSpacing: '0.12em',
          color: '#00f0ff',
          textShadow: '0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.4)',
          lineHeight: 1.1,
        }}>
          {districtName.toUpperCase()}
        </p>
        <p style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 12,
          color: 'rgba(0,240,255,0.5)',
          letterSpacing: '0.3em',
          marginTop: 8,
        }}>
          UNDER YOUR CONTROL
        </p>
      </motion.div>

      {/* Details */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            marginBottom: 40,
            maxWidth: 320,
          }}
        >
          <div style={{
            border: '1px solid rgba(0,240,255,0.2)',
            padding: '16px 24px',
            marginBottom: 20,
          }}>
            {[
              { label: 'ENEMY BOSS', value: 'MADAME FLUX', color: '#ff0044' },
              { label: 'STATUS', value: 'NEUTRALIZED', color: '#00f0ff' },
              { label: 'DISTRICT', value: districtName.toUpperCase(), color: '#c850ff' },
              { label: 'NEXT DISTRICT', value: 'COMING SOON', color: '#6666aa' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                marginBottom: 8,
              }}>
                <span style={{ color: '#6666aa', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ color, letterSpacing: '0.1em' }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: '#6666aa',
            lineHeight: 1.7,
          }}>
            The Grid trembles. Madame Flux&apos;s hold on Neon Row is broken.<br />
            Your legend grows — the next district awaits.
          </p>
        </motion.div>
      )}

      {showDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <NeonButton variant="cyan" size="lg" onClick={onContinue}>
            ← BACK TO MAP
          </NeonButton>
        </motion.div>
      )}
    </div>
  );
}
