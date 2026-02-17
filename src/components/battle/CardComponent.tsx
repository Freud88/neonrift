'use client';

import { motion } from 'framer-motion';
import type { Card, CardInPlay } from '@/types/card';
import { ENERGY_COLORS, TYPE_LABEL } from '@/utils/energyColors';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { MOD_MAP } from '@/data/mods';

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
            background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, ${ec.bg} 100%)`,
            margin: '3px 4px',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Energy icon as "artwork" */}
            <span style={{
              fontSize: h * 0.22,
              opacity: 0.5,
              filter: `drop-shadow(0 0 4px ${ec.primary})`,
            }}>
              {ENERGY_ICON[card.energy]}
            </span>
            {/* Prefix name */}
            {prefixName && (
              <div style={{
                position: 'absolute',
                top: 2, left: 2, right: 2,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fontSize - 1.5,
                color: rarityBorderColor ?? ec.primary,
                textAlign: 'center',
                lineHeight: 1,
                opacity: 0.9,
              }}>
                {prefixName}
              </div>
            )}
            {/* Name */}
            <div style={{
              position: 'absolute',
              bottom: suffixName ? 10 : 2, left: 2, right: 2,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: fontSize,
              fontWeight: 700,
              color: '#e0e0ff',
              textAlign: 'center',
              lineHeight: 1.1,
              textShadow: `0 0 4px ${ec.primary}`,
            }}>
              {displayName.replace(prefixName ? prefixName + ' ' : '', '').replace(suffixName ? ' ' + suffixName : '', '')}
            </div>
            {/* Suffix name */}
            {suffixName && (
              <div style={{
                position: 'absolute',
                bottom: 2, left: 2, right: 2,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fontSize - 1.5,
                color: '#c850ff',
                textAlign: 'center',
                lineHeight: 1,
                opacity: 0.9,
              }}>
                {suffixName}
              </div>
            )}
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
