'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { SKILL_TREES, TREE_IDS } from '@/data/skillTrees';
import type { SkillTreeId } from '@/types/skills';
import NeonButton from '@/components/ui/NeonButton';

interface SkillTreePanelProps {
  onClose: () => void;
}

function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.4));
}

function getExpProgress(xp: number, level: number) {
  const expForCurrent = xpForLevel(level);
  const expForNext    = xpForLevel(level + 1);
  const expNeeded     = expForNext - expForCurrent;
  const expIntoLevel  = xp - expForCurrent;
  const percentage    = Math.min(100, Math.max(0, (expIntoLevel / expNeeded) * 100));
  return { expIntoLevel, expNeeded, expForNext, percentage };
}

export default function SkillTreePanel({ onClose }: SkillTreePanelProps) {
  const { gameState, allocateSkillPoint } = useGameStore();
  const skills = gameState?.skills ?? { skillPoints: 0, trees: { drifter: 0, trader: 0, survivor: 0 } };
  const xp     = gameState?.player.xp ?? 0;
  const level  = gameState?.player.level ?? 1;
  const { expIntoLevel, expNeeded, expForNext, percentage } = getExpProgress(xp, level);

  const handleAllocate = useCallback((tree: SkillTreeId) => {
    allocateSkillPoint(tree);
  }, [allocateSkillPoint]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center"
      style={{ zIndex: 60, background: 'rgba(5,5,15,0.96)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 pt-4 pb-2" style={{ maxWidth: 1200 }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <h1
            className="font-display text-xl tracking-widest"
            style={{ color: '#00f0ff', textShadow: '0 0 12px #00f0ff' }}
          >
            SKILL TREES
          </h1>
          {/* XP Bar */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6666aa', marginBottom: 4 }}>
              <span style={{ color: '#00f0ff', fontWeight: 700 }}>Lv.{level}</span>
              <span>{expIntoLevel} / {expNeeded} XP</span>
              <span style={{ color: '#6666aa' }}>Lv.{level + 1} — {expForNext} total</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(40,40,60,0.6)', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,240,255,0.1)' }}>
              <div style={{
                height: '100%',
                borderRadius: 4,
                width: `${percentage}%`,
                background: 'linear-gradient(90deg, #00f0ff, #c850ff)',
                boxShadow: '0 0 8px #00f0ff66',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="font-mono text-sm px-3 py-1 rounded"
            style={{
              background: skills.skillPoints > 0 ? 'rgba(0,240,255,0.15)' : 'rgba(60,60,80,0.3)',
              color: skills.skillPoints > 0 ? '#00f0ff' : '#555',
              border: `1px solid ${skills.skillPoints > 0 ? 'rgba(0,240,255,0.4)' : 'rgba(60,60,80,0.3)'}`,
            }}
          >
            {skills.skillPoints} SKILL POINT{skills.skillPoints !== 1 ? 'S' : ''}
          </span>
          <NeonButton onClick={onClose} size="sm">CLOSE</NeonButton>
        </div>
      </div>

      {/* Trees */}
      <div
        className="flex-1 w-full overflow-auto px-4 pb-6"
        style={{ maxWidth: 1200 }}
      >
        <div className="grid grid-cols-3 gap-4 h-full">
          {TREE_IDS.map((treeId) => {
            const tree = SKILL_TREES[treeId];
            const currentLevel = skills.trees[treeId];
            const canAllocate = skills.skillPoints > 0 && currentLevel < 10;

            return (
              <div
                key={treeId}
                className="flex flex-col rounded-lg p-4"
                style={{
                  background: 'rgba(10,10,25,0.8)',
                  border: `1px solid ${tree.color}33`,
                }}
              >
                {/* Tree header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{tree.icon}</span>
                  <span
                    className="font-display text-sm tracking-widest"
                    style={{ color: tree.color }}
                  >
                    {tree.name}
                  </span>
                  <span
                    className="ml-auto font-mono text-xs px-2 py-0.5 rounded"
                    style={{
                      background: `${tree.color}20`,
                      color: tree.color,
                    }}
                  >
                    {currentLevel}/10
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  className="w-full h-1.5 rounded-full mb-3"
                  style={{ background: 'rgba(40,40,60,0.5)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${currentLevel * 10}%`,
                      background: tree.color,
                      boxShadow: `0 0 8px ${tree.color}`,
                    }}
                  />
                </div>

                {/* Skills list */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-auto">
                  {tree.skills.map((skill) => {
                    const unlocked = skill.level <= currentLevel;
                    const isNext = skill.level === currentLevel + 1;

                    return (
                      <div
                        key={skill.level}
                        className="flex items-start gap-2 px-2 py-1.5 rounded"
                        style={{
                          background: unlocked
                            ? `${tree.color}12`
                            : isNext && canAllocate
                            ? 'rgba(40,40,70,0.4)'
                            : 'transparent',
                          border: isNext && canAllocate
                            ? `1px dashed ${tree.color}55`
                            : '1px solid transparent',
                          opacity: unlocked ? 1 : isNext ? 0.8 : 0.35,
                        }}
                      >
                        {/* Level indicator */}
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono"
                          style={{
                            background: unlocked ? tree.color : 'rgba(40,40,60,0.5)',
                            color: unlocked ? '#000' : '#555',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {skill.level}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs font-mono truncate"
                            style={{ color: unlocked ? tree.color : '#666' }}
                          >
                            {skill.name}
                          </div>
                          <div
                            className="text-xs mt-0.5 leading-tight"
                            style={{ color: unlocked ? '#aaa' : '#444', fontSize: 10 }}
                          >
                            {skill.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Allocate button */}
                <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${tree.color}22` }}>
                  <button
                    onClick={() => handleAllocate(treeId)}
                    disabled={!canAllocate}
                    className="w-full py-1.5 rounded font-mono text-xs tracking-wider transition-all"
                    style={{
                      background: canAllocate ? `${tree.color}25` : 'rgba(30,30,50,0.3)',
                      color: canAllocate ? tree.color : '#444',
                      border: `1px solid ${canAllocate ? `${tree.color}55` : 'rgba(40,40,60,0.3)'}`,
                      cursor: canAllocate ? 'pointer' : 'default',
                      textShadow: canAllocate ? `0 0 8px ${tree.color}` : 'none',
                    }}
                  >
                    {currentLevel >= 10 ? 'MAXED' : canAllocate ? `UNLOCK LV.${currentLevel + 1}` : skills.skillPoints === 0 ? 'NO POINTS' : 'MAX REACHED'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
