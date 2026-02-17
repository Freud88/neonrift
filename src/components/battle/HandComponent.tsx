'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CardInPlay } from '@/types/card';
import CardComponent from './CardComponent';
import { ENERGY_COLORS } from '@/utils/energyColors';

interface HandComponentProps {
  hand: CardInPlay[];
  currentDataCells: number;
  selectedCardId: string | null;
  isPlayerTurn: boolean;
  onSelect: (instanceId: string | null) => void;
  onPlay: (instanceId: string, targetId?: string) => void;
  // For targeted spells: when a card is selected and needs a target
  requiresTarget: boolean;
  onCancelTarget: () => void;
}

export default function HandComponent({
  hand,
  currentDataCells,
  selectedCardId,
  isPlayerTurn,
  onSelect,
  onPlay,
  requiresTarget,
  onCancelTarget,
}: HandComponentProps) {
  const [previewCard, setPreviewCard] = useState<CardInPlay | null>(null);

  const handleCardClick = (c: CardInPlay) => {
    if (!isPlayerTurn) return;
    const canAfford = c.card.cost <= currentDataCells;
    if (!canAfford) return;

    if (selectedCardId === c.instanceId) {
      // Second tap on same card: deselect
      onSelect(null);
      return;
    }

    onSelect(c.instanceId);

    // Agents play immediately to the field
    // Scripts/malware with a specific target wait for target selection
    const needsTarget = c.card.type !== 'agent' && (
      c.card.effect?.target === 'any'
      || c.card.effect?.target === 'enemy_agent'
      || c.card.effect?.target === 'self'
    );

    if (!needsTarget) {
      onPlay(c.instanceId);
      onSelect(null);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Target instruction banner */}
      <AnimatePresence>
        {requiresTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: -28,
              left: 0, right: 0,
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#ffe600',
              background: 'rgba(0,0,0,0.8)',
              padding: '4px',
              borderTop: '1px solid #ffe600',
            }}
          >
            SELECT TARGET — tap enemy agent or enemy portrait  [TAP HAND TO CANCEL]
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand scroll container */}
      <div
        className="hand-scroll"
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px 4px',
        }}
        onClick={requiresTarget ? onCancelTarget : undefined}
      >
        <AnimatePresence>
          {hand.map((c, i) => {
            const canAfford = c.card.cost <= currentDataCells;
            const isSelected = selectedCardId === c.instanceId;
            return (
              <motion.div
                key={c.instanceId}
                initial={{ y: 60, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.6 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setPreviewCard(c)}
                onMouseLeave={() => setPreviewCard(null)}
              >
                <CardComponent
                  card={c.card}
                  inPlay={c}
                  size="hand"
                  selected={isSelected}
                  disabled={!isPlayerTurn || !canAfford}
                  onClick={() => handleCardClick(c)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hand.length === 0 && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: '#333355',
            padding: '20px 10px',
          }}>
            — hand empty —
          </div>
        )}
      </div>

      {/* Card preview tooltip (desktop hover) */}
      <AnimatePresence>
        {previewCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <CardComponent
              card={previewCard.card}
              inPlay={previewCard}
              size="preview"
            />
            {/* Description box */}
            <div style={{
              marginTop: 4,
              background: 'rgba(5,5,20,0.95)',
              border: `1px solid ${ENERGY_COLORS[previewCard.card.energy].primary}`,
              padding: '6px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: '#aaaacc',
              maxWidth: 130,
              lineHeight: 1.4,
            }}>
              {previewCard.card.description}
              {previewCard.card.keywords?.map((kw) => (
                <div key={kw.keyword} style={{ color: ENERGY_COLORS[previewCard.card.energy].primary, marginTop: 3 }}>
                  [{kw.keyword.toUpperCase()}{kw.value ? ` ${kw.value}` : ''}]
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
