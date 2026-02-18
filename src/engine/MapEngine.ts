import { TILE, type MapData, type MapObject, type TileType } from '@/data/maps';

// ─── Tile colors ──────────────────────────────────────────────────────────────
const TILE_COLORS: Record<TileType, { base: string; detail: string }> = {
  [TILE.FLOOR]: { base: '#0d0d1a', detail: '#111133' },
  [TILE.WALL]:  { base: '#0a0a0f', detail: '#1a1a2e' },
  [TILE.WATER]: { base: '#001a1a', detail: '#003333' },
  [TILE.ROAD]:  { base: '#111122', detail: '#1a1a33' },
  [TILE.ALLEY]: { base: '#0e0e1e', detail: '#141428' },
};

const TILE_SIZE = 32;

export interface SpriteEntity {
  id: string;
  x: number;       // pixel position (center)
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  type: 'player' | 'enemy' | 'npc' | 'dealer' | 'boss_gate' | 'terminal';
  defeated?: boolean;
  label?: string;
  difficulty?: number;
  isBoss?: boolean;
  facing?: 'left' | 'right';   // last horizontal direction
  // wandering AI
  wanderTarget?: { x: number; y: number };
  wanderTimer?: number;
  aggroRange?: number;
  chaseRange?: number;
}

export interface Camera {
  x: number;
  y: number;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

export class MapEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapData: MapData;
  private camera: Camera = { x: 0, y: 0 };
  private frameCount = 0;
  private rainDrops: RainDrop[] = [];

  // Player sprite animation sets
  private sprites: {
    idle:       HTMLImageElement[];
    walkRight:  HTMLImageElement[];
    walkLeft:   HTMLImageElement[];
  } = { idle: [], walkRight: [], walkLeft: [] };
  private playerSpritesLoaded = false;

  constructor(canvas: HTMLCanvasElement, mapData: MapData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mapData = mapData;
    this._initRain();
    this._loadPlayerSprites();
  }

  private _loadPlayerSprites() {
    type SpriteKey = 'idle' | 'walkRight' | 'walkLeft';
    const sets: { key: SpriteKey; paths: string[] }[] = [
      { key: 'idle',      paths: ['drifter_idle1.png', 'drifter_idle2.png'] },
      { key: 'walkRight', paths: ['drifter_walk_right1.png', 'drifter_walk_right2.png', 'drifter_walk_right3.png', 'drifter_walk_right4.png'] },
      { key: 'walkLeft',  paths: ['drifter_walk_left1.png',  'drifter_walk_left2.png',  'drifter_walk_left3.png',  'drifter_walk_left4.png'] },
    ];
    const base = '/assets/sprites/drifter/';
    const total = sets.reduce((acc, s) => acc + s.paths.length, 0);
    let loaded = 0;

    for (const set of sets) {
      this.sprites[set.key] = set.paths.map((name) => {
        const img = new Image();
        img.src = base + name;
        img.onload = () => {
          loaded++;
          if (loaded === total) this.playerSpritesLoaded = true;
        };
        return img;
      });
    }
  }

  private _initRain() {
    this.rainDrops = Array.from({ length: 80 }, () => ({
      x: Math.random() * 1200,
      y: Math.random() * 900,
      speed: 6 + Math.random() * 8,
      length: 8 + Math.random() * 14,
      opacity: 0.04 + Math.random() * 0.1,
    }));
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  updateCamera(playerX: number, playerY: number) {
    const targetX = playerX - this.canvas.width / 2;
    const targetY = playerY - this.canvas.height / 2;
    const mapW = this.mapData.width * TILE_SIZE;
    const mapH = this.mapData.height * TILE_SIZE;

    this.camera.x = Math.max(0, Math.min(targetX, mapW - this.canvas.width));
    this.camera.y = Math.max(0, Math.min(targetY, mapH - this.canvas.height));
  }

  // ── Collision helpers ───────────────────────────────────────────────────────
  isTileWalkable(tileX: number, tileY: number): boolean {
    if (
      tileX < 0 || tileY < 0 ||
      tileX >= this.mapData.width ||
      tileY >= this.mapData.height
    ) return false;
    const t = this.mapData.tiles[tileY][tileX];
    return t !== TILE.WALL && t !== TILE.WATER;
  }

  // Check if a circle (px,py,r) collides with any wall tile
  circleCollidesWithWalls(px: number, py: number, r: number): boolean {
    const left   = Math.floor((px - r) / TILE_SIZE);
    const right  = Math.floor((px + r) / TILE_SIZE);
    const top    = Math.floor((py - r) / TILE_SIZE);
    const bottom = Math.floor((py + r) / TILE_SIZE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (!this.isTileWalkable(tx, ty)) {
          // AABB vs circle — approximate with tile center proximity
          const tileCX = tx * TILE_SIZE + TILE_SIZE / 2;
          const tileCY = ty * TILE_SIZE + TILE_SIZE / 2;
          const closestX = Math.max(tx * TILE_SIZE, Math.min(px, (tx + 1) * TILE_SIZE));
          const closestY = Math.max(ty * TILE_SIZE, Math.min(py, (ty + 1) * TILE_SIZE));
          const dx = px - closestX;
          const dy = py - closestY;
          if (dx * dx + dy * dy < r * r) return true;
          void tileCX; void tileCY;
        }
      }
    }
    return false;
  }

