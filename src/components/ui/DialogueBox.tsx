'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Dialogue } from '@/data/dialogues';

interface DialogueBoxProps {
  dialogue: Dialogue;
  onClose: () => void;
}

export default function DialogueBox({ dialogue, onClose }: DialogueBoxProps) {
  const [lineIndex, setLineIndex] = useState(0);

  const advance = () => {
    if (lineIndex < dialogue.lines.length - 1) {
      setLineIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const isLast = lineIndex === dialogue.lines.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        style={{ zIndex: 20 }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          style={{
            background: 'rgba(5,5,20,0.95)',
            borderTop: '2px solid #00f0ff',
            padding: '16px 20px 20px',
            boxShadow: '0 -4px 20px rgba(0,240,255,0.2)',
          }}
        >
          {/* Speaker */}
          {dialogue.speaker && (
            <p
              className="font-mono text-xs tracking-widest mb-2"
              style={{ color: '#00f0ff' }}
            >
              [{dialogue.speaker}]
            </p>
          )}

          {/* Line */}
          <p
            className="font-mono text-sm leading-relaxed mb-4"
            style={{ color: '#e0e0ff', minHeight: 40 }}
          >
            {dialogue.lines[lineIndex]}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {dialogue.lines.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i === lineIndex ? '#00f0ff' : '#1a1a3a',
                    boxShadow: i === lineIndex ? '0 0 4px #00f0ff' : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={advance}
              className="font-mono text-xs tracking-widest"
              style={{
                background: 'transparent',
                border: '1px solid rgba(0,240,255,0.5)',
                color: '#00f0ff',
                padding: '6px 14px',
                cursor: 'pointer',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              {isLast ? '[CLOSE]' : '[NEXT ▶]'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
