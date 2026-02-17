'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DamageEvent {
  id: string;
  value: number;
  type: 'damage' | 'heal' | 'player_damage';
}

interface DamageNumberLayerProps {
  events: DamageEvent[];
  onExpire: (id: string) => void;
}

function FloatingNumber({ event, onExpire }: { event: DamageEvent; onExpire: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onExpire(event.id), 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [event.id, onExpire]);

  const color = event.type === 'heal' ? '#39ff14' : event.type === 'player_damage' ? '#00f0ff' : '#ff4444';
  const prefix = event.type === 'heal' ? '+' : '-';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const offsetX = useMemo(() => (Math.random() - 0.5) * 60, [event.id]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: offsetX, scale: 1.4 }}
      animate={{ opacity: 0, y: -55, scale: 0.9 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: '50%',
        pointerEvents: 'none',
        zIndex: 60,
        fontFamily: 'Orbitron, sans-serif',
        fontSize: event.value >= 5 ? 22 : 16,
        fontWeight: 900,
        color,
        textShadow: `0 0 8px ${color}, 0 0 20px ${color}`,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}{event.value}
    </motion.div>
  );
}

export default function DamageNumberLayer({ events, onExpire }: DamageNumberLayerProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'visible' }}>
      <AnimatePresence>
        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              position: 'absolute',
              top: ev.type === 'player_damage' ? '65%' : '35%',
              left: 0, right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <FloatingNumber event={ev} onExpire={onExpire} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
