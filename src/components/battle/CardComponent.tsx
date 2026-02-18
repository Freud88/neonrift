'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardInPlay } from '@/types/card';
import { ENERGY_COLORS, TYPE_LABEL } from '@/utils/energyColors';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { MOD_MAP } from '@/data/mods';
import CardArt from './CardArt';

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_LABEL: Record<1 | 2 | 3, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const TIER_COLOR: Record<1 | 2 | 3, string> = { 1: '#ff6622', 2: '#ffe600', 3: '#aaaaaa' };

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
  hand:    { w: 80,  h: 112, fontSize: 6.5 },
  field:   { w: 68,  h: 95,  fontSize: 6   },
  preview: { w: 130, h: 182, fontSize: 9   },
  mini:    { w: 48,  h: 64,  fontSize: 5.5 },
};

// ── Card frame built in CSS ───────────────────────────────────────────────────
// Layout (top→bottom):
//   Header   : name + cost         ~14% of height
//   Artwork  : image / canvas      ~38% of height
//   Body     : mods or description ~38% of height
//   Footer   : ATK / DEF / type    ~10% of height

function CardFrame({
  card,
  inPlay,
  ec,
  rarityBorderColor,
  w,
  h,
  fontSize,
  fullDetail = false,   // true → show mod descriptions (hover preview)
}: {
  card: Card;
  inPlay?: CardInPlay;
  ec: { primary: string; glow: string; bg: string };
  rarityBorderColor: string | null;
  w: number;
  h: number;
  fontSize: number;
  fullDetail?: boolean;
}) {
  const isAgent = card.type === 'agent';
  const atk = inPlay?.currentAttack ?? card.attack;
  const def = inPlay?.currentDefense ?? card.defense;
  const buffed = inPlay && (
    (inPlay.currentAttack  !== (card.attack  ?? 0)) ||
    (inPlay.currentDefense !== (card.defense ?? 0))
  );
  const cardMods   = card.mods;
  const modSlots   = cardMods?.mods.length ?? 0;
  const accentColor = rarityBorderColor ?? ec.primary;

  // Zone heights — dynamically shift art→body when many mods
  const headerH = Math.round(h * 0.13);
  const artPct  = modSlots >= 5 ? 0.28 : modSlots >= 4 ? 0.32 : 0.37;
  const bodyPct = modSlots >= 5 ? 0.49 : modSlots >= 4 ? 0.45 : 0.40;
  const artH    = Math.round(h * artPct);
  const bodyH   = Math.round(h * bodyPct);
  const footerH = h - headerH - artH - bodyH;

  return (
    <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{
        height: headerH,
        background: `linear-gradient(135deg, ${ec.bg} 0%, #0a0a18 100%)`,
        borderBottom: `1px solid ${accentColor}55`,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${Math.round(w * 0.06)}px`,
        gap: 4,
        flexShrink: 0,
      }}>
        {/* Cost bubble */}
        <div style={{
          minWidth: Math.max(14, Math.round(w * 0.19)),
          height: Math.max(14, Math.round(w * 0.19)),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}33 0%, ${ec.bg} 100%)`,
          border: `1.5px solid ${accentColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: Math.max(fontSize + 1, 8),
            fontWeight: 700,
            color: accentColor,
            lineHeight: 1,
          }}>
            {card.cost}
          </span>
        </div>

        {/* Name */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: Math.max(fontSize, 6),
          fontWeight: 700,
          color: '#e8e8ff',
          textShadow: `0 0 6px ${accentColor}88`,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.1,
        }}>
          {card.name}
        </span>
      </div>

      {/* ── Artwork ── */}
      <div style={{
        height: artH,
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `1px solid ${accentColor}33`,
        flexShrink: 0,
      }}>
        <CardArt card={card} width={w} height={artH} />
        {/* energy tint overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, transparent 60%, ${ec.bg}cc 100%)`,
          pointerEvents: 'none',
        }} />
        {/* type tag */}
        <div style={{
          position: 'absolute', bottom: 3, right: 4,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: Math.max(fontSize - 1.5, 5),
          color: accentColor,
          opacity: 0.85,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 2,
          padding: '0 3px',
          lineHeight: 1.4,
        }}>
          {TYPE_LABEL[card.type]}
        </div>
      </div>

      {/* ── Body: mods or description ── */}
      <div style={{
        height: bodyH,
        background: '#06060f',
        borderBottom: `1px solid ${accentColor}22`,
        padding: `${Math.round(bodyH * 0.05)}px ${Math.round(w * 0.07)}px`,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}>
        {cardMods && modSlots > 0 ? (
          <>
            {/* Rarity label */}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: Math.max(fontSize - 2, 4.5),
              color: accentColor,
              letterSpacing: '0.07em',
              fontWeight: 700,
              marginBottom: 0,
              flexShrink: 0,
              lineHeight: 1.2,
            }}>
              {(cardMods.modRarity ?? 'common').toUpperCase()} · {modSlots} MOD{modSlots > 1 ? 'S' : ''}
            </div>

            {/* Mod list */}
            {cardMods.mods.map((applied, i) => {
              const mod = MOD_MAP[applied.modId];
              if (!mod) return null;
              const tier   = applied.tier as 1 | 2 | 3;
              const effect = mod.tiers[tier];
              const isPrefix = mod.type === 'prefix';
              const isBad    = !!(effect.isNegative || effect.isUseless);
              const nameColor = isBad ? '#666677' : isPrefix ? '#00e5ff' : '#dd44ff';
              const badgeColor = isBad ? '#444455' : TIER_COLOR[tier];
              // Shrink text when many mods
              const modFontAdj = modSlots >= 5 ? -0.5 : 0;

              return (
                <div key={i} style={{ flexShrink: 0, marginBottom: fullDetail ? 3 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* tier badge */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: Math.max(fontSize - 2 + modFontAdj, 4.5),
                      color: badgeColor,
                      fontWeight: 700,
                      flexShrink: 0,
                      lineHeight: 1.2,
                    }}>
                      {isBad ? '⚠' : ''}{TIER_LABEL[tier]}
                    </span>
                    {/* mod name */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: Math.max(fontSize - 1.5 + modFontAdj, 4.5),
                      color: nameColor,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}>
                      {mod.name}
                    </span>
                  </div>
                  {/* description — only in full detail (hover preview) */}
                  {fullDetail && (
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: Math.max(fontSize - 2.5, 5),
                      color: isBad ? '#555566' : '#8888aa',
                      lineHeight: 1.3,
                      paddingLeft: 4,
                    }}>
                      {effect.description}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: Math.max(fontSize - 1, 5.5),
            color: '#aaaacc',
            lineHeight: 1.3,
            margin: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: fullDetail ? 10 : 4,
            WebkitBoxOrient: 'vertical',
          }}>
            {card.description}
          </p>
        )}
      </div>

      {/* ── Footer: stats ── */}
      <div style={{
        flex: 1,
        background: `linear-gradient(135deg, #0a0a18 0%, ${ec.bg} 100%)`,
        borderTop: `1px solid ${accentColor}33`,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${Math.round(w * 0.06)}px`,
        gap: Math.round(w * 0.04),
      }}>
        {isAgent && atk !== undefined && def !== undefined ? (
          <>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: Math.max(fontSize + 0.5, 7),
              color: buffed ? '#39ff14' : '#e0e0ff',
              fontWeight: 700,
            }}>
              ⚔{atk}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: Math.max(fontSize + 0.5, 7),
              color: '#5588ff',
              fontWeight: 700,
            }}>
              🛡{def}
            </span>
          </>
        ) : (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 1, 5), color: accentColor, opacity: 0.7 }}>
            {card.effect?.type?.toUpperCase() ?? ''}
          </span>
        )}
      </div>

    </div>
  );
}

// ── Hover Preview Portal ──────────────────────────────────────────────────────
function HoverPreview({ card, inPlay, ec, rarityBorderColor }: {
  card: Card;
  inPlay?: CardInPlay;
  ec: { primary: string; glow: string; bg: string };
  rarityBorderColor: string | null;
}) {
  const pw = 220;
  const ph = 320;
  const accentColor = rarityBorderColor ?? ec.primary;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88 }}
        transition={{ duration: 0.15 }}
        style={{
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: `0 0 0 2px ${accentColor}, 0 0 40px ${accentColor}88, 0 0 80px rgba(0,0,0,0.85)`,
        }}
      >
        <CardFrame
          card={card}
          inPlay={inPlay}
          ec={ec}
          rarityBorderColor={rarityBorderColor}
          w={pw}
          h={ph}
          fontSize={10}
          fullDetail={true}
        />
      </motion.div>
    </div>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ec = ENERGY_COLORS[card.energy];

  const { w, h, fontSize } = SIZE_DIMS[size];
  const cardMods        = card.mods;
  const modRarity       = cardMods?.modRarity;
  const rarityBorderColor = modRarity && modRarity !== 'common' ? MOD_RARITY_COLOR[modRarity] : null;
  const accentColor     = rarityBorderColor ?? ec.primary;

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setHovered(true), 400);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(false);
  };

  if (size === 'mini') {
    return (
      <div style={{
        width: w, height: h,
        background: ec.bg,
        borderRadius: 3,
        border: `1px solid ${accentColor}66`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        opacity: tapped ? 0.65 : 1,
        flexShrink: 0,
      }}
        onClick={disabled ? undefined : onClick}
      >
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CardArt card={card} width={w} height={h - 14} />
        </div>
        <div style={{
          height: 14,
          background: '#06060f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 2px',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 5.5, color: accentColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        onClick={disabled ? undefined : onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          borderRadius: 5,
          overflow: 'hidden',
          border: selected
            ? `2px solid #fff`
            : attacking
            ? `2px solid #ff4444`
            : `1px solid ${accentColor}88`,
          boxShadow: selected
            ? `0 0 16px #fff8, 0 0 8px ${accentColor}`
            : attacking
            ? `0 0 14px #ff4444`
            : rarityBorderColor
            ? `0 0 10px ${rarityBorderColor}66`
            : `0 0 6px ${ec.glow}44`,
          cursor: disabled ? 'default' : 'pointer',
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
          <div style={{
            width: w, height: h,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'repeating-linear-gradient(45deg, #0a0a1a 0px, #0a0a1a 4px, #111133 4px, #111133 8px)',
          }}>
            <span style={{ color: '#1a1a3a', fontSize: 20 }}>?</span>
          </div>
        ) : (
          <CardFrame
            card={card}
            inPlay={inPlay}
            ec={ec}
            rarityBorderColor={rarityBorderColor}
            w={w}
            h={h}
            fontSize={fontSize}
            fullDetail={false}
          />
        )}

        {/* Energy shimmer effects */}
        {!faceDown && card.energy === 'volt' && (
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(120deg, transparent 0%, rgba(255,240,0,0.06) 40%, transparent 60%)',
            pointerEvents: 'none', zIndex: 10,
          }}
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          />
        )}
        {!faceDown && card.energy === 'cipher' && (
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.05) 50%, transparent 100%)',
            pointerEvents: 'none', zIndex: 10,
          }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.div>

      {/* Hover preview portal */}
      <AnimatePresence>
        {hovered && !faceDown && (
          <HoverPreview card={card} inPlay={inPlay} ec={ec} rarityBorderColor={rarityBorderColor} />
        )}
      </AnimatePresence>
    </>
  );
}
