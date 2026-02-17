'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Card, CardInPlay } from '@/types/card';
import { ENERGY_COLORS, TYPE_LABEL } from '@/utils/energyColors';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { MOD_MAP } from '@/data/mods';
import CardArt from './CardArt';

const TIER_LABEL: Record<1 | 2 | 3, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const TIER_COLOR: Record<1 | 2 | 3, string> = { 1: '#ff6622', 2: '#ffe600', 3: '#cccccc' };

type CardSize = 'hand' | 'field' | 'preview' | 'mini';

interface CardComponentProps {
  card: Card;
  inPlay?: CardInPlay;
  size?: CardSize;
  selected?: boolean;
  attacking?: boolean;
  tapped?: boolean;
  faceDown?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const SIZE_DIMS: Record<CardSize, { w: number; h: number; fontSize: number }> = {
  hand:    { w: 80,  h: 110, fontSize: 7   },
  field:   { w: 68,  h: 90,  fontSize: 6.5 },
  preview: { w: 130, h: 180, fontSize: 10  },
  mini:    { w: 48,  h: 64,  fontSize: 6   },
};

export default function CardComponent({
  card,
  inPlay,
  size = 'hand',
  selected = false,
  attacking = false,
  tapped = false,
  faceDown = false,
  disabled = false,
  onClick,
}: CardComponentProps) {
  const [showModTooltip, setShowModTooltip] = useState(false);
  const ec = ENERGY_COLORS[card.energy];
  const { w, h, fontSize } = SIZE_DIMS[size];

  const isAgent = card.type === 'agent';
  const atk = inPlay?.currentAttack ?? card.attack;
  const def = inPlay?.currentDefense ?? card.defense;
  const buffed = inPlay && (
    (inPlay.currentAttack  !== (card.attack  ?? 0)) ||
    (inPlay.currentDefense !== (card.defense ?? 0))
  );

  // Mod system
  const cardMods = card.mods;
  const modRarity = cardMods?.modRarity;
  const rarityBorderColor = modRarity && modRarity !== 'common' ? MOD_RARITY_COLOR[modRarity] : null;
  const displayName = cardMods?.displayName ?? card.name;
  const prefixMod = cardMods?.mods.find((m) => MOD_MAP[m.modId]?.type === 'prefix');
  const suffixMod = cardMods?.mods.find((m) => MOD_MAP[m.modId]?.type === 'suffix');
  const prefixName = prefixMod ? MOD_MAP[prefixMod.modId]?.name : null;
  const suffixName = suffixMod ? MOD_MAP[suffixMod.modId]?.name : null;
  const modSlots = cardMods?.mods.length ?? 0;

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (cardMods && cardMods.mods.length > 0) setShowModTooltip(true); }}
      onMouseLeave={() => setShowModTooltip(false)}
      style={{
        width: w,
        height: h,
        background: faceDown ? '#0d0d1a' : ec.bg,
        border: `1.5px solid ${selected || attacking ? '#ffffff' : rarityBorderColor ?? ec.primary}`,
        borderRadius: 4,
        boxShadow: selected
          ? `0 0 14px #fff, 0 0 6px ${rarityBorderColor ?? ec.primary}`
          : attacking
          ? `0 0 12px #ff4444`
          : rarityBorderColor
          ? `0 0 8px ${rarityBorderColor}, 0 0 4px ${ec.glow}`
          : `0 0 6px ${ec.glow}`,
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
        opacity: tapped ? 0.65 : 1,
        transform: tapped ? 'rotate(5deg)' : undefined,
        filter: disabled && !attacking ? 'brightness(0.6)' : undefined,
      }}
      whileHover={disabled ? {} : { y: size === 'hand' ? -8 : 0, scale: 1.04 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {faceDown ? (
        // Back of card
        <div
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'repeating-linear-gradient(45deg, #0a0a1a 0px, #0a0a1a 4px, #111133 4px, #111133 8px)',
          }}
        >
          <span style={{ color: '#1a1a3a', fontSize: 20 }}>?</span>
        </div>
      ) : (
        <>
          {/* Top row: cost + type */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '3px 4px 0',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: fontSize + 1,
              fontWeight: 700,
              color: ec.primary,
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 2,
              padding: '0 3px',
              minWidth: 14,
              textAlign: 'center',
            }}>
              {card.cost}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: fontSize - 1,
              color: ec.primary,
              opacity: 0.7,
            }}>
              {TYPE_LABEL[card.type]}
            </span>
          </div>

          {/* Card artwork area */}
          <div style={{
            flex: 1,
            margin: '3px 4px',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {size !== 'mini' ? (
              <CardArt card={card} width={w - 8} height={Math.round((h - 8) * 0.48)} />
            ) : (
              /* Mini size: simple energy icon fallback */
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, ${ec.bg} 100%)`,
              }}>
                <span style={{ fontSize: h * 0.22, opacity: 0.5 }}>
                  {ENERGY_ICON[card.energy]}
                </span>
              </div>
            )}
            {/* Card name overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              padding: '6px 3px 2px',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fontSize,
                fontWeight: 700,
                color: '#e0e0ff',
                textAlign: 'center',
                lineHeight: 1.1,
                textShadow: `0 0 4px ${ec.primary}`,
              }}>
                {card.name}
              </div>
            </div>
          </div>

          {/* Stats / description */}
          <div style={{ padding: '2px 4px 3px' }}>
            {isAgent && atk !== undefined && def !== undefined ? (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: fontSize + 0.5,
                  color: buffed ? '#39ff14' : '#e0e0ff',
                  fontWeight: 700,
                }}>
                  ⚔{atk} <span style={{ color: '#6666aa' }}>|</span> 🛡{def}
                </span>
              </div>
            ) : (
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fontSize - 0.5,
                color: '#8888aa',
                lineHeight: 1.2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {card.description}
              </p>
            )}
          </div>

          {/* Mod slot indicators (only if has mods or preview size) */}
          {(modSlots > 0 || size === 'preview') && (
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 2,
              padding: '2px 0 1px',
            }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  width: 5, height: 5,
                  borderRadius: 1,
                  background: i < modSlots ? (rarityBorderColor ?? ec.primary) : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${i < modSlots ? (rarityBorderColor ?? ec.primary) : 'rgba(255,255,255,0.12)'}`,
                  boxShadow: i < modSlots ? `0 0 3px ${rarityBorderColor ?? ec.primary}` : 'none',
                }} />
              ))}
            </div>
          )}

          {/* Energy color stripe at bottom */}
          <div style={{
            height: 2,
            background: rarityBorderColor ?? ec.primary,
            boxShadow: `0 0 4px ${rarityBorderColor ?? ec.glow}`,
          }} />

          {/* Corner accents */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 5, height: 5, borderTop: `1px solid ${ec.primary}`, borderLeft: `1px solid ${ec.primary}` }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 5, height: 5, borderTop: `1px solid ${ec.primary}`, borderRight: `1px solid ${ec.primary}` }} />

          {/* Volt: spark shimmer overlay */}
          {card.energy === 'volt' && !faceDown && (
            <motion.div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(120deg, transparent 0%, rgba(255,240,0,0.08) 40%, transparent 60%)',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
              animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            />
          )}

          {/* Cipher: data-stream shimmer overlay */}
          {card.energy === 'cipher' && !faceDown && (
            <motion.div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.06) 50%, transparent 100%)',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </>
      )}

      {/* Mod tooltip on hover */}
      {showModTooltip && cardMods && cardMods.mods.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: 'rgba(5,5,20,0.98)',
          border: `1px solid ${rarityBorderColor ?? ec.primary}`,
          borderRadius: 4,
          padding: '7px 10px',
          minWidth: 150,
          pointerEvents: 'none',
          boxShadow: `0 0 12px ${rarityBorderColor ?? ec.primary}44`,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: rarityBorderColor ?? ec.primary, letterSpacing: '0.15em', marginBottom: 5, textAlign: 'center' }}>
            {(cardMods.modRarity ?? 'common').toUpperCase()} · {cardMods.mods.length} MOD{cardMods.mods.length > 1 ? 'S' : ''}
          </div>
          {cardMods.mods.map((applied, i) => {
            const mod = MOD_MAP[applied.modId];
            if (!mod) return null;
            const tier = applied.tier as 1 | 2 | 3;
            const effect = mod.tiers[tier];
            return (
              <div key={i} style={{ marginBottom: i < cardMods.mods.length - 1 ? 5 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: TIER_COLOR[tier], fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '1px 3px', borderRadius: 2 }}>
                    {TIER_LABEL[tier]}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#e0e0ff', fontWeight: 700 }}>
                    {mod.name}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: '#555577' }}>
                    {mod.type === 'prefix' ? '⬆' : '⬇'}
                  </span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: '#8888aa', marginTop: 1, marginLeft: 4 }}>
                  {effect.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

const ENERGY_ICON: Record<string, string> = {
  volt:    '⚡',
  cipher:  '◈',
  rust:    '⚙',
  phantom: '◉',
  synth:   '❋',
  neutral: '◇',
};
