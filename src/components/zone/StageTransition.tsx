'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RiftDecayEngine } from '@/engine/RiftDecayEngine';

interface StageTransitionProps {
  stage: number | null;  // null = not showing
}

export default function StageTransition({ stage }: StageTransitionProps) {
  return (
    <AnimatePresence>
      {stage !== null && stage > 0 && (
        <motion.div
          key={`stage-${stage}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle, ${RiftDecayEngine.getStageInfo(stage).color}22 0%, rgba(0,0,0,0.85) 70%)`,
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          {/* Flash line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 2,
              background: RiftDecayEngine.getStageInfo(stage).color,
              boxShadow: `0 0 20px ${RiftDecayEngine.getStageInfo(stage).color}`,
              transformOrigin: 'center',
            }}
          />

          {/* Stage name */}
          <motion.div
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 28,
              color: RiftDecayEngine.getStageInfo(stage).color,
              letterSpacing: '0.3em',
              textShadow: `0 0 20px ${RiftDecayEngine.getStageInfo(stage).color}, 0 0 40px ${RiftDecayEngine.getStageInfo(stage).color}44`,
            }}
          >
            {RiftDecayEngine.getStageInfo(stage).name}
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#8888aa',
              letterSpacing: '0.2em',
              marginTop: 8,
            }}
          >
            RIFT DECAY STAGE {stage}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
