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

export default function CardArt({ card, width, height }: { card: Card; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use uniqueId if present, otherwise baseCard.id + mods for determinism
    const modKey = card.mods?.mods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_') ?? '';
    const seed = `${card.id}__${modKey}`;
    const rng = seededRandom(seed);

    const [bgColor, accentColor] = ENERGY_BASE[card.energy] ?? ENERGY_BASE.neutral;
    const [ar, ag, ab] = hexToRgb(accentColor);

    ctx.clearRect(0, 0, width, height);

    // ── Background ────────────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, `rgba(${ar},${ag},${ab},0.12)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // ── Rarity overlay ────────────────────────────────────────────────────────
    const modRarity = card.mods?.modRarity ?? 'common';
    if (modRarity === 'overclocked' || modRarity === 'corrupted') {
      // Scanlines / glitch
      ctx.save();
      ctx.globalAlpha = 0.08;
      for (let y = 0; y < height; y += 4) {
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }
    if (modRarity === 'corrupted') {
      // Glitch horizontal bars
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

    // ── Circuit lines ─────────────────────────────────────────────────────────
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
      // L-shaped circuit line
      const mx = sx + (rng() < 0.5 ? Math.floor(rng() * 30) : -Math.floor(rng() * 30));
      ctx.lineTo(mx, sy);
      ctx.lineTo(mx, sy + Math.floor(rng() * 30) - 15);
      ctx.stroke();
      // Node dot
      ctx.beginPath();
      ctx.arc(mx, sy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
    }
    ctx.restore();

    // ── Main shape ────────────────────────────────────────────────────────────
    const cx = width / 2;
    const cy = height * 0.42;

    ctx.save();
    ctx.globalAlpha = 0.55;

    if (card.type === 'agent') {
      // Humanoid silhouette (head + body outline)
      const headR = width * 0.13;
      const bodyW = width * 0.28;
      const bodyH = height * 0.28;
      // Body
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - bodyW / 2, cy, bodyW, bodyH);
      // Head
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.6, headR, 0, Math.PI * 2);
      ctx.stroke();
      // Eyes
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx - headR * 0.35, cy - headR * 0.7, headR * 0.2, 0, Math.PI * 2);
      ctx.arc(cx + headR * 0.35, cy - headR * 0.7, headR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Chest detail
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(cx - bodyW * 0.25, cy + bodyH * 0.2, bodyW * 0.5, bodyH * 0.3);

    } else if (card.type === 'script') {
      // Runic circle
      const r = Math.min(width, height) * 0.28;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // Inner ring
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
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
      // Blob with tentacles
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
      // Tentacles
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
      // Diamond grid
      const s = width * 0.22;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.2;
      // Outer diamond
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
      ctx.closePath();
      ctx.stroke();
      // Cross
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
      ctx.stroke();
      // Warning stripes
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

    // ── Mod effects overlay ───────────────────────────────────────────────────
    const mods = card.mods?.mods ?? [];
    for (const applied of mods) {
      const mod = MOD_MAP[applied.modId];
      if (!mod) continue;
      const sp = mod.tiers[applied.tier]?.special ?? '';

      ctx.save();
      ctx.globalAlpha = 0.25;

      if (sp.startsWith('drain') || sp.startsWith('vamp')) {
        // Purple drip dots
        ctx.fillStyle = '#c850ff';
        for (let i = 0; i < 6; i++) {
          const px = cx + (rng() - 0.5) * width * 0.6;
          const py = cy + (rng() - 0.5) * height * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sp.startsWith('stealth')) {
        // Dashed outline overlay
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.strokeRect(4, 4, width - 8, height - 8);
        ctx.setLineDash([]);
      } else if (sp.startsWith('overclock') || sp.startsWith('oc_')) {
        // Yellow sparks
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
        // Red cracks
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
        // Green ascending particles
        ctx.fillStyle = '#39ff14';
        for (let i = 0; i < 6; i++) {
          const px = cx + (rng() - 0.5) * width * 0.5;
          const py = cy + height * 0.2 - rng() * height * 0.4;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sp.startsWith('armor')) {
        // Shield plates at corners
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

    // ── Particle dots ─────────────────────────────────────────────────────────
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

  }, [card, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', borderRadius: 2 }}
    />
  );
}
