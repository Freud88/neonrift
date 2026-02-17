'use client';

import { motion } from 'framer-motion';
import type { CardInPlay } from '@/types/card';
import CardComponent from './CardComponent';
import NeonButton from '@/components/ui/NeonButton';

interface MulliganScreenProps {
  hand: CardInPlay[];
  onAccept: () => void;
  onMulligan: () => void;
  mulliganUsed: boolean;
}

export default function MulliganScreen({ hand, onAccept, onMulligan, mulliganUsed }: MulliganScreenProps) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,20,0.96)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 40,
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 24 }}
      >
        <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, color: '#00f0ff', letterSpacing: '0.2em', marginBottom: 6 }}>
          OPENING HAND
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6666aa' }}>
          {mulliganUsed
            ? 'Mulligan already used — keep this hand.'
            : 'Keep or shuffle for a new hand (once).'}
        </p>
      </motion.div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28, padding: '0 16px' }}>
        {hand.map((c, i) => (
          <motion.div
            key={c.instanceId}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <CardComponent card={c.card} inPlay={c} size="hand" />
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <NeonButton variant="cyan" size="md" onClick={onAccept}>
          KEEP HAND
        </NeonButton>
        {!mulliganUsed && (
          <NeonButton variant="magenta" size="md" onClick={onMulligan}>
            MULLIGAN
          </NeonButton>
        )}
      </div>
    </div>
  );
}
