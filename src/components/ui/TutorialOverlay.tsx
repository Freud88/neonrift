'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NeonButton from './NeonButton';

const STEPS = [
  {
    title: 'DATA CELLS',
    body: 'These are your resources. You gain +1 per turn (max 10). All cards cost Data Cells to play.',
    highlight: 'bottom-hud',
  },
  {
    title: 'YOUR HAND',
    body: 'Tap a card to select it. Agents go to the field — Scripts activate immediately. Grey cards cost too much this turn.',
    highlight: 'hand',
  },
  {
    title: 'DEPLOY AGENTS',
    body: 'Drag or tap an Agent card, then tap an empty slot on your field. Agents can attack the turn AFTER they are played (unless they have Overclock).',
    highlight: 'field',
  },
  {
    title: 'ATTACK',
    body: 'Tap your Agents to select attackers (they glow). Hit ATTACK to send them. If the enemy has no Agents, damage goes directly to their HP.',
    highlight: 'attack',
  },
  {
    title: 'WIN CONDITION',
    body: 'Reduce the enemy HP to 0 to win. If your HP hits 0, you lose. After winning, you can choose a card from the enemy\'s deck.',
    highlight: 'none',
  },
];

interface TutorialOverlayProps {
  onDone: () => void;
}

export default function TutorialOverlay({ onDone }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: 'rgba(5,5,20,0.97)',
            border: '1px solid #00f0ff',
            boxShadow: '0 0 30px rgba(0,240,255,0.25)',
            padding: '24px 28px',
            maxWidth: 340,
            width: '90vw',
          }}
        >
          {/* Step counter */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 2,
                background: i <= step ? '#00f0ff' : '#1a1a3a',
                boxShadow: i === step ? '0 0 4px #00f0ff' : 'none',
              }} />
            ))}
          </div>

          <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 13, color: '#00f0ff', letterSpacing: '0.15em', marginBottom: 10 }}>
            {current.title}
          </p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#aaaacc', lineHeight: 1.6, marginBottom: 20 }}>
            {current.body}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={onDone}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333355', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              SKIP ALL
            </button>
            <NeonButton
              variant="cyan"
              size="sm"
              onClick={() => isLast ? onDone() : setStep((s) => s + 1)}
            >
              {isLast ? 'START BATTLE' : 'NEXT →'}
            </NeonButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
