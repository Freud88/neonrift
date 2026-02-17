'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { useDeckStore } from '@/stores/deckStore';
import ExplorationView from '@/components/exploration/ExplorationView';
import BattleArena from '@/components/battle/BattleArena';
import DeckBuilder from '@/components/deckbuilder/DeckBuilder';
import Shop from '@/components/shop/Shop';
import CraftingPanel from '@/components/crafting/CraftingPanel';
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
type Screen = 'exploration' | 'battle' | 'shop' | 'deckbuilder' | 'crafting';

export default function GamePage() {
  const router = useRouter();
  const { gameState, setScene, saveGame, markTutorialSeen, defeatBoss } = useGameStore();
  const { setCollection, setDeck } = useDeckStore();

  const [screen, setScreen]                         = useState<Screen>('exploration');
  const [glitchShow, setGlitchShow]                 = useState(false);
  const [pendingBattle, setPendingBattle]           = useState<{ enemyId: string; profileId: string } | null>(null);
  const [showTutorial, setShowTutorial]             = useState(false);
  const [showDistrictVictory, setShowDistrictVictory] = useState(false);
  const [showSettings, setShowSettings]             = useState(false);
  const [pendingBattleResult, setPendingBattleResult] = useState<{ profileId: string } | null>(null);
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
    // Guard: ignore if already transitioning to battle
    if (screen === 'battle') return;
    setPendingBattle({ enemyId, profileId });
    setGlitchShow(true);
    setTimeout(() => {
      setGlitchShow(false);
      setScreen('battle');
      setScene('battle');

      // Read fresh state from store (avoids stale closure)
      const freshState = useGameStore.getState().gameState;
      if (freshState && !freshState.progress.tutorialSeen) {
        setShowTutorial(true);
      }
    }, 700);
  }, [screen, setScene]);

  const handleBattleEnd = useCallback((result: 'win' | 'lose') => {
    const profileId = pendingBattle?.profileId ?? '';
    setLastBattleResult(result);

    // Check if boss was defeated → district victory
    if (result === 'win' && profileId === 'madame_flux') {
      setPendingBattleResult({ profileId });
      setTimeout(() => {
        setScreen('exploration');
        setScene('exploration');
        setPendingBattle(null);
        saveGame();
        setShowDistrictVictory(true);
      }, 300);
    } else {
      setTimeout(() => {
        setScreen('exploration');
        setScene('exploration');
        setPendingBattle(null);
        saveGame();
      }, 300);
    }
  }, [setScene, saveGame, pendingBattle]);

  const handleBackToMap = useCallback(() => {
    setScreen('exploration');
    setScene('exploration');
    setPendingBattle(null);
  }, [setScene]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen();
    // Also update localStorage directly as a safety net
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
    setPendingBattleResult(null);
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

      {/* Exploration — always mounted, hidden during battle */}
      <div
        className="absolute inset-0"
        style={{ visibility: screen === 'exploration' ? 'visible' : 'hidden' }}
      >
        <ExplorationView
          onBattleStart={handleBattleStart}
          onShopOpen={() => { setScreen('shop'); setScene('shop'); }}
          onDeckOpen={() => { setScreen('deckbuilder'); setScene('deckbuilder'); }}
          onCraftingOpen={() => setScreen('crafting')}
          isActive={screen === 'exploration'}
          lastBattleResult={lastBattleResult}
        />
      </div>

      {/* Battle — full BattleArena */}
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
          <Shop onClose={handleBackToMap} />
        </div>
      )}

      {/* Deck Builder */}
      {screen === 'deckbuilder' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <DeckBuilder onClose={handleBackToMap} />
        </div>
      )}

      {/* Crafting Panel */}
      {screen === 'crafting' && (
        <div className="absolute inset-0" style={{ zIndex: 30 }}>
          <CraftingPanel onClose={handleBackToMap} />
        </div>
      )}

      {/* Glitch transition */}
      <GlitchTransition show={glitchShow} />

      {/* Tutorial overlay (shown on first battle) */}
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

      {/* In-game settings button (top-right, exploration only) */}
      {screen === 'exploration' && (
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
