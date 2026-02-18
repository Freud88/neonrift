'use client';

import { create } from 'zustand';
import { BattleEngine, type BattleState, type AttackEvent } from '@/engine/BattleEngine';
import { AIEngine } from '@/engine/AIEngine';
import { ENEMIES } from '@/data/enemies';
import { CARD_MAP } from '@/data/cards';
import { applyModStats } from '@/utils/cardMods';
import type { EnemyProfile } from '@/types/enemy';
import type { Card, CardInPlay } from '@/types/card';
import type { AIType } from '@/types/enemy';

interface DamageNumber {
  id: string;
  value: number;
  target: 'player' | 'enemy';
  x?: number;
  y?: number;
}

interface BattleStoreState {
  engine: BattleEngine | null;
  ai: AIEngine | null;
  battleState: BattleState | null;
  enemyProfileId: string;
  lastEvents: AttackEvent[];
  damageNumbers: DamageNumber[];
  selectedCardId: string | null;     // card highlighted in hand
  pendingAttackerId: string | null;  // player agent selected to attack (waiting for target)
  isAnimating: boolean;
  pendingEnemyCard: CardInPlay | null;   // card enemy just played — waiting for player ack

  // Actions
  startBattle: (playerDeck: Card[], enemyProfileId: string, overrideProfile?: EnemyProfile, decayStage?: number) => void;
  doMulligan: () => void;
  acceptHand: () => void;
  selectCard: (instanceId: string | null) => void;
  playCard: (instanceId: string, targetId?: string) => boolean;
  resolveFork: (targetId: string) => void;
  /** Select a player agent as the attacker (first click) */
  selectAttacker: (instanceId: string | null) => void;
  /** Attack a specific enemy agent with the selected attacker */
  attackVsAgent: (targetInstanceId: string) => Promise<void>;
  /** Attack the enemy player directly with the selected attacker */
  attackVsPlayer: () => Promise<void>;
  // Legacy
  declareAttacker: (instanceId: string) => void;
  confirmAttack: () => Promise<void>;
  endPlayerTurn: () => Promise<void>;
  acknowledgeEnemyCard: () => void;
  clearBattle: () => void;
  sync: () => void;
}

