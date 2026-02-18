'use client';

import { useEffect, useRef } from 'react';
import type { Card } from '@/types/card';
import { seededRandom } from '@/utils/seededRandom';
import { MOD_MAP } from '@/data/mods';

// Energy base colors
const ENERGY_BASE: Record<string, [string, string]> = {
  volt:    ['#1a1400', '#ffe600'],
  cipher:  ['#001a1a', '#00f0ff'],
  rust:    ['#1a0d00', '#ff6622'],
  phantom: ['#0d0014', '#c850ff'],
  synth:   ['#001a08', '#39ff14'],
  neutral: ['#0d0d1a', '#8888cc'],
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Procedural agent art ─────────────────────────────────────────────────────
function drawAgentArt(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
) {
  const modKey = card.mods?.mods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_') ?? '';
  const seed = `agent__${card.id}__${modKey}`;
  const rng = seededRandom(seed);

  const [bgColor, accentColor] = ENERGY_BASE[card.energy] ?? ENERGY_BASE.neutral;
  const [ar, ag, ab] = hexToRgb(accentColor);

  ctx.clearRect(0, 0, width, height);

  // Background gradient
  const grad = ctx.createLinearGradient(0, height, width, 0);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(0.6, `rgba(${ar},${ag},${ab},0.08)`);
  grad.addColorStop(1, bgColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Grid lines (tech floor)
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 8) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 8) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.restore();

  const cx = width / 2;
  const cy = height * 0.52;

  // Body silhouette (geometric humanoid)
  ctx.save();
  ctx.globalAlpha = 0.55;

  // Torso
  const torsoW = width * 0.28;
  const torsoH = height * 0.3;
  const torsoY = cy - torsoH * 0.3;
  ctx.fillStyle = `rgba(${ar},${ag},${ab},0.25)`;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(cx - torsoW / 2, torsoY, torsoW, torsoH);
  ctx.fill();
  ctx.stroke();

  // Head (hexagon)
  const headR = width * 0.13;
  const headY = torsoY - headR * 1.1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = cx + Math.cos(angle) * headR;
    const py = headY + Math.sin(angle) * headR;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye glow
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = accentColor;
  const eyeW = headR * 0.55;
  const eyeH = headR * 0.15;
  ctx.beginPath();
  ctx.ellipse(cx, headY, eyeW, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow glow under eye
  ctx.globalAlpha = 0.35;
  const eyeGlow = ctx.createRadialGradient(cx, headY, 0, cx, headY, headR);
  eyeGlow.addColorStop(0, accentColor);
  eyeGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = eyeGlow;
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR, headR * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = width * 0.06;
  ctx.lineCap = 'round';
  // Left arm
  const armY = torsoY + torsoH * 0.2;
  const armLen = torsoH * 0.55;
  const armAngle = 0.3 + rng() * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - torsoW / 2, armY);
  ctx.lineTo(cx - torsoW / 2 - Math.cos(armAngle) * armLen, armY + Math.sin(armAngle) * armLen);
  ctx.stroke();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(cx + torsoW / 2, armY);
  ctx.lineTo(cx + torsoW / 2 + Math.cos(armAngle) * armLen, armY + Math.sin(armAngle) * armLen);
  ctx.stroke();

  // Legs
  ctx.lineWidth = width * 0.07;
  const legTop = torsoY + torsoH;
  const legLen = height * 0.22;
  const legSpread = torsoW * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - legSpread, legTop);
  ctx.lineTo(cx - legSpread - width * 0.04, legTop + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + legSpread, legTop);
  ctx.lineTo(cx + legSpread + width * 0.04, legTop + legLen);
  ctx.stroke();

  ctx.restore();

  // Chest detail — energy core
  ctx.save();
  ctx.globalAlpha = 0.7;
  const coreR = width * 0.055;
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
  coreGrad.addColorStop(0, accentColor);
  coreGrad.addColorStop(0.4, `rgba(${ar},${ag},${ab},0.5)`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Scanline effect
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = accentColor;
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  // Particle dots
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = accentColor;
  const dotCount = 5 + Math.floor(rng() * 5);
  for (let i = 0; i < dotCount; i++) {
    const px = Math.floor(rng() * width);
    const py = Math.floor(rng() * height);
    ctx.beginPath();
    ctx.arc(px, py, rng() * 1.5 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Procedural canvas art (non-agent types) ──────────────────────────────────
function drawProceduralArt(
  ctx: CanvasRenderingContext2D,
  card: Card,
  width: number,
  height: number,
) {
  const modKey = card.mods?.mods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_') ?? '';
  const seed = `${card.id}__${modKey}`;
  const rng = seededRandom(seed);

  const [bgColor, accentColor] = ENERGY_BASE[card.energy] ?? ENERGY_BASE.neutral;
  const [ar, ag, ab] = hexToRgb(accentColor);

  ctx.clearRect(0, 0, width, height);

  // ── Background ──────────────────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, `rgba(${ar},${ag},${ab},0.12)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // ── Rarity overlay ──────────────────────────────────────────────────────────
  const modRarity = card.mods?.modRarity ?? 'common';
  if (modRarity === 'overclocked' || modRarity === 'corrupted') {
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let y = 0; y < height; y += 4) {
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }
  if (modRarity === 'corrupted') {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const bars = Math.floor(rng() * 3) + 1;
    for (let i = 0; i < bars; i++) {
      const by = Math.floor(rng() * height);
      const bh = Math.floor(rng() * 6) + 2;
      ctx.fillStyle = `rgba(${ar},${ag},${ab},0.6)`;
      ctx.fillRect(0, by, width, bh);
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(rng() * width * 0.4), by, Math.floor(rng() * width * 0.6), bh);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // ── Circuit lines ───────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 0.5;
  const lineCount = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < lineCount; i++) {
    const sx = Math.floor(rng() * width);
    const sy = Math.floor(rng() * height);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const mx = sx + (rng() < 0.5 ? Math.floor(rng() * 30) : -Math.floor(rng() * 30));
    ctx.lineTo(mx, sy);
    ctx.lineTo(mx, sy + Math.floor(rng() * 30) - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, sy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
  }
  ctx.restore();

  // ── Main shape ──────────────────────────────────────────────────────────────
  const cx = width / 2;
  const cy = height * 0.42;

  ctx.save();
  ctx.globalAlpha = 0.55;

  if (card.type === 'script') {
    const r = Math.min(width, height) * 0.28;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.8;
    const spokes = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.stroke();
    }

  } else if (card.type === 'malware') {
    const br = width * 0.2;
    ctx.fillStyle = `rgba(${ar},${ag},${ab},0.25)`;
    ctx.beginPath();
    const pts = 8;
    for (let i = 0; i <= pts; i++) {
      const angle = (i / pts) * Math.PI * 2;
      const jitter = br * (0.8 + rng() * 0.4);
      const px = cx + Math.cos(angle) * jitter;
      const py = cy + Math.sin(angle) * jitter * 0.9;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + rng() * 0.5;
      const len = br * (1.4 + rng() * 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * br * 0.8, cy + Math.sin(angle) * br * 0.8);
      ctx.quadraticCurveTo(
        cx + Math.cos(angle + 0.4) * len * 0.6, cy + Math.sin(angle + 0.4) * len * 0.6,
        cx + Math.cos(angle) * len, cy + Math.sin(angle) * len,
      );
      ctx.stroke();
    }

  } else if (card.type === 'trap') {
    const s = width * 0.22;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    for (let i = -4; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? accentColor : 'transparent';
      const offset = i * s * 0.35;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(offset, -s * 1.2, s * 0.3, s * 2.4);
      ctx.restore();
    }
  }
  ctx.restore();

  // ── Mod effects overlay ──────────────────────────────────────────────────────
  const mods = card.mods?.mods ?? [];
  for (const applied of mods) {
    const mod = MOD_MAP[applied.modId];
    if (!mod) continue;
    const sp = mod.tiers[applied.tier]?.special ?? '';

    ctx.save();
    ctx.globalAlpha = 0.25;

    if (sp.startsWith('drain') || sp.startsWith('vamp')) {
      ctx.fillStyle = '#c850ff';
      for (let i = 0; i < 6; i++) {
        const px = cx + (rng() - 0.5) * width * 0.6;
        const py = cy + (rng() - 0.5) * height * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sp.startsWith('stealth')) {
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.setLineDash([]);
    } else if (sp.startsWith('overclock') || sp.startsWith('oc_')) {
      ctx.fillStyle = '#ffe600';
      for (let i = 0; i < 8; i++) {
        const sx2 = cx + (rng() - 0.5) * width * 0.8;
        const sy2 = cy + (rng() - 0.5) * height * 0.7;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2 - 4);
        ctx.lineTo(sx2 + 2, sy2);
        ctx.lineTo(sx2 - 1, sy2 + 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (sp.startsWith('detonate')) {
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 4; i++) {
        const sx2 = cx + (rng() - 0.5) * width * 0.4;
        const sy2 = cy + (rng() - 0.5) * height * 0.4;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2 + (rng() - 0.5) * 20, sy2 + (rng() - 0.5) * 20);
        ctx.stroke();
      }
    } else if (sp.startsWith('regen')) {
      ctx.fillStyle = '#39ff14';
      for (let i = 0; i < 6; i++) {
        const px = cx + (rng() - 0.5) * width * 0.5;
        const py = cy + height * 0.2 - rng() * height * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sp.startsWith('armor')) {
      ctx.strokeStyle = '#aaccff';
      ctx.lineWidth = 2;
      const pl = 8;
      ctx.beginPath();
      ctx.moveTo(4, 4 + pl); ctx.lineTo(4, 4); ctx.lineTo(4 + pl, 4);
      ctx.moveTo(width - 4 - pl, 4); ctx.lineTo(width - 4, 4); ctx.lineTo(width - 4, 4 + pl);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Particle dots ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = accentColor;
  const dotCount = 4 + Math.floor(rng() * 6);
  for (let i = 0; i < dotCount; i++) {
    const px = Math.floor(rng() * width);
    const py = Math.floor(rng() * height);
    const pr = rng() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CardArt({ card, width, height }: { card: Card; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (card.type === 'agent') {
      drawAgentArt(ctx, card, width, height);
    } else {
      drawProceduralArt(ctx, card, width, height);
    }
  }, [card, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', borderRadius: 2, pointerEvents: 'none' }}
    />
  );
}