  // Swap the active map data (used for zone chunk streaming)
  setMapData(newMapData: MapData) {
    this.mapData = newMapData;
  }

  getCamera(): Camera { return { ...this.camera }; }

  tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * TILE_SIZE + TILE_SIZE / 2,
      y: tileY * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  pixelToTile(px: number, py: number): { x: number; y: number } {
    return {
      x: Math.floor(px / TILE_SIZE),
      y: Math.floor(py / TILE_SIZE),
    };
  }

  // ── Rendering ───────────────────────────────────────────────────────────────
  render(entities: SpriteEntity[]) {
    this.frameCount++;
    const { ctx, canvas, camera } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawTiles();
    this.drawEntities(entities);
    this.drawRain();
  }

  private drawRain() {
    const { ctx, canvas } = this;
    ctx.save();
    for (const drop of this.rainDrops) {
      ctx.strokeStyle = `rgba(0, 240, 255, ${drop.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.length * 0.15, drop.y + drop.length);
      ctx.stroke();

      drop.y += drop.speed;
      drop.x -= drop.speed * 0.15;
      if (drop.y > canvas.height + 20) {
        drop.y = -20;
        drop.x = Math.random() * canvas.width;
      }
      if (drop.x < -20) {
        drop.x = canvas.width + 20;
      }
    }
    ctx.restore();
  }

  private drawTiles() {
    const { ctx, canvas, camera, mapData } = this;
    const startTX = Math.floor(camera.x / TILE_SIZE);
    const startTY = Math.floor(camera.y / TILE_SIZE);
    const endTX   = Math.min(mapData.width  - 1, Math.ceil((camera.x + canvas.width)  / TILE_SIZE));
    const endTY   = Math.min(mapData.height - 1, Math.ceil((camera.y + canvas.height) / TILE_SIZE));

    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const tileType = mapData.tiles[ty][tx] as TileType;
        const col = TILE_COLORS[tileType];
        const sx = tx * TILE_SIZE - camera.x;
        const sy = ty * TILE_SIZE - camera.y;

        ctx.fillStyle = col.base;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

        // Tile details
        if (tileType === TILE.WALL) {
          this.drawWallTile(sx, sy);
        } else if (tileType === TILE.ROAD || tileType === TILE.ALLEY) {
          this.drawRoadTile(sx, sy, tileType, tx, ty);
        } else if (tileType === TILE.WATER) {
          this.drawWaterTile(sx, sy);
        } else {
          // floor subtle grid
          ctx.strokeStyle = 'rgba(0,240,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private drawWallTile(sx: number, sy: number) {
    const { ctx } = this;
    const s = TILE_SIZE;
    // Building face
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(sx + 1, sy + 1, s - 2, s - 2);
    // Window (random per tile but stable — use position as seed)
    const hasWindow = (Math.round(sx / s + sy / s) % 3 !== 0);
    if (hasWindow) {
      const winColors = ['#ffe600', '#00f0ff', '#ff00aa', '#39ff14'];
      const wc = winColors[Math.floor((sx / s + sy / s * 7)) % winColors.length];
      const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.03 + (sx + sy) * 0.1);
      ctx.fillStyle = wc;
      ctx.globalAlpha = 0.3 + 0.2 * pulse;
      ctx.fillRect(sx + 8, sy + 8, 6, 5);
      ctx.fillRect(sx + 18, sy + 8, 6, 5);
      ctx.globalAlpha = 1;
    }
    // Wall border neon
    ctx.strokeStyle = 'rgba(0,240,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(sx, sy, s, s);
  }

  private drawRoadTile(sx: number, sy: number, type: TileType, tx: number, ty: number) {
    const { ctx } = this;
    const s = TILE_SIZE;
    const isRoad = type === TILE.ROAD;
    // Center stripe
    ctx.fillStyle = isRoad ? 'rgba(0,240,255,0.06)' : 'rgba(255,0,170,0.04)';
    ctx.fillRect(sx + s * 0.35, sy, s * 0.3, s);
    // Neon edge lines
    ctx.strokeStyle = isRoad ? 'rgba(0,240,255,0.15)' : 'rgba(255,0,170,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 1); ctx.lineTo(sx + s, sy + 1);
    ctx.moveTo(sx, sy + s - 1); ctx.lineTo(sx + s, sy + s - 1);
    ctx.stroke();
    void tx; void ty;
  }

  private drawWaterTile(sx: number, sy: number) {
    const { ctx } = this;
    const s = TILE_SIZE;
    const wave = Math.sin(this.frameCount * 0.05 + sx * 0.1) * 2;
    ctx.fillStyle = '#002222';
    ctx.fillRect(sx, sy, s, s);
    ctx.fillStyle = `rgba(0,255,200,0.15)`;
    ctx.fillRect(sx, sy + 8 + wave, s, 6);
    ctx.fillRect(sx, sy + 20 + wave, s, 4);
  }

  private drawEntities(entities: SpriteEntity[]) {
    const { ctx, camera } = this;

    for (const e of entities) {
      if (e.defeated) continue;

      const sx = e.x - camera.x;
      const sy = e.y - camera.y;

      // Skip if off-screen
      if (sx < -60 || sx > this.canvas.width + 60 || sy < -60 || sy > this.canvas.height + 60) continue;

      ctx.save();

      if (e.type === 'player') {
        this.drawPlayer(sx, sy, e);
      } else if (e.type === 'enemy') {
        this.drawEnemy(sx, sy, e);
      } else if (e.type === 'npc') {
        this.drawNPC(sx, sy, e);
      } else if (e.type === 'dealer') {
        this.drawDealer(sx, sy);
      } else if (e.type === 'boss_gate') {
        this.drawBossGate(sx, sy);
      } else if (e.type === 'terminal') {
        this.drawTerminal(sx, sy);
      }

      ctx.restore();
    }
  }

  private drawPlayer(sx: number, sy: number, e: SpriteEntity) {
    const { ctx } = this;
    const r = e.radius;
    const pulse = 0.7 + 0.3 * Math.sin(this.frameCount * 0.08);

    // Neon glow halo (always drawn, even behind the sprite)
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
    grd.addColorStop(0, `rgba(0,240,255,${0.22 * pulse})`);
    grd.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.playerSpritesLoaded) {
      const isMovingH = Math.abs(e.vx) > 0.1;
      let frames: HTMLImageElement[];
      let frameDuration: number;

      if (isMovingH) {
        frames = e.facing === 'left' ? this.sprites.walkLeft : this.sprites.walkRight;
        frameDuration = 8; // switch frame every 8 render frames (~0.13 s at 60 fps)
      } else {
        frames = this.sprites.idle;
        frameDuration = 30; // slower idle
      }

      const frameIdx = Math.floor(this.frameCount / frameDuration) % frames.length;
      const img = frames[frameIdx];
      const spriteW = 32;
      const spriteH = 32;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sx - spriteW / 2, sy - spriteH / 2, spriteW, spriteH);
    } else {
      // Fallback: plain cyan circle until images load
      ctx.fillStyle = '#1a1a3a';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawEnemy(sx: number, sy: number, e: SpriteEntity) {
    const { ctx } = this;
    const r = e.radius;
    const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.07 + e.x);

    // Outer energy aura
    const gradient = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r + 10);
    gradient.addColorStop(0, `${e.glowColor}22`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Glow
    ctx.shadowColor = e.glowColor;
    ctx.shadowBlur = 14 * pulse;

    // Body
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Enemy ring
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner X mark
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1.5;
    const d = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx - d, sy - d); ctx.lineTo(sx + d, sy + d);
    ctx.moveTo(sx + d, sy - d); ctx.lineTo(sx - d, sy + d);
    ctx.stroke();

    // Difficulty stars above
    if (e.difficulty) {
      ctx.font = '8px monospace';
      ctx.fillStyle = '#ffe600';
      ctx.textAlign = 'center';
      const stars = '★'.repeat(e.difficulty);
      ctx.fillText(stars, sx, sy - r - 4);
    }

    // Boss indicator
    if (e.isBoss) {
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = '#ff00aa';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', sx, sy - r - 13);
    }
  }

  private drawNPC(sx: number, sy: number, e: SpriteEntity) {
    const { ctx } = this;
    const r = e.radius;

    // Friendly glow
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Speech bubble indicator (bouncing)
    const bounce = Math.sin(this.frameCount * 0.1) * 2;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#39ff14';
    ctx.textAlign = 'center';
    ctx.fillText('💬', sx, sy - r - 6 + bounce);

    // Name
    if (e.label) {
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillStyle = '#39ff14';
      ctx.textAlign = 'center';
      ctx.fillText(e.label, sx, sy - r - 16 + bounce);
    }
  }

  private drawDealer(sx: number, sy: number) {
    const { ctx } = this;
    const r = 14;
    const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.06);

    ctx.shadowColor = '#c850ff';
    ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = '#1a0a1a';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c850ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#c850ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', sx, sy);
    ctx.textBaseline = 'alphabetic';

    ctx.font = '7px monospace';
    ctx.fillStyle = '#c850ff';
    ctx.fillText('DEALER', sx, sy - r - 5);
  }

  private drawBossGate(sx: number, sy: number) {
    const { ctx } = this;
    const w = 28;
    const h = 36;
    const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.05);

    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 16 * pulse;

    // Gate frame
    ctx.strokeStyle = '#ff0044';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx - w / 2, sy - h / 2, w, h);

    // Inner fill
    ctx.fillStyle = `rgba(255,0,68,${0.08 + 0.07 * pulse})`;
    ctx.fillRect(sx - w / 2, sy - h / 2, w, h);

    // Warning icon
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff0044';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', sx, sy);
    ctx.textBaseline = 'alphabetic';

    ctx.shadowBlur = 0;
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#ff0044';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS GATE', sx, sy - h / 2 - 6);
  }

  private drawTerminal(sx: number, sy: number) {
    const { ctx } = this;
    const r = 10;
    const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.04);

    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 8 * pulse;
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - r, sy - r, r * 2, r * 2);
    ctx.fillStyle = '#110e00';
    ctx.fillRect(sx - r + 1, sy - r + 1, r * 2 - 2, r * 2 - 2);
    ctx.shadowBlur = 0;

    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffe600';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', sx, sy);
    ctx.textBaseline = 'alphabetic';
  }

  // ── Minimap ─────────────────────────────────────────────────────────────────
  drawMinimap(
    miniCtx: CanvasRenderingContext2D,
    mW: number,
    mH: number,
    player: SpriteEntity,
    entities: SpriteEntity[]
  ) {
    const { mapData } = this;
    const scaleX = mW / (mapData.width  * TILE_SIZE);
    const scaleY = mH / (mapData.height * TILE_SIZE);

    miniCtx.clearRect(0, 0, mW, mH);

    // Background
    miniCtx.fillStyle = 'rgba(5,5,15,0.9)';
    miniCtx.fillRect(0, 0, mW, mH);

    // Tiles — simplified
    for (let ty = 0; ty < mapData.height; ty++) {
      for (let tx = 0; tx < mapData.width; tx++) {
        const t = mapData.tiles[ty][tx] as TileType;
        const mx = tx * TILE_SIZE * scaleX;
        const my = ty * TILE_SIZE * scaleY;
        const mts = Math.max(1, TILE_SIZE * scaleX);
        if (t === TILE.WALL) {
          miniCtx.fillStyle = '#1a1a2e';
        } else if (t === TILE.ROAD || t === TILE.ALLEY) {
          miniCtx.fillStyle = '#1a1a44';
        } else {
          miniCtx.fillStyle = '#0a0a1a';
        }
        miniCtx.fillRect(mx, my, mts, mts);
      }
    }

    // Entities
    for (const e of entities) {
      if (e.defeated) continue;
      const mx = e.x * scaleX;
      const my = e.y * scaleY;
      let col = '#888888';
      if (e.type === 'player')    col = '#00f0ff';
      else if (e.type === 'enemy') col = e.isBoss ? '#ff0044' : '#ff8800';
      else if (e.type === 'npc')  col = '#39ff14';
      else if (e.type === 'dealer') col = '#c850ff';
      else if (e.type === 'boss_gate') col = '#ff0044';
      else if (e.type === 'terminal') col = '#ffe600';

      miniCtx.fillStyle = col;
      const dot = e.type === 'player' ? 3 : 2;
      miniCtx.beginPath();
      miniCtx.arc(mx, my, dot, 0, Math.PI * 2);
      miniCtx.fill();
    }

    // Camera viewport rect
    miniCtx.strokeStyle = 'rgba(0,240,255,0.3)';
    miniCtx.lineWidth = 0.5;
    miniCtx.strokeRect(
      this.camera.x * scaleX,
      this.camera.y * scaleY,
      this.canvas.width * scaleX,
      this.canvas.height * scaleY
    );

    // Border
    miniCtx.strokeStyle = 'rgba(0,240,255,0.4)';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(0, 0, mW, mH);
  }
}
