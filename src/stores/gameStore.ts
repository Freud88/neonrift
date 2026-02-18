'use client';

import { create } from 'zustand';
import type { GameState, GameScene, GameSettings, CraftingItemId, RiftEssence } from '@/types/game';
import type { Card } from '@/types/card';
import type { ZoneState, ZoneConfig, BiomeId } from '@/types/zone';
import type { SkillTreeId, PlayerSkills } from '@/types/skills';
import { STARTER_DECK } from '@/data/cards';
import { migrateOldTier } from '@/utils/tierUtils';
import { generateRiftName } from '@/utils/riftNameGenerator';

// ── XP / Level helpers ────────────────────────────────────────────────────────
/** XP needed to reach level N (cumulative). Level 1 = 0 XP. */
function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.floor(100 * Math.pow(level - 1, 1.4));
}

/** Compute the player level from total XP earned. */
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
}

// ── Zone helpers ──────────────────────────────────────────────────────────────
const BIOME_ORDER: BiomeId[] = [
  'neon_streets', 'industrial_wasteland', 'data_swamp',
  'chrome_forest', 'void_sector', 'rusted_depths',
];

function buildZoneConfig(level: number): ZoneConfig {
  // Early levels (1-5) use gentler scaling so the starter deck can survive
  const earlyMult = level <= 5 ? 0.5 + level * 0.1 : 1; // 0.6, 0.7, 0.8, 0.9, 1.0
  const seed = `zone_${level}_${Date.now().toString(36)}`;
  const biome = BIOME_ORDER[(level - 1) % BIOME_ORDER.length];
  return {
    level,
    seed,
    biome,
    riftName: generateRiftName(seed, biome),
    shardsRequired: level <= 2 ? 2 : Math.min(15, 3 + Math.floor(level / 3)),
    enemyScaling: {
      atkMultiplier: earlyMult * (1 + (level - 1) * 0.15),
      defMultiplier: earlyMult * (1 + (level - 1) * 0.12),
      healthMultiplier: earlyMult * (1 + (level - 1) * 0.2),
      modCountMin: level <= 4 ? 0 : Math.min(Math.floor(level / 3), 5),
      modCountMax: level <= 2 ? 0 : level <= 4 ? 1 : Math.min(1 + Math.floor(level / 2), 6),
    },
    bossScaling: {
      atkMultiplier: (level <= 3 ? 1.0 : 1.5) + (level - 1) * 0.2,
      defMultiplier: (level <= 3 ? 1.0 : 1.5) + (level - 1) * 0.15,
      healthMultiplier: (level <= 3 ? 1.0 : 1.5) + (level - 1) * 0.3,
      modCountMin: level <= 2 ? 0 : Math.min(1 + Math.floor(level / 2), 6),
      modCountMax: level <= 2 ? 1 : 6,
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
  skills: { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } },
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

  // Skill actions
  allocateSkillPoint: (tree: SkillTreeId) => boolean;
  getSkillLevel: (tree: SkillTreeId) => number;
  hasSkill: (tree: SkillTreeId, minLevel: number) => boolean;

  // Rift Essence actions
  addRiftEssence: (essence: RiftEssence) => void;
  applyRiftEssence: (essenceIdx: number, cardIdx: number) => boolean;

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
      // Ensure skills exist in old saves
      if (!saved.skills) {
        saved.skills = { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } };
      }
      // Migrate old 3-tier mods to 10-tier system
      if (!saved._tierVersion || saved._tierVersion < 2) {
        const migrateCardTiers = (card: Card): Card => {
          if (!card.mods?.mods?.length) return card;
          const migratedMods = card.mods.mods.map((m) => ({
            ...m,
            tier: migrateOldTier(m.tier),
          }));
          return { ...card, mods: { ...card.mods, mods: migratedMods } };
        };
        saved.deck = saved.deck.map(migrateCardTiers);
        saved.collection = saved.collection.map(migrateCardTiers);
        saved._tierVersion = 2;
        // Re-save with migrated tiers
        localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
      }
      // Restore active zone if one was in progress
      let restoredZone = null;
      try {
        const zoneRaw = localStorage.getItem(SAVE_KEY + '_zone');
        if (zoneRaw) restoredZone = JSON.parse(zoneRaw);
      } catch { /* ignore */ }
      set({
        gameState: saved,
        activeZone: restoredZone,
        currentScene: restoredZone ? 'zone' : 'city_hub',
      });
      return true;
    } catch {
      return false;
    }
  },

  saveGame: () => {
    const { gameState, activeZone } = get();
    if (!gameState) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    // Persist active zone separately (so player can resume a zone run)
    if (activeZone) {
      localStorage.setItem(SAVE_KEY + '_zone', JSON.stringify(activeZone));
    } else {
      localStorage.removeItem(SAVE_KEY + '_zone');
    }
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
      const oldLevel = state.gameState.player.level;
      const newXp = state.gameState.player.xp + xp;
      const newLevel = levelFromXp(newXp);
      const levelsGained = newLevel - oldLevel;
      const skills = state.gameState.skills ?? { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } };
      const updatedSkills: PlayerSkills = levelsGained > 0
        ? { ...skills, skillPoints: skills.skillPoints + levelsGained }
        : skills;
      return {
        gameState: {
          ...state.gameState,
          player: {
            ...state.gameState.player,
            credits: state.gameState.player.credits + credits,
            xp: newXp,
            level: newLevel,
          },
          skills: updatedSkills,
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

  // ── Skill actions ───────────────────────────────────────────────────────────

  allocateSkillPoint: (tree) => {
    const { gameState } = get();
    if (!gameState) return false;
    const skills = gameState.skills ?? { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } };
    if (skills.skillPoints <= 0 || skills.trees[tree] >= 10) return false;
    set((state) => {
      if (!state.gameState) return state;
      const s = state.gameState.skills ?? { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } };
      return {
        gameState: {
          ...state.gameState,
          skills: {
            skillPoints: s.skillPoints - 1,
            trees: { ...s.trees, [tree]: s.trees[tree] + 1 },
          },
        },
      };
    });
    get().saveGame();
    return true;
  },

  getSkillLevel: (tree) => {
    const { gameState } = get();
    return gameState?.skills?.trees[tree] ?? 0;
  },

  hasSkill: (tree, minLevel) => {
    const { gameState } = get();
    return (gameState?.skills?.trees[tree] ?? 0) >= minLevel;
  },

  // ── Rift Essence actions ────────────────────────────────────────────────────

  addRiftEssence: (essence) => {
    set((state) => {
      if (!state.gameState) return state;
      const essences = [...(state.gameState.riftEssences ?? []), essence];
      return { gameState: { ...state.gameState, riftEssences: essences } };
    });
    get().saveGame();
  },

  applyRiftEssence: (essenceIdx, cardIdx) => {
    const { gameState } = get();
    if (!gameState) return false;
    const essences = gameState.riftEssences ?? [];
    if (essenceIdx < 0 || essenceIdx >= essences.length) return false;
    const card = gameState.collection[cardIdx];
    if (!card || (card.type !== 'script' && card.type !== 'malware' && card.type !== 'trap')) return false;

    const essence = essences[essenceIdx];
    set((state) => {
      if (!state.gameState) return state;
      const newCollection = [...state.gameState.collection];
      const target = { ...newCollection[cardIdx] };
      target.mods = {
        ...(target.mods ?? { mods: [], modRarity: 'common' as const, displayName: target.name, locked: [] }),
        riftAbility: { abilityId: essence.abilityId, tier: essence.tier },
      };
      newCollection[cardIdx] = target;
      // Also update deck if the card is there
      const newDeck = state.gameState.deck.map((d) =>
        (d.uniqueId ?? d.id) === (target.uniqueId ?? target.id) ? target : d
      );
      const newEssences = [...(state.gameState.riftEssences ?? [])];
      newEssences.splice(essenceIdx, 1);
      return {
        gameState: {
          ...state.gameState,
          collection: newCollection,
          deck: newDeck,
          riftEssences: newEssences,
        },
      };
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
      riftClock: { elapsedMs: 0, currentStage: 0 },
      activeCorruptions: [],
    };
    set({ activeZone: zone, currentScene: 'zone' });
  },

  exitZone: () => {
    // Clear temporary tier degradation from all cards
    set((state) => {
      if (!state.gameState) return { activeZone: null, currentScene: 'city_hub' as const };
      const cleanCard = (c: Card): Card => {
        if (!c.mods?.tierDegradation) return c;
        const { tierDegradation: _, ...cleanMods } = c.mods;
        return { ...c, mods: cleanMods as Card['mods'] };
      };
      return {
        activeZone: null,
        currentScene: 'city_hub' as const,
        gameState: {
          ...state.gameState,
          deck: state.gameState.deck.map(cleanCard),
          collection: state.gameState.collection.map(cleanCard),
        },
      };
    });
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
