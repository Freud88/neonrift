'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import NeonButton from './NeonButton';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { gameState, updateSettings } = useGameStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const settings = gameState?.settings ?? {
    musicVolume: 70,
    sfxVolume: 80,
    animationSpeed: 'normal' as const,
    language: 'en',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 border p-8 min-w-80"
            style={{
              borderColor: '#00f0ff',
              background: 'rgba(5, 5, 20, 0.95)',
              boxShadow: '0 0 30px rgba(0,240,255,0.3)',
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2
              className="font-display text-xl mb-6 tracking-widest text-center"
              style={{ color: '#00f0ff' }}
            >
              SETTINGS
            </h2>

            {/* Music Volume */}
            <div className="mb-4">
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6666aa' }}>
                MUSIC VOLUME — {settings.musicVolume}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.musicVolume}
                onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* SFX Volume */}
            <div className="mb-4">
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6666aa' }}>
                SFX VOLUME — {settings.sfxVolume}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.sfxVolume}
                onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Animation speed */}
            <div className="mb-6">
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6666aa' }}>
                ANIMATION SPEED
              </label>
              <div className="flex gap-3">
                {(['normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => updateSettings({ animationSpeed: speed })}
                    className="flex-1 py-2 text-xs font-mono tracking-widest border uppercase"
                    style={{
                      borderColor: settings.animationSpeed === speed ? '#00f0ff' : '#1a1a3a',
                      color: settings.animationSpeed === speed ? '#00f0ff' : '#6666aa',
                      background: 'transparent',
                    }}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Game */}
            <div className="mb-5">
              <AnimatePresence mode="wait">
                {!confirmReset ? (
                  <motion.button
                    key="reset-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-2 text-xs font-mono tracking-widest border uppercase"
                    style={{
                      borderColor: 'rgba(255,0,68,0.4)',
                      color: '#ff0044',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    RESET GAME
                  </motion.button>
                ) : (
                  <motion.div
                    key="reset-confirm"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ textAlign: 'center' }}
                  >
                    <p className="text-xs font-mono mb-3" style={{ color: '#ff0044' }}>
                      DELETE ALL SAVE DATA?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = '/';
                        }}
                        className="flex-1 py-2 text-xs font-mono tracking-widest border uppercase"
                        style={{ borderColor: '#ff0044', color: '#ff0044', background: 'rgba(255,0,68,0.1)', cursor: 'pointer' }}
                      >
                        CONFIRM
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="flex-1 py-2 text-xs font-mono tracking-widest border uppercase"
                        style={{ borderColor: '#333355', color: '#6666aa', background: 'transparent', cursor: 'pointer' }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NeonButton variant="cyan" onClick={onClose} className="w-full" size="md">
              CLOSE
            </NeonButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
