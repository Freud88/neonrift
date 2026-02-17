'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CardInPlay } from '@/types/card';
import CardComponent from './CardComponent';

interface FieldComponentProps {
  cards: CardInPlay[];
  traps: CardInPlay[];
  side: 'player' | 'enemy';
  attackers?: string[];
  onCardClick?: (instanceId: string, e?: React.MouseEvent) => void;
  canAttack?: boolean;
  isTargeting?: boolean;
}

export default function FieldComponent({
  cards,
  traps,
  side,
  attackers = [],
  onCardClick,
  canAttack = false,
  isTargeting = false,
}: FieldComponentProps) {
  const isPlayer = side === 'player';
  const agents = cards.filter((c) => c.card.type === 'agent');
  const malwares = cards.filter((c) => c.card.type === 'malware');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'center',
      padding: '4px 8px',
      minHeight: 100,
    }}>
      {/* Malware row */}
      {malwares.length > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', opacity: 0.7 }}>
          {malwares.map((c) => (
            <motion.div
              key={c.instanceId}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CardComponent
                card={c.card}
                inPlay={c}
                size="mini"
                disabled
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Label */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 7,
        color: isPlayer ? 'rgba(0,240,255,0.3)' : 'rgba(255,68,68,0.3)',
        letterSpacing: '0.2em',
        textAlign: 'center',
      }}>
        {isPlayer ? '── PLAYER FIELD ──' : '── ENEMY FIELD ──'}
      </div>

      {/* Agent row */}
      <div style={{
        display: 'flex',
        gap: 6,
        justifyContent: 'center',
        flexWrap: 'wrap',
        minHeight: 95,
        alignItems: 'center',
      }}>
        <AnimatePresence>
          {agents.map((c) => {
            const isAttacking = attackers.includes(c.instanceId);
            const isPlayerClickable = isPlayer && canAttack && !c.tapped && !c.summonedThisTurn;
            // Enemy agents are clickable when player is in targeting mode
            const isEnemyTargetable = !isPlayer && isTargeting;
            const isClickable = isPlayerClickable || isEnemyTargetable;

            return (
              <motion.div
                key={c.instanceId}
                initial={{ scale: 0, y: isPlayer ? 20 : -20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{
                  scale: [1, 1.2, 0.8, 0],
                  opacity: [1, 0.8, 0.4, 0],
                  filter: ['brightness(1)', 'brightness(4) hue-rotate(90deg)', 'brightness(2)', 'brightness(0)'],
                  x: [0, -6, 8, 0],
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div
                  onClick={isEnemyTargetable ? (e) => { e.stopPropagation(); onCardClick?.(c.instanceId, e); } : undefined}
                >
                  <CardComponent
                    card={c.card}
                    inPlay={c}
                    size="field"
                    selected={isAttacking || isEnemyTargetable}
                    attacking={isAttacking}
                    tapped={c.tapped}
                    disabled={!isClickable}
                    onClick={isPlayerClickable ? () => onCardClick?.(c.instanceId) : undefined}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty slot hint */}
        {agents.length === 0 && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 8,
            color: 'rgba(100,100,150,0.4)',
          }}>
            {isPlayer ? 'Play an Agent →' : '— empty —'}
          </div>
        )}
      </div>

      {/* Traps row */}
      {traps.length > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {traps.map((c) => (
            <motion.div
              key={c.instanceId}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CardComponent
                card={c.card}
                inPlay={c}
                size="mini"
                faceDown={!isPlayer || side !== 'player'}
                disabled
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