export const useBattleStore = create<BattleStoreState>((set, get) => ({
  engine: null,
  ai: null,
  battleState: null,
  enemyProfileId: '',
  lastEvents: [],
  damageNumbers: [],
  selectedCardId: null,
  pendingAttackerId: null,
  isAnimating: false,
  pendingEnemyCard: null,

  startBattle: (playerDeck, enemyProfileId, overrideProfile, decayStage = 0) => {
    const profile = overrideProfile ?? ENEMIES[enemyProfileId];
    if (!profile) return;

    const enemyCards = profile.deck
      .map((id) => CARD_MAP[id])
      .filter(Boolean) as Card[];

    // Re-bake mod stats at battle start so all cards (including old saves) have
    // correct cost/atk/def/effect.value regardless of when they were crafted.
    const bakedDeck = playerDeck.map((card) => {
      if (!card.mods?.mods.length) return card;
      const base = CARD_MAP[card.id] ?? card;
      return { ...base, ...applyModStats(base, card.mods.mods), mods: card.mods, uniqueId: card.uniqueId, artIndex: card.artIndex };
    });

    const engine = new BattleEngine(bakedDeck, enemyCards, enemyProfileId, profile.health, decayStage);
    const ai     = new AIEngine(engine, profile.aiType as AIType);

    set({
      engine,
      ai,
      battleState: engine.getState(),
      enemyProfileId,
      lastEvents: [],
      damageNumbers: [],
      selectedCardId: null,
      isAnimating: false,
    });
  },

  doMulligan: () => {
    const { engine } = get();
    if (!engine) return;
    engine.doMulligan();
    set({ battleState: { ...engine.getState() } });
  },

  acceptHand: () => {
    const { engine } = get();
    if (!engine) return;
    engine.acceptHand();
    set({ battleState: { ...engine.getState() } });
  },

  selectCard: (instanceId) => set({ selectedCardId: instanceId }),

  playCard: (instanceId, targetId) => {
    const { engine } = get();
    if (!engine) return false;
    const ok = engine.playCard('player', instanceId, targetId);
    if (ok) {
      set({
        battleState: { ...engine.getState() },
        selectedCardId: null,
      });
    }
    return ok;
  },

  resolveFork: (targetId) => {
    const { engine } = get();
    if (!engine) return;
    engine.resolveFork(targetId);
    set({ battleState: { ...engine.getState() } });
  },

  selectAttacker: (instanceId) => {
    const { engine } = get();
    if (!engine || !instanceId) { set({ pendingAttackerId: null }); return; }
    // Verify agent can attack
    if (engine.canAttack(instanceId)) {
      set({ pendingAttackerId: instanceId });
    } else {
      set({ pendingAttackerId: null });
    }
  },

  attackVsAgent: async (targetInstanceId) => {
    const { engine, pendingAttackerId } = get();
    if (!engine || !pendingAttackerId) return;
    set({ isAnimating: true });

    const event = engine.attackAgentVsAgent(pendingAttackerId, targetInstanceId);
    const events = event ? [event] : [];
    set({ battleState: { ...engine.getState() }, lastEvents: events, pendingAttackerId: null });

    await _delay(600);
    set({ isAnimating: false, lastEvents: [] });
  },

  attackVsPlayer: async () => {
    const { engine, pendingAttackerId } = get();
    if (!engine || !pendingAttackerId) return;
    set({ isAnimating: true });

    const event = engine.attackAgentVsPlayer(pendingAttackerId);
    const events = event ? [event] : [];
    set({ battleState: { ...engine.getState() }, lastEvents: events, pendingAttackerId: null });

    await _delay(600);
    set({ isAnimating: false, lastEvents: [] });
  },

  declareAttacker: (instanceId) => {
    const { engine } = get();
    if (!engine) return;
    engine.declareAttacker(instanceId);
    set({ battleState: { ...engine.getState() } });
  },

  confirmAttack: async () => {
    const { engine } = get();
    if (!engine) return;
    set({ isAnimating: true });

    const { events } = engine.resolveAttacks();
    set({ battleState: { ...engine.getState() }, lastEvents: events });

    await _delay(600);
    set({ isAnimating: false, lastEvents: [] });
  },

  endPlayerTurn: async () => {
    const { engine, ai } = get();
    if (!engine || !ai) return;

    set({ isAnimating: true });
    engine.endPlayerTurn();
    set({ battleState: { ...engine.getState() } });

    await _delay(300);

    // Run enemy AI card-by-card, pausing for player acknowledgement on each card
    if (engine.getState().result === 'pending') {
      const actions = ai.planEnemyTurn();

      for (const action of actions) {
        if (engine.getState().result !== 'pending') break;

        // Capture the card before playing it (for the overlay)
        const cardInHand = engine.getState().enemy.hand.find(
          (c) => c.instanceId === action.instanceId
        );

        engine.playCard('enemy', action.instanceId, action.targetId);
        set({ battleState: { ...engine.getState() } });

        if (cardInHand) {
          // Show notification — wait for player to acknowledge
          set({ pendingEnemyCard: cardInHand });
          await _waitForAck(get);
          set({ pendingEnemyCard: null });
        }

        await _delay(200);
      }

      // Enemy attack phase
      if (engine.getState().result === 'pending') {
        engine.resolveEnemyAttacks();
        set({ battleState: { ...engine.getState() } });
        await _delay(600);
      }
    }

    if (engine.getState().result === 'pending') {
      engine.endEnemyTurn();
      set({ battleState: { ...engine.getState() } });
    }

    set({ isAnimating: false });
  },

  acknowledgeEnemyCard: () => {
    set({ pendingEnemyCard: null });
  },

  sync: () => {
    const { engine } = get();
    if (engine) set({ battleState: { ...engine.getState() } });
  },

  clearBattle: () =>
    set({
      engine: null,
      ai: null,
      battleState: null,
      enemyProfileId: '',
      lastEvents: [],
      damageNumbers: [],
      selectedCardId: null,
      pendingAttackerId: null,
      isAnimating: false,
      pendingEnemyCard: null,
    }),
}));

function _delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Poll until pendingEnemyCard is cleared (player acknowledged the card)
function _waitForAck(get: () => BattleStoreState): Promise<void> {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (!get().pendingEnemyCard) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}
