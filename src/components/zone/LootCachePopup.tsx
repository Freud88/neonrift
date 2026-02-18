'use client';

import { motion } from 'framer-motion';
import NeonButton from '@/components/ui/NeonButton';

interface LootCachePopupProps {
  credits: number;
  shards: number;
  onClose: () => void;
}

export default function LootCachePopup({ credits, shards, onClose }: LootCachePopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        background: 'rgba(5,5,20,0.95)',
        border: '1px solid #ffe600',
        padding: '20px 28px',
        fontFamily: 'JetBrains Mono, monospace',
        textAlign: 'center',
        minWidth: 200,
      }}
    >
      <p style={{
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 12,
        color: '#ffe600',
        letterSpacing: '0.2em',
        marginBottom: 12,
      }}>
        GRID CACHE OPENED
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {credits > 0 && (
          <p style={{ fontSize: 12, color: '#ffe600' }}>
            + {credits} Credits
          </p>
        )}
        {shards > 0 && (
          <p style={{ fontSize: 12, color: '#00f0ff' }}>
            + {shards} Key Shard{shards > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <NeonButton variant="cyan" size="sm" onClick={onClose}>
        OK
      </NeonButton>
    </motion.div>
  );
}
