'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '@/types/card';
import CardComponent from './CardComponent';
import NeonButton from '@/components/ui/NeonButton';
import { ENEMIES } from '@/data/enemies';

interface BattleRewardsProps {
  result: 'win' | 'lose';
  credits: number;
  xp: number;
  cardChoices: Card[];
  enemyProfileId: string;
  onChooseCard: (card: Card | null) => void;
  onContinue: () => void;
}

export default function BattleRewards({
  result,
  credits,
  xp,
  cardChoices,
  enemyProfileId,
  onChooseCard,
  onContinue,
}: BattleRewardsProps) {
  const [chosen, setChosen] = useState<Card | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const profile = ENEMIES[enemyProfileId];
  const isWin = result === 'win';

  const handleChoose = (card: Card) => {
    if (confirmed) return;
    setChosen(card);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onChooseCard(chosen);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,20,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 40,
    }}>
      {/* Result banner */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{ marginBottom: 20, textAlign: 'center' }}
      >
        <p style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: '0.2em',
          color: isWin ? '#00f0ff' : '#ff0044',
          textShadow: isWin
            ? '0 0 20px #00f0ff, 0 0 40px rgba(0,240,255,0.4)'
            : '0 0 20px #ff0044, 0 0 40px rgba(255,0,68,0.4)',
          marginBottom: 4,
        }}>
          {isWin ? 'VICTORY' : 'DEFEATED'}
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6666aa' }}>
          {isWin
            ? `${profile?.dialogue.onLose ?? 'Enemy defeated.'}`
            : `${profile?.dialogue.onWin ?? 'You were defeated.'}`}
        </p>
      </motion.div>

      {/* Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex', gap: 20, marginBottom: 20,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#6666aa', marginBottom: 4 }}>CREDITS</div>
          <div style={{ fontSize: 18, color: '#c850ff', fontWeight: 700 }}>+{credits}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#6666aa', marginBottom: 4 }}>XP</div>
          <div style={{ fontSize: 18, color: '#ffe600', fontWeight: 700 }}>+{xp}</div>
        </div>
      </motion.div>

      {/* Card choices (only on win) */}
      {isWin && cardChoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginBottom: 20, textAlign: 'center' }}
        >
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', marginBottom: 10, letterSpacing: '0.15em' }}>
            CHOOSE A CARD TO ADD TO YOUR COLLECTION
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {cardChoices.map((card) => (
              <motion.div
                key={card.id}
                whileHover={{ y: -6 }}
                onClick={() => handleChoose(card)}
                style={{
                  cursor: confirmed ? 'default' : 'pointer',
                  outline: chosen?.id === card.id ? '2px solid #00f0ff' : 'none',
                  outlineOffset: 3,
                  borderRadius: 4,
                }}
              >
                <CardComponent card={card} size="hand" selected={chosen?.id === card.id} />
              </motion.div>
            ))}
          </div>
          {!confirmed && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <NeonButton variant="cyan" size="sm" onClick={handleConfirm} disabled={!chosen}>
                TAKE CARD
              </NeonButton>
              <NeonButton variant="ghost" size="sm" onClick={() => { onChooseCard(null); setConfirmed(true); }}>
                SKIP
              </NeonButton>
            </div>
          )}
          {confirmed && chosen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00f0ff', marginTop: 10 }}
            >
              [{chosen.name}] added to collection.
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Continue button */}
      {(confirmed || !isWin || cardChoices.length === 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <NeonButton
            variant={isWin ? 'cyan' : 'magenta'}
            size="lg"
            onClick={onContinue}
          >
            {isWin ? '← BACK TO MAP' : '← RETRY'}
          </NeonButton>
        </motion.div>
      )}
    </div>
  );
}
