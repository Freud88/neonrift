'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CardInPlay } from '@/types/card';
import CardComponent from './CardComponent';
import { ENERGY_COLORS } from '@/utils/energyColors';
import { MOD_MAP } from '@/data/mods';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { TIER_COLORS } from '@/utils/tierUtils';

interface HandComponentProps {
  hand: CardInPlay[];
  currentDataCells: number;
  selectedCardId: string | null;
  isPlayerTurn: boolean;
  onSelect: (instanceId: string | null) => void;
  onPlay: (instanceId: string, targetId?: string) => void;
  // For targeted spells: when a card is selected and needs a target
  requiresTarget: boolean;
  targetIsFriendly?: boolean; // true when target must be a friendly agent (buff scripts)
  forkDmg?: number;           // set when resolving Forked second launch
  onCancelTarget: () => void;
}

export default function HandComponent({
  hand,
  currentDataCells,
  selectedCardId,
  isPlayerTurn,
  onSelect,
  onPlay,
  requiresTarget,
  targetIsFriendly = false,
  forkDmg,
  onCancelTarget,
}: HandComponentProps) {
  const [previewCard, setPreviewCard] = useState<CardInPlay | null>(null);

  const handleCardClick = (c: CardInPlay) => {
    if (!isPlayerTurn) return;
    const canAfford = c.card.cost <= currentDataCells;
    if (!canAfford) return;

    if (selectedCardId === c.instanceId) {
      // Second tap on same card: deselect
      onSelect(null);
      return;
    }

    onSelect(c.instanceId);

    // Agents play immediately to the field
    // Scripts/malware with a specific target wait for target selection
    const needsTarget = c.card.type !== 'agent' && (
      c.card.effect?.target === 'any'
      || c.card.effect?.target === 'enemy_agent'
      || c.card.effect?.target === 'self'
    );

    if (!needsTarget) {
      onPlay(c.instanceId);
      onSelect(null);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Target instruction banner */}
      <AnimatePresence>
        {requiresTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: -28,
              left: 0, right: 0,
              textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: '#ffe600',
              background: 'rgba(0,0,0,0.8)',
              padding: '4px',
              borderTop: '1px solid #ffe600',
            }}
          >
            {forkDmg !== undefined
              ? `FORKED — select second target for ${forkDmg} damage`
              : targetIsFriendly
                ? 'SELECT TARGET — tap a friendly agent  [TAP HAND TO CANCEL]'
                : 'SELECT TARGET — tap enemy agent or enemy portrait  [TAP HAND TO CANCEL]'
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand scroll container */}
      <div
        className="hand-scroll"
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 10px 4px',
        }}
        onClick={requiresTarget ? onCancelTarget : undefined}
      >
        <AnimatePresence>
          {hand.map((c, i) => {
            const canAfford = c.card.cost <= currentDataCells;
            const isSelected = selectedCardId === c.instanceId;
            return (
              <motion.div
                key={c.instanceId}
                initial={{ y: 60, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.6 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setPreviewCard(c)}
                onMouseLeave={() => setPreviewCard(null)}
              >
                <CardComponent
                  card={c.card}
                  inPlay={c}
                  size="hand"
                  selected={isSelected}
                  disabled={!isPlayerTurn || !canAfford}
                  onClick={() => handleCardClick(c)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hand.length === 0 && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: '#333355',
            padding: '20px 10px',
          }}>
            — hand empty —
          </div>
        )}
      </div>

      {/* Card preview tooltip (desktop hover) */}
      <AnimatePresence>
        {previewCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <CardComponent
              card={previewCard.card}
              inPlay={previewCard}
              size="preview"
            />
            {/* Description box */}
            <div style={{
              marginTop: 4,
              background: 'rgba(5,5,20,0.95)',
              border: `1px solid ${ENERGY_COLORS[previewCard.card.energy].primary}`,
              padding: '6px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: '#aaaacc',
              maxWidth: 130,
              lineHeight: 1.4,
            }}>
              {previewCard.card.description}
              {previewCard.card.keywords?.map((kw) => (
                <div key={kw.keyword} style={{ color: ENERGY_COLORS[previewCard.card.energy].primary, marginTop: 3 }}>
                  [{kw.keyword.toUpperCase()}{kw.value ? ` ${kw.value}` : ''}]
                </div>
              ))}
            </div>
            {/* Mods panel */}
            {previewCard.card.mods && previewCard.card.mods.mods.length > 0 && (
              <div style={{
                marginTop: 4, background: 'rgba(5,5,20,0.95)',
                border: `1px solid ${MOD_RARITY_COLOR[previewCard.card.mods.modRarity]}`,
                padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace',
                maxWidth: 130,
                boxShadow: `0 0 8px ${MOD_RARITY_COLOR[previewCard.card.mods.modRarity]}44`,
              }}>
                <div style={{ fontSize: 7, color: MOD_RARITY_COLOR[previewCard.card.mods.modRarity], letterSpacing: '0.15em', marginBottom: 5, textAlign: 'center' }}>
                  {previewCard.card.mods.modRarity.toUpperCase()} · {previewCard.card.mods.mods.length} MOD{previewCard.card.mods.mods.length > 1 ? 'S' : ''}
                </div>
                {previewCard.card.mods.mods.map((applied, i) => {
                  const mod = MOD_MAP[applied.modId];
                  if (!mod) return null;
                  const tier = applied.tier;
                  const effect = mod.tiers[tier];
                  if (!effect) return null;
                  const tierColor = TIER_COLORS[tier] ?? '#aaaaaa';
                  const tierGlow = tier >= 7 ? `0 0 ${4 + (tier - 7) * 3}px ${tierColor}` : 'none';
                  return (
                    <div key={i} style={{ marginBottom: i < previewCard.card.mods!.mods.length - 1 ? 5 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 7, color: tierColor, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '1px 3px', borderRadius: 2, textShadow: tierGlow }}>
                          T{tier}
                        </span>
                        <span style={{ fontSize: 8, color: '#e0e0ff', fontWeight: 700 }}>
                          {mod.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 7, color: '#8888aa', marginTop: 1, marginLeft: 4 }}>
                        {effect.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
