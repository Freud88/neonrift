'use client';

import { create } from 'zustand';
import { BattleEngine, type BattleState, type AttackEvent } from '@/engine/BattleEngine';
import { AIEngine } from '@/engine/AIEngine';
import { ENEMIES } from '@/data/enemies';
import { CARD_MAP } from '@/data/cards';
import type { Card } from '@/types/card';
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
  selectedCardId: string | null;   // card highlighted in hand
  isAnimating: boolean;

  // Actions
  startBattle: (playerDeck: Card[], enemyProfileId: string) => void;
  doMulligan: () => void;
  acceptHand: () => void;
  selectCard: (instanceId: string | null) => void;
  playCard: (instanceId: string, targetId?: string) => boolean;
  declareAttacker: (instanceId: string) => void;
  confirmAttack: () => Promise<void>;
  endPlayerTurn: () => Promise<void>;
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
  isAnimating: false,

  startBattle: (playerDeck, enemyProfileId) => {
    const profile = ENEMIES[enemyProfileId];
    if (!profile) return;

    const enemyCards = profile.deck
      .map((id) => CARD_MAP[id])
      .filter(Boolean) as Card[];

    const engine = new BattleEngine(playerDeck, enemyCards, enemyProfileId, profile.health);
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

    // Run enemy AI
    if (engine.getState().result === 'pending') {
      ai.runEnemyTurn();
      set({ battleState: { ...engine.getState() } });
      await _delay(800);
    }

    if (engine.getState().result === 'pending') {
      engine.endEnemyTurn();
      set({ battleState: { ...engine.getState() } });
    }

    set({ isAnimating: false });
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
      isAnimating: false,
    }),
}));

function _delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
