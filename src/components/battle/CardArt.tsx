'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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

const FRAME_SRC = '/Cards/Frame Agents.png';

// Module-level cache so we only fetch once per session
let agentArtCache: string[] | null = null;
let agentArtPromise: Promise<string[]> | null = null;

function fetchAgentArt(): Promise<string[]> {
  if (agentArtCache) return Promise.resolve(agentArtCache);
  if (agentArtPromise) return agentArtPromise;
  agentArtPromise = fetch('/api/card-art')
    .then((r) => r.json())
    .then((files: string[]) => {
      agentArtCache = files.length > 0 ? files : ['/Cards/Art/Agent 1.png'];
      return agentArtCache;
    })
    .catch(() => {
      agentArtCache = ['/Cards/Art/Agent 1.png'];
      return agentArtCache;
    });
  return agentArtPromise;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
  const [agentArtList, setAgentArtList] = useState<string[]>(agentArtCache ?? []);

  const isAgent = card.type === 'agent';

  // Load agent art list once (cached at module level)
  useEffect(() => {
    if (!isAgent) return;
    fetchAgentArt().then(setAgentArtList);
  }, [isAgent]);

  // Seeded art pick — stable as long as list is the same
  const modKey = card.mods?.mods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_') ?? '';
  const seed = `${card.id}__${modKey}`;
  const rng = seededRandom(seed);
  const pool = agentArtList.length > 0 ? agentArtList : ['/Cards/Art/Agent 1.png'];
  const agentArtSrc = pool[Math.floor(rng() * pool.length)];

  useEffect(() => {
    if (isAgent) return; // agent uses <img> layers, not canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawProceduralArt(ctx, card, width, height);
  }, [card, width, height, isAgent]);

  if (isAgent) {
    // Layered: artwork image + frame overlay with multiply blend
    return (
      <div style={{ position: 'relative', width, height, borderRadius: 2, overflow: 'hidden' }}>
        {/* Agent artwork underneath */}
        <Image
          src={agentArtSrc}
          alt=""
          fill
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes={`${width}px`}
          priority={false}
        />
        {/* Frame on top — multiply blend erases the white center, keeps dark frame pixels */}
        <Image
          src={FRAME_SRC}
          alt=""
          fill
          style={{
            objectFit: 'fill',
            mixBlendMode: 'multiply',
          }}
          sizes={`${width}px`}
          priority={false}
        />
      </div>
    );
  }

  // Non-agent: procedural canvas + frame overlay
  return (
    <div style={{ position: 'relative', width, height, borderRadius: 2, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', borderRadius: 2 }}
      />
      <Image
        src={FRAME_SRC}
        alt=""
        fill
        style={{
          objectFit: 'fill',
          mixBlendMode: 'multiply',
        }}
        sizes={`${width}px`}
        priority={false}
      />
    </div>
  );
}
