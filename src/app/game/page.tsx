'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useDeckStore } from '@/stores/deckStore';
import { CITY_HUB_MAP } from '@/data/cityHubMap';
import ExplorationView from '@/components/exploration/ExplorationView';
import BattleArena from '@/components/battle/BattleArena';
import DeckBuilder from '@/components/deckbuilder/DeckBuilder';
import Shop from '@/components/shop/Shop';
import CraftingPanel from '@/components/crafting/CraftingPanel';
import ZoneSelectScreen from '@/components/zone/ZoneSelectScreen';
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
type Screen = 'city_hub' | 'zone_select' | 'battle' | 'shop' | 'deckbuilder' | 'crafting';

export default function GamePage() {
  const router = useRouter();
  const { gameState, setScene, saveGame, markTutorialSeen, enterZone } = useGameStore();
  const { setCollection, setDeck } = useDeckStore();

  const [screen, setScreen]                         = useState<Screen>('city_hub');
  const [glitchShow, setGlitchShow]                 = useState(false);
  const [pendingBattle, setPendingBattle]           = useState<{ enemyId: string; profileId: string } | null>(null);
  const [showTutorial, setShowTutorial]             = useState(false);
  const [showDistrictVictory, setShowDistrictVictory] = useState(false);
  const [showSettings, setShowSettings]             = useState(false);
  const [lastBattleResult, setLastBattleResult]     = useState<'win' | 'lose' | null>(null);

  useEffect(() => {
    if (!gameState) router.replace('/');
  }, [gameState, router]);

  useEffect(() => {
    if (gameState) {
      setCollection(gameState.collection);
      setDeck(gameState.deck);
    }
  }, [gameState, setCollection, setDeck]);

  // ── Scene transitions ─────────────────────────────────────────────────────

  const handleBattleStart = useCallback((enemyId: string, profileId: string) => {
    if (screen === 'battle') return;
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

    if (result === 'win' && profileId === 'madame_flux') {
      setTimeout(() => {
        setScreen('city_hub');
        setScene('city_hub');
        setPendingBattle(null);
        saveGame();
        setShowDistrictVictory(true);
      }, 300);
    } else {
      setTimeout(() => {
        setScreen('city_hub');
        setScene('city_hub');
        setPendingBattle(null);
        saveGame();
      }, 300);
    }
  }, [setScene, saveGame, pendingBattle]);

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
    // Other terminal dialogues are handled inside ExplorationView
  }, []);

  const handleEnterZone = useCallback((level: number) => {
    enterZone(level);
    // Zone exploration will be implemented in FASE 3
    // For now, show a message and go back
    setScreen('city_hub');
    setScene('city_hub');
  }, [enterZone, setScene]);

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

      {/* District victory screen */}
      {showDistrictVictory && (
        <DistrictVictory
          districtName="Neon Row"
          onContinue={handleDistrictVictoryContinue}
        />
      )}

      {/* Settings button (city hub only) */}
      {screen === 'city_hub' && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
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
