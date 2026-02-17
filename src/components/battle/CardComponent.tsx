'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, CardInPlay } from '@/types/card';
import { ENERGY_COLORS, TYPE_LABEL } from '@/utils/energyColors';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';
import { MOD_MAP } from '@/data/mods';
import CardArt from './CardArt';

// ── Frame PNG: load once, remove white pixels, cache as data URL ─────────────
let frameSrc: string = '/Cards/Frame Agents.png';
let frameReady = false;
let frameCallbacks: (() => void)[] = [];

function loadProcessedFrame(onReady: () => void) {
  if (frameReady) { onReady(); return; }
  frameCallbacks.push(onReady);
  if (frameCallbacks.length > 1) return;
  const img = new window.Image();
  img.src = '/Cards/Frame Agents.png';
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 220 && d.data[i+1] > 220 && d.data[i+2] > 220)
        d.data[i+3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    frameSrc = c.toDataURL('image/png');
    frameReady = true;
    frameCallbacks.forEach(cb => cb());
    frameCallbacks = [];
  };
}

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

// ── Hover Preview Portal ──────────────────────────────────────────────────────
function HoverPreview({ card, inPlay, ec, rarityBorderColor }: {
  card: Card;
  inPlay?: CardInPlay;
  ec: { primary: string; glow: string; bg: string };
  rarityBorderColor: string | null;
}) {
  const pw = 200;
  const ph = 280;
  const isAgent = card.type === 'agent';
  const atk = inPlay?.currentAttack ?? card.attack;
  const def = inPlay?.currentDefense ?? card.defense;
  const cardMods = card.mods;
  const modSlots = cardMods?.mods.length ?? 0;

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
          background: ec.bg,
          borderRadius: 6,
          boxShadow: `0 0 40px ${rarityBorderColor ?? ec.primary}, 0 0 80px rgba(0,0,0,0.8)`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Frame overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frameSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', zIndex: 3 }} />

        {/* Artwork behind frame */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <CardArt card={card} width={pw} height={ph} />
        </div>

        {/* Content above frame */}
        <div style={{ position: 'relative', zIndex: 4, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 0' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: ec.primary, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 5px' }}>
              {card.cost}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: ec.primary, opacity: 0.8 }}>
              {TYPE_LABEL[card.type]}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Bottom info */}
          <div style={{ padding: '0 8px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#e0e0ff', textShadow: `0 0 6px ${ec.primary}`, marginBottom: 4 }}>
              {card.name}
            </div>
            {isAgent && atk !== undefined && def !== undefined ? (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e0e0ff', fontWeight: 700, marginBottom: 4 }}>
                ⚔{atk} <span style={{ color: '#6666aa' }}>|</span> 🛡{def}
              </div>
            ) : (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#aaaacc', lineHeight: 1.4, marginBottom: 4 }}>
                {card.description}
              </p>
            )}
            {/* Mods */}
            {cardMods && modSlots > 0 && (
              <div style={{ borderTop: `1px solid ${rarityBorderColor ?? ec.primary}44`, paddingTop: 4, marginTop: 2 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: rarityBorderColor ?? ec.primary, letterSpacing: '0.1em', marginBottom: 3 }}>
                  {(cardMods.modRarity ?? 'common').toUpperCase()} · {modSlots} MOD{modSlots > 1 ? 'S' : ''}
                </div>
                {cardMods.mods.map((applied, i) => {
                  const mod = MOD_MAP[applied.modId];
                  if (!mod) return null;
                  const tier = applied.tier as 1 | 2 | 3;
                  return (
                    <div key={i} style={{ marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: TIER_COLOR[tier], fontWeight: 700, marginRight: 4 }}>{TIER_LABEL[tier]}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#e0e0ff' }}>{mod.name}</span>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: '#8888aa', marginLeft: 8 }}>{mod.tiers[tier].description}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
  const [, forceUpdate] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ec = ENERGY_COLORS[card.energy];

  useEffect(() => {
    if (!frameReady) loadProcessedFrame(() => forceUpdate(n => n + 1));
  }, []);

  const { w, h, fontSize } = SIZE_DIMS[size];
  const isAgent = card.type === 'agent';
  const atk = inPlay?.currentAttack ?? card.attack;
  const def = inPlay?.currentDefense ?? card.defense;
  const buffed = inPlay && (
    (inPlay.currentAttack  !== (card.attack  ?? 0)) ||
    (inPlay.currentDefense !== (card.defense ?? 0))
  );

  const cardMods = card.mods;
  const modRarity = cardMods?.modRarity;
  const rarityBorderColor = modRarity && modRarity !== 'common' ? MOD_RARITY_COLOR[modRarity] : null;
  const modSlots = cardMods?.mods.length ?? 0;

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
          background: ec.bg,
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
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'repeating-linear-gradient(45deg, #0a0a1a 0px, #0a0a1a 4px, #111133 4px, #111133 8px)',
            position: 'relative', zIndex: 1,
          }}>
            <span style={{ color: '#1a1a3a', fontSize: 20 }}>?</span>
          </div>
        ) : (
          <>
            {/* Layer 1: Artwork fills entire card */}
            {size !== 'mini' && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <CardArt card={card} width={w} height={h} />
              </div>
            )}

            {/* Layer 2: Frame PNG (white removed) over artwork */}
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

            {/* Layer 3: Text content above frame */}
            {/* Name in the frame's top name bar (7.2%–14.6% from top) */}
            <div style={{
              position: 'absolute', zIndex: 3,
              top: `${h * 0.072}px`, height: `${h * 0.074}px`,
              left: `${w * 0.08}px`, right: `${w * 0.08}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: fontSize,
                fontWeight: 700,
                color: '#1a1005',
                textAlign: 'center',
                lineHeight: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {card.name}
              </span>
            </div>

            {/* Cost badge top-left */}
            <div style={{
              position: 'absolute', zIndex: 3,
              top: 3, left: 4,
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize + 1, fontWeight: 700,
                color: ec.primary, background: 'rgba(0,0,0,0.7)', borderRadius: 2, padding: '0 3px',
              }}>
                {card.cost}
              </span>
            </div>

            {/* Type badge top-right */}
            <div style={{
              position: 'absolute', zIndex: 3,
              top: 4, right: 4,
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize - 1, color: ec.primary, opacity: 0.85 }}>
                {TYPE_LABEL[card.type]}
              </span>
            </div>

            {/* Stats / description at bottom */}
            <div style={{
              position: 'absolute', zIndex: 3,
              bottom: 4, left: 4, right: 4,
            }}>
              {isAgent && atk !== undefined && def !== undefined ? (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize + 0.5,
                    color: buffed ? '#39ff14' : '#e0e0ff', fontWeight: 700,
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  }}>
                    ⚔{atk} <span style={{ color: '#6666aa' }}>|</span> 🛡{def}
                  </span>
                </div>
              ) : size !== 'mini' ? (
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: fontSize - 0.5,
                  color: '#ccccee', lineHeight: 1.2, overflow: 'hidden',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)', margin: 0,
                }}>
                  {card.description}
                </p>
              ) : null}

              {/* Mod dot indicators */}
              {modSlots > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                  {Array.from({ length: modSlots }).map((_, i) => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: 1,
                      background: rarityBorderColor ?? ec.primary,
                      boxShadow: `0 0 3px ${rarityBorderColor ?? ec.primary}`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Volt shimmer */}
            {card.energy === 'volt' && (
              <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, transparent 0%, rgba(255,240,0,0.06) 40%, transparent 60%)', pointerEvents: 'none', zIndex: 4 }}
                animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
              />
            )}

            {/* Cipher shimmer */}
            {card.energy === 'cipher' && (
              <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(0,240,255,0.05) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 4 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </>
        )}
      </motion.div>

      {/* Hover preview portal — large card at screen center */}
      <AnimatePresence>
        {hovered && !faceDown && (
          <HoverPreview card={card} inPlay={inPlay} ec={ec} rarityBorderColor={rarityBorderColor} />
        )}
      </AnimatePresence>
    </>
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
