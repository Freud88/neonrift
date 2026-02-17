'use client';

import { create } from 'zustand';
import type { GameState, GameScene, GameSettings } from '@/types/game';
import type { Card } from '@/types/card';
import { STARTER_DECK } from '@/data/cards';

const SAVE_KEY = 'neonrift_save';

const defaultSettings: GameSettings = {
  musicVolume: 70,
  sfxVolume: 80,
  animationSpeed: 'normal',
  language: 'en',
};

const defaultGameState: GameState = {
  player: {
    name: 'Drifter',
    health: 20,
    maxHealth: 20,
    credits: 100,
    xp: 0,
    level: 1,
    position: { x: 10, y: 5 },
    currentDistrict: 'neon_row',
  },
  deck: [],
  collection: [],
  progress: {
    defeatedBosses: [],
    unlockedDistricts: ['neon_row'],
    defeatedEnemies: [],
    totalWins: 0,
    totalLosses: 0,
    tutorialSeen: false,
  },
  settings: defaultSettings,
};

interface GameStoreState {
  gameState: GameState | null;
  currentScene: GameScene;
  hasSave: boolean;

  // Actions
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: () => void;
  setScene: (scene: GameScene) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  addToCollection: (card: Card) => void;
  defeatEnemy: (enemyId: string, credits: number, xp: number) => void;
  defeatBoss: (bossId: string) => void;
  updatePlayerPosition: (x: number, y: number) => void;
  takeDamage: (amount: number) => void;
  healPlayer: (amount: number) => void;
  incrementLoss: () => void;
  markTutorialSeen: () => void;
  checkHasSave: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  currentScene: 'title',
  hasSave: false,

  checkHasSave: () => {
    const raw = localStorage.getItem(SAVE_KEY);
    set({ hasSave: !!raw });
  },

  newGame: () => {
    const freshState: GameState = {
      ...defaultGameState,
      deck: [...STARTER_DECK],
      collection: [...STARTER_DECK],
    };
    set({ gameState: freshState, currentScene: 'exploration' });
    // Auto-save
    localStorage.setItem(SAVE_KEY, JSON.stringify(freshState));
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved: GameState = JSON.parse(raw);
      set({ gameState: saved, currentScene: 'exploration' });
      return true;
    } catch {
      return false;
    }
  },

  saveGame: () => {
    const { gameState } = get();
    if (!gameState) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    set({ hasSave: true });
  },

  setScene: (scene) => set({ currentScene: scene }),

  updateSettings: (settings) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          settings: { ...state.gameState.settings, ...settings },
        },
      };
    });
  },

  addCredits: (amount) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            credits: state.gameState.player.credits + amount,
          },
        },
      };
    });
  },

  spendCredits: (amount) => {
    const { gameState } = get();
    if (!gameState || gameState.player.credits < amount) return false;
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            credits: state.gameState.player.credits - amount,
          },
        },
      };
    });
    return true;
  },

  addToCollection: (card) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          collection: [...state.gameState.collection, card],
        },
      };
    });
  },

  defeatEnemy: (enemyId, credits, xp) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            credits: state.gameState.player.credits + credits,
            xp: state.gameState.player.xp + xp,
          },
          progress: {
            ...state.gameState.progress,
            defeatedEnemies: [...state.gameState.progress.defeatedEnemies, enemyId],
            totalWins: state.gameState.progress.totalWins + 1,
          },
        },
      };
    });
    get().saveGame();
  },

  defeatBoss: (bossId) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          progress: {
            ...state.gameState.progress,
            defeatedBosses: [...state.gameState.progress.defeatedBosses, bossId],
          },
        },
      };
    });
    get().saveGame();
  },

  updatePlayerPosition: (x, y) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          player: { ...state.gameState.player, position: { x, y } },
        },
      };
    });
  },

  takeDamage: (amount) => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            health: Math.max(0, state.gameState.player.health - amount),
          },
        },
      };
    });
  },

  healPlayer: (amount) => {
    set((state) => {
      if (!state.gameState) return state;
      const { health, maxHealth } = state.gameState.player;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            health: Math.min(maxHealth, health + amount),
          },
        },
      };
    });
  },

  markTutorialSeen: () => {
    set((state) => {
      if (!state.gameState) return state;
      return {
        gameState: {
          ...state.gameState,
          progress: { ...state.gameState.progress, tutorialSeen: true },
        },
      };
    });
  },

  incrementLoss: () => {
    set((state) => {
      if (!state.gameState) return state;
      const half = Math.floor(state.gameState.player.credits / 2);
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            credits: state.gameState.player.credits - half,
            health: state.gameState.player.maxHealth, // restore HP on loss
          },
          progress: {
            ...state.gameState.progress,
            totalLosses: state.gameState.progress.totalLosses + 1,
          },
        },
      };
    });
  },
}));
