'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleStore } from '@/stores/battleStore';
import { useGameStore } from '@/stores/gameStore';
import { ENEMIES } from '@/data/enemies';
import type { Card } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import BattleHUD from './BattleHUD';
import CardComponent from './CardComponent';
import FieldComponent from './FieldComponent';
import HandComponent from './HandComponent';
import MulliganScreen from './MulliganScreen';
import BattleRewards from './BattleRewards';
import DamageNumberLayer, { type DamageEvent } from './DamageNumber';

interface BattleArenaProps {
  enemyId: string;           // map instance ID (for marking defeated)
  enemyProfileId: string;
  enemyProfile?: import('@/types/enemy').EnemyProfile;  // optional override for procedural enemies
  onBattleEnd: (result: 'win' | 'lose') => void;
}

export default function BattleArena({ enemyId, enemyProfileId, enemyProfile: overrideProfile, onBattleEnd }: BattleArenaProps) {
  const {
    battleState,
    selectedCardId,
    pendingAttackerId,
    isAnimating,
    pendingEnemyCard,
    acceptHand,
    doMulligan,
    selectCard,
    playCard,
    selectAttacker,
    attackVsAgent,
    attackVsPlayer,
    endPlayerTurn,
    acknowledgeEnemyCard,
    clearBattle,
    engine,
  } = useBattleStore();

  const { gameState, defeatEnemy, defeatBoss, incrementLoss, addToCollection, addCraftingItem } = useGameStore();

  const [mulliganUsed, setMulliganUsed]       = useState(false);
  const [rewardsReady, setRewardsReady]       = useState(false);
  const [rewardCards, setRewardCards]         = useState<Card[]>([]);
  const [craftingDrop, setCraftingDrop]       = useState<CraftingItemId | null>(null);
  const [requiresTarget, setRequiresTarget] = useState(false);
  const [damageEvents, setDamageEvents]     = useState<DamageEvent[]>([]);
  const [shake, setShake]                   = useState(false);
  const prevPlayerHp = useRef<number | null>(null);
  const prevEnemyHp  = useRef<number | null>(null);

  const profile = overrideProfile ?? ENEMIES[enemyProfileId];

  // ── Initialize ──────────────────────────────────────────────────────────────
  const { startBattle } = useBattleStore();
  useEffect(() => {
    if (!gameState) return;
    startBattle(gameState.deck, enemyProfileId, overrideProfile);
    return () => clearBattle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Track HP changes → spawn damage numbers ─────────────────────────────────
  useEffect(() => {
    if (!battleState) return;
    const playerHp = battleState.player.health;
    const enemyHp  = battleState.enemy.health;

    if (prevPlayerHp.current !== null && playerHp < prevPlayerHp.current) {
      const dmg = prevPlayerHp.current - playerHp;
      setDamageEvents((prev) => [...prev, { id: `p-${Date.now()}`, value: dmg, type: 'player_damage' }]);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    if (prevEnemyHp.current !== null && enemyHp < prevEnemyHp.current) {
      const dmg = prevEnemyHp.current - enemyHp;
      setDamageEvents((prev) => [...prev, { id: `e-${Date.now()}`, value: dmg, type: 'damage' }]);
    }

    prevPlayerHp.current = playerHp;
    prevEnemyHp.current  = enemyHp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleState?.player.health, battleState?.enemy.health]);

  // ── Watch for battle end ────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleState) return;
    if (battleState.result !== 'pending' && !rewardsReady) {
      // Wait a moment then show rewards
      setTimeout(() => {
        if (engine && battleState.result === 'win') {
          setRewardCards(engine.getRewardChoices());
          setCraftingDrop(engine.getCraftingDrop());
        }
        setRewardsReady(true);
      }, 800);
    }
  }, [battleState, rewardsReady, engine]);

  // ── Card play logic ─────────────────────────────────────────────────────────

  const handleCardSelect = useCallback((instanceId: string | null) => {
    if (!battleState || battleState.phase !== 'player_turn') return;
    selectCard(instanceId);

    if (instanceId) {
      const card = battleState.player.hand.find((c) => c.instanceId === instanceId);
      const needsTarget = card?.card.effect?.target === 'any'
        || card?.card.effect?.target === 'enemy_agent'
        || (card?.card.effect?.target === 'self' && battleState.player.field.length > 0);
      setRequiresTarget(needsTarget && card?.card.type !== 'agent' || false);
    } else {
      setRequiresTarget(false);
    }
  }, [battleState, selectCard]);

  const handleFieldClick = useCallback((instanceId: string, side: 'player' | 'enemy') => {
    if (!battleState || battleState.phase !== 'player_turn' || isAnimating) return;

    // Script/spell targeting: play card on enemy agent
    if (requiresTarget && selectedCardId && side === 'enemy') {
      playCard(selectedCardId, instanceId);
      setRequiresTarget(false);
      return;
    }

    // Player clicks enemy agent while an attacker is selected → attack it
    if (side === 'enemy' && pendingAttackerId) {
      attackVsAgent(instanceId);
      return;
    }

    // Player clicks their own agent → select/deselect as attacker
    if (side === 'player') {
      if (pendingAttackerId === instanceId) {
        selectAttacker(null); // deselect
      } else {
        selectAttacker(instanceId);
      }
    }
  }, [battleState, isAnimating, requiresTarget, selectedCardId, pendingAttackerId, playCard, selectAttacker, attackVsAgent]);

  const handleEnemyPortraitClick = useCallback(() => {
    if (!battleState || battleState.phase !== 'player_turn' || isAnimating) return;

    // Script targeting → enemy player
    if (requiresTarget && selectedCardId) {
      playCard(selectedCardId, 'enemy_player');
      setRequiresTarget(false);
      return;
    }

    // Attacker selected → attack enemy player directly
    if (pendingAttackerId) {
      attackVsPlayer();
      return;
    }
  }, [battleState, isAnimating, requiresTarget, selectedCardId, pendingAttackerId, playCard, attackVsPlayer]);

  const handlePlayCard = useCallback((instanceId: string, targetId?: string) => {
    if (!battleState || battleState.phase !== 'player_turn') return;
    const card = battleState.player.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;

    if (card.card.type === 'agent') {
      playCard(instanceId);
      setRequiresTarget(false);
    } else {
      playCard(instanceId, targetId);
      setRequiresTarget(false);
    }
  }, [battleState, playCard]);

  const handleEndTurn = useCallback(async () => {
    selectAttacker(null); // clear any pending attacker
    await endPlayerTurn();
  }, [endPlayerTurn, selectAttacker]);

  // ── Rewards handling ────────────────────────────────────────────────────────

  const handleChooseCard = useCallback((card: Card | null) => {
    if (card) addToCollection(card);
  }, [addToCollection]);

  const handleContinue = useCallback(() => {
    if (!battleState) return;
    const isWin = battleState.result === 'win';

    if (isWin) {
      defeatEnemy(enemyId, profile?.rewards.credits ?? 30, profile?.rewards.xpGain ?? 10);
      if (profile?.isBoss) defeatBoss(enemyProfileId);
      if (craftingDrop) addCraftingItem(craftingDrop);
    } else {
      incrementLoss();
    }

    clearBattle();
    onBattleEnd(battleState.result as 'win' | 'lose');
  }, [battleState, enemyId, profile, enemyProfileId, craftingDrop, defeatEnemy, defeatBoss, incrementLoss, addCraftingItem, clearBattle, onBattleEnd]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!battleState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#00f0ff', fontFamily: 'JetBrains Mono, monospace' }}>
        Loading battle...
      </div>
    );
  }

  const { player, enemy, phase, turnPhase } = battleState;
  const isPlayerTurn = phase === 'player_turn';
  const hasAttacker = !!pendingAttackerId;

  return (
    <motion.div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#070710',
        overflow: 'hidden',
      }}
      animate={shake ? { x: [0, -8, 8, -5, 5, -2, 0] } : { x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
      }} />

      {/* Center divider */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: '50%', height: 1,
        background: 'linear-gradient(to right, transparent, rgba(0,240,255,0.2) 20%, rgba(0,240,255,0.2) 80%, transparent)',
        transform: 'translateY(-50%)',
      }} />

      {/* Top HUD area spacer */}
      <div style={{ height: 52 }} />

      {/* Enemy field */}
      <div
        style={{ padding: '0 8px', cursor: (requiresTarget || hasAttacker) ? 'crosshair' : 'default' }}
        onClick={handleEnemyPortraitClick}
      >
        <FieldComponent
          cards={enemy.field}
          traps={enemy.traps}
          side="enemy"
          isTargeting={requiresTarget || hasAttacker}
          onCardClick={(id) => handleFieldClick(id, 'enemy')}
        />
      </div>

      {/* VS line */}
      <div style={{
        textAlign: 'center',
        fontFamily: 'Orbitron, sans-serif',
        fontSize: 8,
        color: 'rgba(0,240,255,0.2)',
        letterSpacing: '0.4em',
        padding: '2px 0',
      }}>
        — DUEL —
      </div>

      {/* Player field */}
      <FieldComponent
        cards={player.field}
        traps={player.traps}
        side="player"
        attackers={pendingAttackerId ? [pendingAttackerId] : []}
        canAttack={isPlayerTurn && !isAnimating}
        onCardClick={(id) => handleFieldClick(id, 'player')}
      />

      {/* Attack target hint */}
      <AnimatePresence>
        {hasAttacker && isPlayerTurn && !isAnimating && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: 160,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: '#ff4400',
              letterSpacing: '0.15em',
              background: 'rgba(5,5,20,0.9)',
              border: '1px solid rgba(255,68,0,0.4)',
              padding: '6px 14px',
              textAlign: 'center',
            }}
          >
            ⚔ CLICK ENEMY AGENT OR PORTRAIT TO ATTACK
          </motion.div>
        )}
      </AnimatePresence>

      {/* Damage flash effect */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute', inset: 0,
              background: '#ff0000',
              pointerEvents: 'none',
              zIndex: 8,
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating damage numbers */}
      <DamageNumberLayer
        events={damageEvents}
        onExpire={(id) => setDamageEvents((prev) => prev.filter((e) => e.id !== id))}
      />

      {/* Enemy card notification overlay */}
      <AnimatePresence>
        {pendingEnemyCard && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'absolute',
              bottom: 160,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
              background: 'rgba(5,5,20,0.97)',
              border: '1px solid #ff4444',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              minWidth: 180,
            }}
          >
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#ff4444', letterSpacing: '0.2em' }}>
              ENEMY PLAYS
            </p>
            <CardComponent card={pendingEnemyCard.card} size="hand" selected={false} />
            <button
              onClick={acknowledgeEnemyCard}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.15em',
                background: 'rgba(255,68,68,0.15)',
                border: '1px solid #ff4444',
                color: '#ff4444',
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand area */}
      <div style={{
        position: 'absolute', bottom: 52, left: 0, right: 0,
        background: 'rgba(5,5,20,0.8)',
        borderTop: '1px solid rgba(0,240,255,0.15)',
        padding: '4px 0',
      }}>
        <HandComponent
          hand={player.hand}
          currentDataCells={player.currentDataCells}
          selectedCardId={selectedCardId}
          isPlayerTurn={isPlayerTurn && !isAnimating}
          onSelect={handleCardSelect}
          onPlay={handlePlayCard}
          requiresTarget={requiresTarget}
          onCancelTarget={() => { setRequiresTarget(false); selectCard(null); }}
        />
      </div>

      {/* HUD (top + bottom bars) */}
      <BattleHUD
        player={player}
        enemy={enemy}
        enemyProfileId={enemyProfileId}
        turnPhase={turnPhase}
        battlePhase={phase}
        isAnimating={isAnimating}
        onEndTurn={handleEndTurn}
      />

      {/* Mulligan screen */}
      {phase === 'mulligan' && (
        <MulliganScreen
          hand={player.hand}
          onAccept={() => { acceptHand(); }}
          onMulligan={() => { doMulligan(); setMulliganUsed(true); }}
          mulliganUsed={mulliganUsed}
        />
      )}

      {/* Battle end / rewards */}
      {rewardsReady && battleState.result !== 'pending' && (
        <BattleRewards
          result={battleState.result as 'win' | 'lose'}
          credits={profile?.rewards.credits ?? 30}
          xp={profile?.rewards.xpGain ?? 10}
          cardChoices={rewardCards}
          craftingDrop={craftingDrop ? { id: craftingDrop, quantity: 1 } : null}
          enemyProfileId={enemyProfileId}
          onChooseCard={handleChooseCard}
          onContinue={handleContinue}
        />
      )}
    </motion.div>
  );
}
