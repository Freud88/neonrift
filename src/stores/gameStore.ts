'use client';

import { create } from 'zustand';
import type { GameState, GameScene, GameSettings, CraftingItemId } from '@/types/game';
import type { Card } from '@/types/card';
import type { ZoneState, ZoneConfig, BiomeId } from '@/types/zone';
import { STARTER_DECK } from '@/data/cards';

// ── Zone helpers ──────────────────────────────────────────────────────────────
const BIOME_ORDER: BiomeId[] = [
  'neon_streets', 'industrial_wasteland', 'data_swamp',
  'chrome_forest', 'void_sector', 'rusted_depths',
];

function buildZoneConfig(level: number): ZoneConfig {
  return {
    level,
    seed: `zone_${level}_${Date.now().toString(36)}`,
    biome: BIOME_ORDER[(level - 1) % BIOME_ORDER.length],
    shardsRequired: Math.min(15, 3 + Math.floor(level / 3)),
    enemyScaling: {
      atkMultiplier: 1 + (level - 1) * 0.15,
      defMultiplier: 1 + (level - 1) * 0.12,
      healthMultiplier: 1 + (level - 1) * 0.2,
      modCountMin: Math.min(Math.floor(level / 3), 5),
      modCountMax: Math.min(1 + Math.floor(level / 2), 6),
    },
    bossScaling: {
      atkMultiplier: 1.5 + (level - 1) * 0.2,
      defMultiplier: 1.5 + (level - 1) * 0.15,
      healthMultiplier: 1.5 + (level - 1) * 0.3,
      modCountMin: Math.min(1 + Math.floor(level / 2), 6),
      modCountMax: 6,
    },
  };
}

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
  inventory: [],
  progress: {
    defeatedBosses: [],
    unlockedDistricts: ['neon_row'],
    defeatedEnemies: [],
    totalWins: 0,
    totalLosses: 0,
    tutorialSeen: false,
    maxZoneLevel: 1,
    zonesCompleted: 0,
  },
  settings: defaultSettings,
};

interface GameStoreState {
  gameState: GameState | null;
  currentScene: GameScene;
  hasSave: boolean;
  activeZone: ZoneState | null;

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
  addCraftingItem: (itemId: CraftingItemId, qty?: number) => void;
  removeCraftingItem: (itemId: CraftingItemId, qty?: number) => boolean;

  // Zone actions
  enterZone: (level: number) => void;
  exitZone: () => void;
  collectShard: (count?: number) => void;
  forgeGridKey: () => boolean;
  markZoneEnemyDefeated: (key: string) => void;
  markZoneCacheLooted: (key: string) => void;
  defeatZoneBoss: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  currentScene: 'title',
  hasSave: false,
  activeZone: null,

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
    set({ gameState: freshState, activeZone: null, currentScene: 'city_hub' });
    // Auto-save
    localStorage.setItem(SAVE_KEY, JSON.stringify(freshState));
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved: GameState = JSON.parse(raw);
      // Ensure new progress fields exist in old saves
      if (saved.progress && saved.progress.maxZoneLevel === undefined) {
        saved.progress.maxZoneLevel = 1;
        saved.progress.zonesCompleted = 0;
      }
      set({ gameState: saved, activeZone: null, currentScene: 'city_hub' });
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
    get().saveGame();
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

  addCraftingItem: (itemId, qty = 1) => {
    set((state) => {
      if (!state.gameState) return state;
      const inv = [...(state.gameState.inventory ?? [])];
      const existing = inv.find((i) => i.id === itemId);
      if (existing) {
        existing.quantity += qty;
      } else {
        inv.push({ id: itemId, quantity: qty });
      }
      return { gameState: { ...state.gameState, inventory: inv } };
    });
    get().saveGame();
  },

  removeCraftingItem: (itemId, qty = 1) => {
    const { gameState } = get();
    if (!gameState) return false;
    const item = (gameState.inventory ?? []).find((i) => i.id === itemId);
    if (!item || item.quantity < qty) return false;
    set((state) => {
      if (!state.gameState) return state;
      const inv = (state.gameState.inventory ?? [])
        .map((i) => i.id === itemId ? { ...i, quantity: i.quantity - qty } : i)
        .filter((i) => i.quantity > 0);
      return { gameState: { ...state.gameState, inventory: inv } };
    });
    get().saveGame();
    return true;
  },

  // ── Zone actions ────────────────────────────────────────────────────────────

  enterZone: (level) => {
    const config = buildZoneConfig(level);
    const zone: ZoneState = {
      config,
      shardsCollected: 0,
      gridKeyForged: false,
      bossSpawned: false,
      bossDefeated: false,
      defeatedEnemyKeys: [],
      lootedCacheKeys: [],
    };
    set({ activeZone: zone, currentScene: 'zone' });
  },

  exitZone: () => {
    set({ activeZone: null, currentScene: 'city_hub' });
    get().saveGame();
  },

  collectShard: (count = 1) => {
    set((state) => {
      if (!state.activeZone) return state;
      return {
        activeZone: {
          ...state.activeZone,
          shardsCollected: state.activeZone.shardsCollected + count,
        },
      };
    });
  },

  forgeGridKey: () => {
    const { activeZone } = get();
    if (!activeZone) return false;
    if (activeZone.shardsCollected < activeZone.config.shardsRequired) return false;
    set({
      activeZone: {
        ...activeZone,
        gridKeyForged: true,
        bossSpawned: true,
      },
    });
    return true;
  },

  markZoneEnemyDefeated: (key) => {
    set((state) => {
      if (!state.activeZone) return state;
      return {
        activeZone: {
          ...state.activeZone,
          defeatedEnemyKeys: [...state.activeZone.defeatedEnemyKeys, key],
        },
      };
    });
  },

  markZoneCacheLooted: (key) => {
    set((state) => {
      if (!state.activeZone) return state;
      return {
        activeZone: {
          ...state.activeZone,
          lootedCacheKeys: [...state.activeZone.lootedCacheKeys, key],
        },
      };
    });
  },

  defeatZoneBoss: () => {
    set((state) => {
      if (!state.activeZone || !state.gameState) return state;
      const newMaxLevel = Math.max(
        state.gameState.progress.maxZoneLevel,
        state.activeZone.config.level + 1,
      );
      return {
        activeZone: { ...state.activeZone, bossDefeated: true },
        gameState: {
          ...state.gameState,
          progress: {
            ...state.gameState.progress,
            maxZoneLevel: newMaxLevel,
            zonesCompleted: state.gameState.progress.zonesCompleted + 1,
          },
        },
      };
    });
    get().saveGame();
  },
}));
