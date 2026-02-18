'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardInPlay } from '@/types/card';
import { ENERGY_COLORS, TYPE_LABEL } from '@/utils/energyColors';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { MOD_MAP } from '@/data/mods';
import CardArt from './CardArt';

// ── Frame PNG: pre-processed (white pixels removed, cropped to bounding box) ──
// No runtime processing needed — just use the PNG directly
const frameSrc = '/Cards/Frame Agents.png';

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Frame zone proportions (measured from processed frame PNG 988×1328) ───────
// Name bar:    top 2%–12%    of card height  (dark top section)
// Artwork:     top 12%–69%   of card height  (transparent window)
// Text area:   top 69%–85%   of card height  (dark text zone)
// Stats bar:   top 94%–100%  of card height  (bottom light strip)
// Cost badge:  top 2%–12%, left 3%–18%

const F = {
  nameTop:    0.02,
  nameBot:    0.12,
  artTop:     0.12,
  artBot:     0.69,
  textTop:    0.69,
  textBot:    0.85,
  statsTop:   0.94,
  statsBot:   1.00,
  costLeft:   0.03,
  costRight:  0.18,
};

// ── Shared card interior layout (used by both card and hover preview) ─────────
function CardLayout({
  card,
  inPlay,
  ec,
  rarityBorderColor,
  w,
  h,
  fontSize,
  showMods = false,
}: {
  card: Card;
  inPlay?: CardInPlay;
  ec: { primary: string; glow: string; bg: string };
  rarityBorderColor: string | null;
  w: number;
  h: number;
  fontSize: number;
  showMods?: boolean;
}) {
  const isAgent = card.type === 'agent';
  const atk = inPlay?.currentAttack ?? card.attack;
  const def = inPlay?.currentDefense ?? card.defense;
  const buffed = inPlay && (
    (inPlay.currentAttack  !== (card.attack  ?? 0)) ||
    (inPlay.currentDefense !== (card.defense ?? 0))
  );
  const cardMods = card.mods;
  const modSlots = cardMods?.mods.length ?? 0;

  // Pixel positions
  const nameTop    = h * F.nameTop;
  const nameH      = h * (F.nameBot - F.nameTop);
  const artTop     = h * F.artTop;
  const artH       = h * (F.artBot - F.artTop);
  const textTop    = h * F.textTop;
  const textH      = h * (F.textBot - F.textTop);
  const statsTop   = h * F.statsTop;
  const statsH     = h * (F.statsBot - F.statsTop);
  const costLeft   = w * F.costLeft;
  const costW      = w * (F.costRight - F.costLeft);

  return (
    <>
      {/* ── Artwork behind frame — fills entire card, visible through transparent window */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <CardArt card={card} width={w} height={h} />
      </div>

      {/* ── Frame PNG on top of artwork (has transparent window at 12%–69%) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameSrc}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── Name in top bar */}
      <div style={{
        position: 'absolute', zIndex: 3,
        top: nameTop,
        left: w * 0.16, right: w * 0.06,
        height: nameH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: Math.max(fontSize, h * 0.055),
          fontWeight: 700,
          color: ec.primary,
          textShadow: `0 0 6px ${ec.primary}88`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          lineHeight: 1,
        }}>
          {card.name}
        </span>
      </div>

      {/* ── Cost in top-left esagon zone */}
      <div style={{
        position: 'absolute', zIndex: 3,
        top: nameTop,
        left: costLeft,
        width: costW,
        height: nameH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: Math.max(fontSize + 1, h * 0.055),
          fontWeight: 700,
          color: ec.primary,
          lineHeight: 1,
        }}>
          {card.cost}
        </span>
      </div>

      {/* ── Text area (dark zone in frame) — description or mods */}
      <div style={{
        position: 'absolute', zIndex: 3,
        top: textTop, height: textH,
        left: w * 0.06, right: w * 0.06,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        overflow: 'hidden',
        paddingTop: 2,
      }}>
        {showMods && cardMods && modSlots > 0 ? (
          <>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: Math.max(fontSize - 2, 6),
              color: rarityBorderColor ?? ec.primary,
              letterSpacing: '0.08em',
              marginBottom: 2,
              fontWeight: 700,
            }}>
              {(cardMods.modRarity ?? 'common').toUpperCase()} · {modSlots} MOD{modSlots > 1 ? 'S' : ''}
            </div>
            {cardMods.mods.map((applied, i) => {
              const mod = MOD_MAP[applied.modId];
              if (!mod) return null;
              const tier = applied.tier as 1 | 2 | 3;
              return (
                <div key={i} style={{ marginBottom: 1 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 2, 6), color: TIER_COLOR[tier], fontWeight: 700, marginRight: 3 }}>{TIER_LABEL[tier]}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 2, 6), color: '#e0e0ff' }}>{mod.name}</span>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 3, 5.5), color: '#8888aa', marginLeft: 6 }}>{mod.tiers[tier].description}</div>
                </div>
              );
            })}
          </>
        ) : (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: Math.max(fontSize - 1, 6),
            color: '#ccccee',
            lineHeight: 1.25,
            margin: 0,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: showMods ? 3 : 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {card.description}
          </p>
        )}
      </div>

      {/* ── Stats bar at very bottom */}
      <div style={{
        position: 'absolute', zIndex: 3,
        top: statsTop, height: statsH,
        left: 0, right: 0,
        display: 'flex', alignItems: 'center',
        paddingLeft: w * 0.05, paddingRight: w * 0.05,
        gap: w * 0.025,
      }}>
        {isAgent && atk !== undefined && def !== undefined ? (
          <>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize, h * 0.05), color: buffed ? '#39ff14' : '#e0e0ff', fontWeight: 700 }}>
              ⚔ {atk}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize, h * 0.05), color: '#6699ff', fontWeight: 700 }}>
              🛡 {def}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 1, 5.5), color: ec.primary, opacity: 0.9 }}>
              {TYPE_LABEL[card.type]}
            </span>
          </>
        ) : (
          <>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: Math.max(fontSize - 1, 5.5), color: ec.primary, opacity: 0.9 }}>
              {TYPE_LABEL[card.type]}
            </span>
          </>
        )}
      </div>
    </>
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
  const ph = 308; // same ~2:2.8 ratio as frame

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
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.15 }}
        style={{
          width: pw,
          height: ph,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 0 40px ${rarityBorderColor ?? ec.primary}, 0 0 80px rgba(0,0,0,0.8)`,
          borderRadius: 4,
        }}
      >
        {/* Dark bg so frame areas look correct */}
        <div style={{ position: 'absolute', inset: 0, background: ec.bg, zIndex: 0 }} />

        <CardLayout
          card={card}
          inPlay={inPlay}
          ec={ec}
          rarityBorderColor={rarityBorderColor}
          w={pw}
          h={ph}
          fontSize={10}
          showMods={true}
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
  const cardMods = card.mods;
  const modRarity = cardMods?.modRarity;
  const rarityBorderColor = modRarity && modRarity !== 'common' ? MOD_RARITY_COLOR[modRarity] : null;

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setHovered(true), 400);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(false);
  };

  return (
    <>
      <motion.div
        onClick={disabled ? undefined : onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: w,
          height: h,
          border: 'none',
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
        {/* Dark bg */}
        <div style={{ position: 'absolute', inset: 0, background: ec.bg, zIndex: 0 }} />

        {faceDown ? (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'repeating-linear-gradient(45deg, #0a0a1a 0px, #0a0a1a 4px, #111133 4px, #111133 8px)',
          }}>
            <span style={{ color: '#1a1a3a', fontSize: 20 }}>?</span>
          </div>
        ) : size === 'mini' ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frameSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', zIndex: 2 }} />
            <div style={{ position: 'absolute', zIndex: 3, bottom: 2, left: 2, right: 2, textAlign: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 5.5, color: ec.primary, fontWeight: 700 }}>{card.name}</span>
            </div>
          </>
        ) : (
          <CardLayout
            card={card}
            inPlay={inPlay}
            ec={ec}
            rarityBorderColor={rarityBorderColor}
            w={w}
            h={h}
            fontSize={fontSize}
            showMods={false}
          />
        )}

        {/* Energy shimmer */}
        {!faceDown && card.energy === 'volt' && (
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, transparent 0%, rgba(255,240,0,0.06) 40%, transparent 60%)', pointerEvents: 'none', zIndex: 5 }}
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          />
        )}
        {!faceDown && card.energy === 'cipher' && (
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.05) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 5 }}
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
