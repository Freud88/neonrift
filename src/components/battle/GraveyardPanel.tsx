'use client';

import { motion } from 'framer-motion';
import type { Card } from '@/types/card';
import CardComponent from './CardComponent';

interface GraveyardPanelProps {
  playerDiscard: Card[];
  enemyDiscard: Card[];
  onClose: () => void;
}

export default function GraveyardPanel({ playerDiscard, enemyDiscard, onClose }: GraveyardPanelProps) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 70, background: 'rgba(5,5,15,0.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-lg p-5"
        style={{
          background: 'rgba(10,10,25,0.95)',
          border: '1px solid rgba(100,100,140,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-display text-lg tracking-widest"
            style={{ color: '#8888cc', textShadow: '0 0 8px #8888cc66' }}
          >
            GRAVEYARD
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-xs px-3 py-1 rounded"
            style={{
              background: 'rgba(60,60,80,0.3)',
              color: '#666',
              border: '1px solid rgba(60,60,80,0.3)',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Your Graveyard */}
        <div className="mb-4">
          <p className="font-mono text-xs mb-2" style={{ color: '#00f0ff88', letterSpacing: '0.1em' }}>
            YOUR GRAVEYARD ({playerDiscard.length})
          </p>
          {playerDiscard.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: '#333' }}>Empty</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {playerDiscard.map((card, i) => (
                <div key={`p_${card.id}_${i}`} style={{ opacity: 0.75 }}>
                  <CardComponent card={card} size="hand" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enemy Graveyard */}
        <div>
          <p className="font-mono text-xs mb-2" style={{ color: '#ff445588', letterSpacing: '0.1em' }}>
            ENEMY GRAVEYARD ({enemyDiscard.length})
          </p>
          {enemyDiscard.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: '#333' }}>Empty</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enemyDiscard.map((card, i) => (
                <div key={`e_${card.id}_${i}`} style={{ opacity: 0.75 }}>
                  <CardComponent card={card} size="hand" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
