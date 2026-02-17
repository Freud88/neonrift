'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CombatantState } from '@/engine/BattleEngine';
import { ENEMIES } from '@/data/enemies';

interface BattleHUDProps {
  player: CombatantState;
  enemy: CombatantState;
  enemyProfileId: string;
  turnPhase: string;
  battlePhase: string;
  isAnimating: boolean;
  onEndTurn: () => void;
}

function DataCells({ current, max }: { current: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 130 }}>
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            width: 10, height: 10,
            background: i < current ? '#00f0ff' : '#111133',
            border: '1px solid rgba(0,240,255,0.4)',
            borderRadius: 2,
            boxShadow: i < current ? '0 0 4px #00f0ff' : 'none',
          }}
          animate={i === current - 1 && current > 0 ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

function HealthBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, current / max);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 8, background: '#0a0a1a', borderRadius: 2, overflow: 'hidden', border: `1px solid ${color}` }}>
        <motion.div
          style={{ height: '100%', background: color, boxShadow: `0 0 6px ${color}` }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color, minWidth: 40, textAlign: 'right' }}>
        {current}/{max}
      </span>
    </div>
  );
}

export default function BattleHUD({
  player, enemy, enemyProfileId, turnPhase, battlePhase, isAnimating, onEndTurn,
}: BattleHUDProps) {
  const profile = ENEMIES[enemyProfileId];
  const isPlayerTurn = battlePhase === 'player_turn';
  const canEndTurn = isPlayerTurn && !isAnimating;

  return (
    <>
      {/* Enemy info — top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'rgba(5,5,20,0.9)',
        borderBottom: '1px solid rgba(255,0,68,0.3)',
        padding: '6px 10px',
        display: 'flex', alignItems: 'center', gap: 8, zIndex: 5,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: profile?.spriteColor ?? '#ff4444',
          border: '2px solid rgba(255,0,68,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          {profile?.isBoss ? '★' : '×'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#ff4444', letterSpacing: '0.1em' }}>
            {profile?.name ?? 'ENEMY'} — {profile?.title ?? ''}
          </div>
          <HealthBar current={enemy.health} max={enemy.maxHealth} color="#ff4444" />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#444466', marginBottom: 2 }}>HAND</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#ff4444' }}>{enemy.hand.length}</div>
        </div>
      </div>

      {/* Player info — bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(5,5,20,0.9)',
        borderTop: '1px solid rgba(0,240,255,0.3)',
        padding: '6px 10px',
        zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', letterSpacing: '0.1em', marginBottom: 2 }}>
              DRIFTER
            </div>
            <HealthBar current={player.health} max={player.maxHealth} color="#00f0ff" />
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#444466' }}>DECK</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6666aa' }}>{player.deck.length}</div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#444466' }}>PHASE</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: isPlayerTurn ? '#00f0ff' : '#ff4444' }}>
              {battlePhase.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Data Cells */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#444466', marginBottom: 2 }}>
              DATA CELLS {player.currentDataCells}/{player.maxDataCells}
            </div>
            <DataCells current={player.currentDataCells} max={player.maxDataCells} />
          </div>

          {/* End Turn button */}
          <motion.button
            onClick={canEndTurn ? onEndTurn : undefined}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              background: canEndTurn ? 'rgba(0,240,255,0.1)' : 'rgba(0,0,0,0.4)',
              border: `2px solid ${canEndTurn ? '#00f0ff' : '#1a1a3a'}`,
              color: canEndTurn ? '#00f0ff' : '#333355',
              padding: '8px 14px',
              cursor: canEndTurn ? 'pointer' : 'not-allowed',
              minWidth: 90,
              minHeight: 44,
            }}
            animate={canEndTurn ? {
              boxShadow: ['0 0 0px #00f0ff', '0 0 10px #00f0ff', '0 0 0px #00f0ff'],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isPlayerTurn ? 'END TURN' : 'ENEMY...'}
          </motion.button>
        </div>

        {/* Turn phase indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={turnPhase}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#333355', letterSpacing: '0.15em' }}
          >
            {isPlayerTurn ? `// PHASE: ${turnPhase.toUpperCase()}` : '// ENEMY PROCESSING...'}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
