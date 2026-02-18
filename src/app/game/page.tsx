'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useDeckStore } from '@/stores/deckStore';
import { CITY_HUB_MAP } from '@/data/cityHubMap';
import { generateEnemyProfile } from '@/engine/EnemyGenerator';
import type { EnemyProfile } from '@/types/enemy';
import ExplorationView from '@/components/exploration/ExplorationView';
import ZoneExplorationView from '@/components/zone/ZoneExplorationView';
import BattleArena from '@/components/battle/BattleArena';
import DeckBuilder from '@/components/deckbuilder/DeckBuilder';
import Shop from '@/components/shop/Shop';
import CraftingPanel from '@/components/crafting/CraftingPanel';
import ZoneSelectScreen from '@/components/zone/ZoneSelectScreen';
import ZoneVictoryScreen from '@/components/zone/ZoneVictoryScreen';
import LootCachePopup from '@/components/zone/LootCachePopup';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import DistrictVictory from '@/components/ui/DistrictVictory';
import SettingsModal from '@/components/ui/SettingsModal';

// ── Glitch transition overlay ─────────────────────────────────────────────────
function GlitchTransition({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 100 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-0 right-0"
              style={{
                height: `${8 + i * 3}%`,
                top: `${i * 16}%`,
                background: i % 2 === 0 ? '#00f0ff' : '#ff00aa',
                opacity: 0.12,
              }}
              animate={{ x: [0, -8, 8, -4, 0], opacity: [0.12, 0.28, 0.08, 0.22, 0] }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <p
              className="font-display text-xl tracking-widest"
              style={{ color: '#00f0ff', textShadow: '0 0 20px #00f0ff' }}
            >
              INITIATING DUEL...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Screen =
  | 'city_hub'
  | 'zone_select'
  | 'zone_exploration'
  | 'battle'
  | 'shop'
  | 'deckbuilder'
  | 'crafting';

export default function GamePage() {
  const router = useRouter();
  const {
    gameState, activeZone, setScene, saveGame, markTutorialSeen,
    enterZone, exitZone, collectShard, forgeGridKey, defeatZoneBoss,
    markZoneEnemyDefeated, markZoneCacheLooted, addCredits,
  } = useGameStore();
  const { setCollection, setDeck } = useDeckStore();

  const [screen, setScreen]                         = useState<Screen>('city_hub');
  const [glitchShow, setGlitchShow]                 = useState(false);
  const [pendingBattle, setPendingBattle]           = useState<{ enemyId: string; profileId: string } | null>(null);
  const [returnScreen, setReturnScreen]             = useState<Screen>('city_hub');
  const [showTutorial, setShowTutorial]             = useState(false);
  const [showDistrictVictory, setShowDistrictVictory] = useState(false);
  const [showSettings, setShowSettings]             = useState(false);
  const [lastBattleResult, setLastBattleResult]     = useState<'win' | 'lose' | null>(null);
  // Zone battle context
  const [zoneBattleKey, setZoneBattleKey]           = useState<string | null>(null);
  const [zoneBattleProfile, setZoneBattleProfile]   = useState<EnemyProfile | null>(null);
  const [isBossBattle, setIsBossBattle]             = useState(false);
  const [showZoneVictory, setShowZoneVictory]       = useState(false);
  const [defeatedBossName, setDefeatedBossName]     = useState('');
  const [lootPopup, setLootPopup]                   = useState<{ credits: number; shards: number } | null>(null);

  useEffect(() => {
    if (!gameState) router.replace('/');
  }, [gameState, router]);

  // Restore zone exploration screen if an active zone was loaded
  useEffect(() => {
    if (activeZone && screen === 'city_hub') {
      setScreen('zone_exploration');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gameState) {
      setCollection(gameState.collection);
      setDeck(gameState.deck);
    }
  }, [gameState, setCollection, setDeck]);

  // ── Scene transitions ─────────────────────────────────────────────────────

  const handleBattleStart = useCallback((enemyId: string, profileId: string) => {
    if (screen === 'battle') return;
    setReturnScreen(screen as Screen);
    setPendingBattle({ enemyId, profileId });
    setGlitchShow(true);
    setTimeout(() => {
      setGlitchShow(false);
      setScreen('battle');
      setScene('battle');

      const freshState = useGameStore.getState().gameState;
      if (freshState && !freshState.progress.tutorialSeen) {
        setShowTutorial(true);
      }
    }, 700);
  }, [screen, setScene]);

  const handleBattleEnd = useCallback((result: 'win' | 'lose') => {
    const profileId = pendingBattle?.profileId ?? '';
    setLastBattleResult(result);

    // Zone boss battle win
    if (isBossBattle && result === 'win') {
      const bossName = zoneBattleProfile?.name ?? 'Zone Boss';
      defeatZoneBoss();
      setTimeout(() => {
        setDefeatedBossName(bossName);
        setShowZoneVictory(true);
        setScreen('city_hub');
        setScene('city_hub');
        setPendingBattle(null);
        setZoneBattleKey(null);
        setZoneBattleProfile(null);
        setIsBossBattle(false);
        saveGame();
      }, 300);
      return;
    }

    // Zone regular enemy — mark defeated and collect shards
    if (zoneBattleKey && result === 'win') {
      markZoneEnemyDefeated(zoneBattleKey);
      if (Math.random() < 0.15) {
        collectShard(1);
      }
    }

    if (result === 'win' && profileId === 'madame_flux') {
      setTimeout(() => {
        setScreen('city_hub');
        setScene('city_hub');
        setPendingBattle(null);
        setZoneBattleKey(null);
        setZoneBattleProfile(null);
        setIsBossBattle(false);
        saveGame();
        setShowDistrictVictory(true);
      }, 300);
    } else {
      // Dying in a zone = zone failed, return to hub
      const wasInZone = !!(zoneBattleKey || isBossBattle);
      if (wasInZone && result === 'lose') {
        exitZone();
      }
      const back = wasInZone && result === 'lose' ? 'city_hub' : (zoneBattleKey || isBossBattle) ? 'zone_exploration' : 'city_hub';
      setTimeout(() => {
        setScreen(back);
        setScene(back === 'zone_exploration' ? 'zone' : 'city_hub');
        setPendingBattle(null);
        setZoneBattleKey(null);
        setZoneBattleProfile(null);
        setIsBossBattle(false);
        saveGame();
      }, 300);
    }
  }, [setScene, saveGame, pendingBattle, zoneBattleKey, zoneBattleProfile, isBossBattle, markZoneEnemyDefeated, collectShard, defeatZoneBoss, exitZone]);

  const handleBackToHub = useCallback(() => {
    setScreen('city_hub');
    setScene('city_hub');
    setPendingBattle(null);
  }, [setScene]);

  const handleTerminalAction = useCallback((dialogueId: string) => {
    if (dialogueId === 'zone_portal') {
      setScreen('zone_select');
      return;
    }
  }, []);

  const handleEnterZone = useCallback((level: number) => {
    enterZone(level);
    setScreen('zone_exploration');
    setScene('zone');
  }, [enterZone, setScene]);

  const handleExitZone = useCallback(() => {
    exitZone();
    setScreen('city_hub');
    setScene('city_hub');
  }, [exitZone, setScene]);

  const handleZoneEnemyBattle = useCallback((enemyKey: string, profileSeed: string) => {
    const zone = useGameStore.getState().activeZone;
    if (!zone) return;
    setZoneBattleKey(enemyKey);
    const profile = generateEnemyProfile(profileSeed, zone.config, false);
    setZoneBattleProfile(profile);
    handleBattleStart(`zone_enemy_${enemyKey}`, profile.id);
  }, [handleBattleStart]);

  const handleZoneBossBattle = useCallback(() => {
    const zone = useGameStore.getState().activeZone;
    if (!zone) return;
    const bossSeed = `${zone.config.seed}_boss`;
    const profile = generateEnemyProfile(bossSeed, zone.config, true);
    setIsBossBattle(true);
    setZoneBattleProfile(profile);
    handleBattleStart('zone_boss', profile.id);
  }, [handleBattleStart]);

  const handleZoneCacheLoot = useCallback((cacheKey: string, _cacheSeed: string) => {
    markZoneCacheLooted(cacheKey);
    const creditReward = 10 + Math.floor(Math.random() * 20);
    const shardReward = 1;
    collectShard(shardReward);
    addCredits(creditReward);
    setLootPopup({ credits: creditReward, shards: shardReward });
  }, [markZoneCacheLooted, collectShard, addCredits]);

  const handleForgeKey = useCallback(() => {
    forgeGridKey();
  }, [forgeGridKey]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen();
    try {
      const raw = localStorage.getItem('neonrift_save');
      if (raw) {
        const save = JSON.parse(raw);
        save.progress = { ...save.progress, tutorialSeen: true };
        localStorage.setItem('neonrift_save', JSON.stringify(save));
      }
    } catch { /* ignore */ }
  }, [markTutorialSeen]);

  const handleDistrictVictoryContinue = useCallback(() => {
    setShowDistrictVictory(false);
  }, []);

  const handleZoneVictoryContinue = useCallback(() => {
    setShowZoneVictory(false);
    exitZone();
  }, [exitZone]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono" style={{ background: '#0a0a0f', color: '#6666aa' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>

      {/* City Hub — always mounted, hidden during overlays */}
      <div
        className="absolute inset-0"
        style={{ visibility: screen === 'city_hub' ? 'visible' : 'hidden' }}
      >
        <ExplorationView
          mapData={CITY_HUB_MAP}
          onBattleStart={handleBattleStart}
          onShopOpen={() => { setScreen('shop'); setScene('shop'); }}
          onDeckOpen={() => { setScreen('deckbuilder'); setScene('deckbuilder'); }}
          onCraftingOpen={() => setScreen('crafting')}
          onTerminalAction={handleTerminalAction}
          isActive={screen === 'city_hub'}
          lastBattleResult={lastBattleResult}
        />
      </div>

      {/* Zone Exploration */}
      {screen === 'zone_exploration' && activeZone && (
        <div className="absolute inset-0" style={{ zIndex: 15 }}>
          <ZoneExplorationView
            zoneConfig={activeZone.config}
            zoneState={activeZone}
            onEnemyBattle={handleZoneEnemyBattle}
            onCacheLoot={handleZoneCacheLoot}
            onBossBattle={handleZoneBossBattle}
            onExit={handleExitZone}
            onForgeKey={handleForgeKey}
            isActive={screen === 'zone_exploration'}
          />
        </div>
      )}

      {/* Zone Select */}
      {screen === 'zone_select' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <ZoneSelectScreen
            maxLevel={gameState.progress.maxZoneLevel}
            onEnterZone={handleEnterZone}
            onBack={handleBackToHub}
          />
        </div>
      )}

      {/* Battle */}
      {screen === 'battle' && pendingBattle && (
        <div className="absolute inset-0" style={{ zIndex: 20 }}>
          <BattleArena
            enemyId={pendingBattle.enemyId}
            enemyProfileId={pendingBattle.profileId}
            enemyProfile={zoneBattleProfile ?? undefined}
            onBattleEnd={handleBattleEnd}
          />
        </div>
      )}

      {/* Shop */}
      {screen === 'shop' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <Shop onClose={handleBackToHub} />
        </div>
      )}

      {/* Deck Builder */}
      {screen === 'deckbuilder' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <DeckBuilder onClose={handleBackToHub} />
        </div>
      )}

      {/* Crafting Panel */}
      {screen === 'crafting' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <CraftingPanel onClose={handleBackToHub} />
        </div>
      )}

      {/* Glitch transition */}
      <GlitchTransition show={glitchShow} />

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay onDone={handleTutorialDone} />
      )}

      {/* Loot cache popup */}
      <AnimatePresence>
        {lootPopup && (
          <LootCachePopup
            credits={lootPopup.credits}
            shards={lootPopup.shards}
            onClose={() => setLootPopup(null)}
          />
        )}
      </AnimatePresence>

      {/* Zone victory screen */}
      {showZoneVictory && activeZone && (
        <ZoneVictoryScreen
          zoneLevel={activeZone.config.level}
          bossName={defeatedBossName}
          onContinue={handleZoneVictoryContinue}
        />
      )}

      {/* District victory screen */}
      {showDistrictVictory && (
        <DistrictVictory
          districtName="Neon Row"
          onContinue={handleDistrictVictoryContinue}
        />
      )}

      {/* Settings button (city hub / zone) */}
      {(screen === 'city_hub' || screen === 'zone_exploration') && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'fixed',
            top: 12,
            right: screen === 'zone_exploration' ? 160 : 12,
            zIndex: 50,
            background: 'rgba(5,5,20,0.8)',
            border: '1px solid rgba(0,240,255,0.25)',
            color: 'rgba(0,240,255,0.6)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            padding: '5px 10px',
            cursor: 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          ⚙ MENU
        </button>
      )}

      {/* Settings modal */}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
