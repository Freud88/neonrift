'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleStore } from '@/stores/battleStore';
import { useGameStore } from '@/stores/gameStore';
import { setRiftLevelForTierRoll } from '@/utils/cardMods';
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
import GraveyardPanel from './GraveyardPanel';

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
    resolveFork,
    selectAttacker,
    attackVsAgent,
    attackVsPlayer,
    endPlayerTurn,
    acknowledgeEnemyCard,
    clearBattle,
    engine,
  } = useBattleStore();

  const { gameState, activeZone, defeatEnemy, defeatBoss, incrementLoss, addToCollection, addCraftingItem } = useGameStore();

  const [mulliganUsed, setMulliganUsed]       = useState(false);
  const [rewardsReady, setRewardsReady]       = useState(false);
  const [rewardCards, setRewardCards]         = useState<Card[]>([]);
  const [craftingDrop, setCraftingDrop]       = useState<CraftingItemId | null>(null);
  const [requiresTarget, setRequiresTarget] = useState(false);
  const pendingFork = battleState?.pendingFork ?? null;
  const [damageEvents, setDamageEvents]     = useState<DamageEvent[]>([]);
  const [shake, setShake]                   = useState(false);
  const [showLog, setShowLog]               = useState(false);
  const [showGraveyard, setShowGraveyard]   = useState(false);
  const [decayToasts, setDecayToasts]       = useState<{ id: string; msg: string }[]>([]);
  const prevPlayerHp = useRef<number | null>(null);
  const prevEnemyHp  = useRef<number | null>(null);

  const profile = overrideProfile ?? ENEMIES[enemyProfileId];

  // ── Initialize ──────────────────────────────────────────────────────────────
  const { startBattle } = useBattleStore();
  useEffect(() => {
    if (!gameState) return;
    // Set rift level for tier rolling (higher zone = better enemy mod tiers)
    setRiftLevelForTierRoll(activeZone?.config.level ?? 0);
    const decayStage = activeZone?.riftClock?.currentStage ?? 0;
    const activeCorruptions = activeZone?.activeCorruptions ?? [];
    startBattle(gameState.deck, enemyProfileId, overrideProfile, decayStage, activeCorruptions);
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

  // ── Consume decay events → show toasts ─────────────────────────────────────
  useEffect(() => {
    if (!battleState?.decayEvents.length || !engine) return;
    const events = engine.consumeDecayEvents();
    if (!events.length) return;
    const newToasts = events.map((msg) => ({ id: `decay-${Date.now()}-${Math.random()}`, msg }));
    setDecayToasts((prev) => [...prev, ...newToasts]);
    // Auto-dismiss after 3.5s
    newToasts.forEach(({ id }) => {
      setTimeout(() => setDecayToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleState?.decayEvents.length]);

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

    // Forked: resolve second launch on chosen target
    if (pendingFork && side === 'enemy') {
      resolveFork(instanceId);
      return;
    }

    // Script/spell targeting: play card on enemy agent
    if (requiresTarget && selectedCardId && side === 'enemy') {
      playCard(selectedCardId, instanceId);
      setRequiresTarget(false);
      return;
    }

    // Script/spell targeting: buff scripts targeting a friendly agent (target === 'self')
    if (requiresTarget && selectedCardId && side === 'player') {
      const pendingCard = battleState.player.hand.find((c) => c.instanceId === selectedCardId);
      if (pendingCard?.card.effect?.target === 'self') {
        playCard(selectedCardId, instanceId);
        setRequiresTarget(false);
        return;
      }
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

    // Forked: resolve second launch on enemy player
    if (pendingFork) {
      resolveFork('enemy_player');
      return;
    }

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

      {/* Decay event toasts — stacked above hand */}
      <div style={{
        position: 'absolute',
        bottom: 160,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {decayToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(8,2,2,0.97)',
                border: '1px solid rgba(180,30,30,0.7)',
                padding: '5px 12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: '#ff6655',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 10px rgba(200,0,0,0.25)',
              }}
            >
              <span style={{ fontSize: 12 }}>☠</span>
              {toast.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
          requiresTarget={requiresTarget || !!pendingFork}
          targetIsFriendly={!pendingFork && (() => {
            const c = battleState?.player.hand.find((x) => x.instanceId === selectedCardId);
            return c?.card.effect?.target === 'self';
          })()}
          forkDmg={pendingFork?.dmg}
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

      {/* Combat log toggle button */}
      <button
        onClick={() => setShowLog((v) => !v)}
        style={{
          position: 'absolute',
          bottom: 58,
          right: 6,
          zIndex: 30,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          background: showLog ? 'rgba(0,240,255,0.15)' : 'rgba(10,10,30,0.85)',
          border: `1px solid ${showLog ? '#00f0ff' : '#223344'}`,
          color: showLog ? '#00f0ff' : '#445566',
          padding: '4px 8px',
          cursor: 'pointer',
          borderRadius: 2,
        }}
      >
        {showLog ? '✕ LOG' : '📋 LOG'}
      </button>

      {/* Graveyard toggle button */}
      <button
        onClick={() => setShowGraveyard(true)}
        style={{
          position: 'absolute',
          bottom: 58,
          right: 66,
          zIndex: 30,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: '0.12em',
          background: 'rgba(10,10,30,0.85)',
          border: '1px solid #223344',
          color: '#445566',
          padding: '4px 8px',
          cursor: 'pointer',
          borderRadius: 2,
        }}
      >
        ⚰ {(battleState?.player.discard.length ?? 0) + (battleState?.enemy.discard.length ?? 0)}
      </button>

      {/* Graveyard panel */}
      <AnimatePresence>
        {showGraveyard && battleState && (
          <GraveyardPanel
            playerDiscard={battleState.player.discard}
            enemyDiscard={battleState.enemy.discard}
            onClose={() => setShowGraveyard(false)}
          />
        )}
      </AnimatePresence>

      {/* Combat log panel */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            key="combat-log"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              top: 52,
              right: 0,
              bottom: 80,
              width: 230,
              zIndex: 25,
              background: 'rgba(4,4,18,0.96)',
              borderLeft: '1px solid rgba(0,240,255,0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Log header */}
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid rgba(0,240,255,0.12)',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 8,
              color: '#00f0ff',
              letterSpacing: '0.2em',
              flexShrink: 0,
            }}>
              COMBAT LOG
            </div>

            {/* Log entries — newest first */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}>
              {battleState.log.length === 0 ? (
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#334455', fontStyle: 'italic' }}>
                  No events yet.
                </p>
              ) : (
                [...battleState.log].reverse().map((entry, i) => {
                  const lower = entry.toLowerCase();
                  const color =
                    lower.includes('wins') || lower.includes('healed') ? '#44ff88'
                    : lower.includes('loses') || lower.includes('damage') || lower.includes('attacks') || lower.includes('takes') ? '#ff5566'
                    : lower.includes('trap') || lower.includes('detonat') ? '#ff8800'
                    : lower.includes('fatigue') ? '#ff8800'
                    : lower.includes('plays') || lower.includes('sets') || lower.includes('returns') ? '#00f0ff'
                    : lower.includes('forked') || lower.includes('drain') ? '#c850ff'
                    : '#6688aa';
                  return (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9,
                        color,
                        lineHeight: 1.4,
                        paddingBottom: 2,
                        borderBottom: i < battleState.log.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
