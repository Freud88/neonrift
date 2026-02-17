'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import RainBackground from '@/components/ui/RainBackground';
import NeonButton from '@/components/ui/NeonButton';
import SettingsModal from '@/components/ui/SettingsModal';

// Glitch logo component
function GlitchLogo() {
  return (
    <div className="relative select-none mb-4">
      {/* Ghost layers for glitch effect */}
      <span
        className="absolute inset-0 font-display font-black text-center"
        style={{
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          color: '#ff00aa',
          animation: 'glitch 4s infinite',
          opacity: 0.7,
        }}
        aria-hidden="true"
      >
        NEONRIFT
      </span>
      <span
        className="absolute inset-0 font-display font-black text-center"
        style={{
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          color: '#00f0ff',
          animation: 'glitch-2 4s infinite 0.15s',
          opacity: 0.7,
        }}
        aria-hidden="true"
      >
        NEONRIFT
      </span>
      {/* Main text */}
      <h1
        className="font-display font-black text-center relative z-10"
        style={{
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          color: '#e0e0ff',
          textShadow: '0 0 20px #00f0ff, 0 0 40px rgba(0,240,255,0.5)',
          letterSpacing: '0.1em',
          animation: 'flicker 8s infinite',
        }}
      >
        NEONRIFT
      </h1>
    </div>
  );
}

// Animated subtitle with typewriter effect
function Subtitle() {
  const text = 'Chronicles of the Grid';
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="font-mono text-sm tracking-[0.3em] uppercase mb-12"
      style={{ color: '#6666aa' }}
    >
      {displayed}
      <span
        style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          background: '#00f0ff',
          marginLeft: '2px',
          animation: 'pulse-neon 1s infinite',
          verticalAlign: 'middle',
        }}
      />
    </p>
  );
}

// Decorative horizontal rule
function NeonRule() {
  return (
    <div className="flex items-center gap-3 w-full max-w-sm mb-10">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #00f0ff)' }} />
      <div className="w-2 h-2 rotate-45" style={{ background: '#00f0ff' }} />
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #00f0ff)' }} />
    </div>
  );
}

export default function TitleScreen() {
  const router = useRouter();
  const { newGame, loadGame, checkHasSave, hasSave } = useGameStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkHasSave();
    // Small delay so the logo animation plays first
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, [checkHasSave]);

  const handleNewGame = () => {
    newGame();
    router.push('/game');
  };

  const handleContinue = () => {
    const ok = loadGame();
    if (ok) router.push('/game');
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 1.2 + i * 0.15, duration: 0.4 },
    }),
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Animated rain */}
      <RainBackground />

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <GlitchLogo />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Subtitle />
        </motion.div>

        <AnimatePresence>
          {ready && (
            <>
              <NeonRule />

              <div className="flex flex-col gap-4 w-full max-w-xs sm:max-w-sm">
                <motion.div custom={0} variants={buttonVariants} initial="hidden" animate="visible">
                  <NeonButton
                    variant="cyan"
                    onClick={handleNewGame}
                    size="lg"
                    className="w-full"
                  >
                    NEW GAME
                  </NeonButton>
                </motion.div>

                <motion.div custom={1} variants={buttonVariants} initial="hidden" animate="visible">
                  <NeonButton
                    variant="magenta"
                    onClick={handleContinue}
                    disabled={!hasSave}
                    size="lg"
                    className="w-full"
                  >
                    CONTINUE
                  </NeonButton>
                </motion.div>

                <motion.div custom={2} variants={buttonVariants} initial="hidden" animate="visible">
                  <NeonButton
                    variant="yellow"
                    onClick={() => setSettingsOpen(true)}
                    size="lg"
                    className="w-full"
                  >
                    SETTINGS
                  </NeonButton>
                </motion.div>
              </div>

              {/* Version tag */}
              <motion.p
                className="font-mono text-xs mt-10"
                style={{ color: '#333355' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.5 }}
              >
                v0.1.0 — MVP BUILD — NEON ROW
              </motion.p>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
