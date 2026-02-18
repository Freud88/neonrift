'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useZoneExploration, type ZoneCallbacks } from '@/hooks/useZoneExploration';
import { RiftDecayEngine } from '@/engine/RiftDecayEngine';
import { rollCorruption, CORRUPTION_MAP } from '@/data/riftCorruptions';
import ZoneHUD from './ZoneHUD';
import StageTransition from './StageTransition';
import VirtualJoystick from '@/components/exploration/VirtualJoystick';
import type { ZoneConfig } from '@/types/zone';
import type { ZoneState } from '@/types/zone';

// ── Event Log types ───────────────────────────────────────────────────────────
export type RiftEventSeverity = 'info' | 'success' | 'warning' | 'danger' | 'legendary';

export interface RiftEvent {
  id: string;
  timestampMs: number; // rift elapsed ms when the event happened
  icon: string;
  message: string;
  severity: RiftEventSeverity;
}

interface ZoneExplorationViewProps {
  zoneConfig: ZoneConfig;
  zoneState: ZoneState;
  onEnemyBattle: (enemyKey: string, profileSeed: string) => void;
  onCacheLoot: (cacheKey: string, cacheSeed: string) => void;
  onBossBattle: () => void;
  onExit: () => void;
  onForgeKey: () => void;
  isActive: boolean;
}

export default function ZoneExplorationView({
  zoneConfig,
  zoneState,
  onEnemyBattle,
  onCacheLoot,
  onBossBattle,
  onExit,
  onForgeKey,
  isActive,
}: ZoneExplorationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState } = useGameStore();
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [riftEvents, setRiftEvents] = useState<RiftEvent[]>([]);
  const [showDeckViewer, setShowDeckViewer] = useState(false);
  const lastStormTickRef = useRef<number>(0);

  function addRiftEvent(ev: Omit<RiftEvent, 'id' | 'timestampMs'>) {
    setRiftEvents((prev) => {
      const newEv: RiftEvent = {
        ...ev,
        id: `${Date.now()}_${Math.random()}`,
        timestampMs: decayRef.current?.getElapsedMs() ?? 0,
      };
      const updated = [...prev, newEv];
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
    });
  }

  // ── Rift Decay Engine ────────────────────────────────────────────────────
  const [riftElapsedMs, setRiftElapsedMs] = useState(zoneState.riftClock?.elapsedMs ?? 0);
  const [riftStage, setRiftStage] = useState(zoneState.riftClock?.currentStage ?? 0);
  const [riftStageProgress, setRiftStageProgress] = useState(0);
  const [transitionStage, setTransitionStage] = useState<number | null>(null);

  const decayRef = useRef<RiftDecayEngine | null>(null);
  if (!decayRef.current) {
    decayRef.current = new RiftDecayEngine(zoneConfig.level, (newStage) => {
      setRiftStage(newStage);
      // Show stage transition overlay
      setTransitionStage(newStage);
      setTimeout(() => setTransitionStage(null), 2000);
      // Log stage change
      addRiftEvent({
        icon: '🔴',
        message: `Stage ${newStage}: ${['Stable', 'Flickering', 'Unstable', 'Fracturing', 'Collapsing', 'Void Breach'][newStage] ?? 'Unknown'}`,
        severity: newStage >= 4 ? 'danger' : 'warning',
      });
      // Roll a new corruption at stage 2+
      useGameStore.setState((s) => {
        if (!s.activeZone) return s;
        const existing = s.activeZone.activeCorruptions ?? [];
        let newCorruptions = existing;
        if (newStage >= 2) {
          const corruption = rollCorruption(newStage, existing);
          if (corruption) {
            newCorruptions = [...existing, corruption.id];
            // Log new corruption
            addRiftEvent({
              icon: '🔴',
              message: `Corruption: ${corruption.name} — ${corruption.description}`,
              severity: 'danger',
            });
          }
        }
        return {
          activeZone: {
            ...s.activeZone,
            riftClock: { elapsedMs: decayRef.current!.getElapsedMs(), currentStage: newStage },
            activeCorruptions: newCorruptions,
          },
        };
      });
    });
    // Restore from saved state
    if (zoneState.riftClock?.elapsedMs > 0) {
      decayRef.current.restore(zoneState.riftClock.elapsedMs, zoneState.riftClock.currentStage);
    }
  }

  // Tick the decay engine each frame
  useEffect(() => {
    if (!isActive) return;
    let lastTime = performance.now();
    let lastSave = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (decayRef.current && delta > 0 && delta < 1000) {
        decayRef.current.tick(delta);
        setRiftElapsedMs(decayRef.current.getElapsedMs());
        setRiftStageProgress(decayRef.current.getStageProgress());

        // Storm ticks: damage player periodically based on active storm corruptions
        const zone = useGameStore.getState().activeZone;
        if (zone) {
          let stormDmg = 0;
          let stormInterval = 30000; // default 30s
          for (const cid of zone.activeCorruptions ?? []) {
            const c = CORRUPTION_MAP[cid];
            if (c?.effect.type === 'storms') {
              stormDmg += c.effect.value;
              if (cid === 'C16') stormInterval = 20000; // Severe Storm is faster
            }
          }
          if (stormDmg > 0 && now - lastStormTickRef.current >= stormInterval) {
            lastStormTickRef.current = now;
            useGameStore.getState().takeDamage(stormDmg);
            addRiftEvent({
              icon: '⛈',
              message: `Data Storm: ${stormDmg} damage!`,
              severity: 'warning',
            });
          }
        }

        // Persist rift clock to store every 2 seconds so it survives unmount
        if (now - lastSave > 2000) {
          lastSave = now;
          useGameStore.setState((s) => {
            if (!s.activeZone) return s;
            return {
              activeZone: {
                ...s.activeZone,
                riftClock: {
                  elapsedMs: decayRef.current!.getElapsedMs(),
                  currentStage: decayRef.current!.getCurrentStage(),
                },
              },
            };
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Save rift clock on cleanup (battle transition, exit, etc.)
      if (decayRef.current) {
        useGameStore.setState((s) => {
          if (!s.activeZone) return s;
          return {
            activeZone: {
              ...s.activeZone,
              riftClock: {
                elapsedMs: decayRef.current!.getElapsedMs(),
                currentStage: decayRef.current!.getCurrentStage(),
              },
            },
          };
        });
      }
    };
  }, [isActive]);

  const handleEnemyContact: ZoneCallbacks['onEnemyContact'] = useCallback(
    (enemyKey, profileSeed) => {
      addRiftEvent({ icon: '⚔', message: 'Entering battle...', severity: 'info' });
      onEnemyBattle(enemyKey, profileSeed);
    },
    [onEnemyBattle],
  );

  const handleCacheContact: ZoneCallbacks['onCacheContact'] = useCallback(
    (cacheKey, cacheSeed) => {
      addRiftEvent({ icon: '📦', message: 'Loot cache opened!', severity: 'success' });
      onCacheLoot(cacheKey, cacheSeed);
    },
    [onCacheLoot],
  );

  const handleBossContact: ZoneCallbacks['onBossContact'] = useCallback(() => {
    addRiftEvent({ icon: '⭐', message: 'Boss encounter started!', severity: 'legendary' });
    onBossBattle();
  }, [onBossBattle]);

  const { engineRef, chunkMgrRef, entitiesRef, resetContactCooldown, spawnBoss, markBossDefeated } = useZoneExploration(
    canvasRef,
    zoneConfig,
    zoneState,
    { onEnemyContact: handleEnemyContact, onCacheContact: handleCacheContact, onBossContact: handleBossContact },
    joystick,
    isActive,
  );

  // Spawn boss when key is forged
  const prevBossSpawned = useRef(false);
  useEffect(() => {
    if (zoneState.bossSpawned && !prevBossSpawned.current) {
      prevBossSpawned.current = true;
      spawnBoss();
    }
  }, [zoneState.bossSpawned, spawnBoss]);

  // Mark boss defeated visually
  useEffect(() => {
    if (zoneState.bossDefeated) {
      markBossDefeated();
    }
  }, [zoneState.bossDefeated, markBossDefeated]);

  useEffect(() => {
    if (isActive) resetContactCooldown();
  }, [isActive, resetContactCooldown]);

  // Sync decay stage to chunk manager (new chunks will use the current stage)
  useEffect(() => {
    if (chunkMgrRef.current) {
      chunkMgrRef.current.decayStage = riftStage;
    }
  }, [riftStage, chunkMgrRef]);

  const handleForgeKey = useCallback(() => {
    onForgeKey();
  }, [onForgeKey]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
      />

      <ZoneHUD
        health={gameState?.player.health ?? 20}
        maxHealth={gameState?.player.maxHealth ?? 20}
        credits={gameState?.player.credits ?? 0}
        zoneState={zoneState}
        engineRef={engineRef}
        entitiesRef={entitiesRef}
        riftElapsedMs={riftElapsedMs}
        riftStage={riftStage}
        riftStageProgress={riftStageProgress}
        onExit={onExit}
        onForgeKey={handleForgeKey}
        onOpenDeck={() => setShowDeckViewer(true)}
      />

      {/* Stage transition overlay */}
      <StageTransition stage={transitionStage} />

      <div
        className="absolute bottom-5 left-5"
        style={{ zIndex: 10, touchAction: 'none' }}
      >
        <VirtualJoystick onChange={(x, y) => setJoystick({ x, y })} />
      </div>

      {/* Event Log — bottom-left, above joystick on desktop */}
      <RiftEventLog events={riftEvents} />

      {/* Deck Viewer overlay */}
      {showDeckViewer && (
        <DeckViewer
          deck={gameState?.deck ?? []}
          corruptions={zoneState.activeCorruptions}
          onClose={() => setShowDeckViewer(false)}
        />
      )}
    </div>
  );
}

// ── Rift Event Log ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<RiftEventSeverity, string> = {
  info:      '#888888',
  success:   '#39ff14',
  warning:   '#ffe600',
  danger:    '#ff2222',
  legendary: '#ffd700',
};

function formatRiftTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function RiftEventLog({ events }: { events: RiftEvent[] }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: 12,
        width: 300,
        maxHeight: 160,
        background: 'rgba(0,0,0,0.7)',
        border: '1px solid #333',
        borderRadius: 8,
        backdropFilter: 'blur(4px)',
        zIndex: 10,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #333', fontSize: 10, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
        <span>EVENT LOG</span>
        <span>{events.length}</span>
      </div>
      <div
        ref={logRef}
        style={{ overflowY: 'auto', maxHeight: 130, padding: '4px 0' }}
      >
        {events.map((ev) => (
          <div key={ev.id} style={{ display: 'flex', gap: 6, padding: '1px 8px', fontSize: 10 }}>
            <span style={{ color: '#444', flexShrink: 0 }}>{formatRiftTime(ev.timestampMs)}</span>
            <span style={{ color: SEVERITY_COLORS[ev.severity] }}>{ev.icon} {ev.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Deck Viewer overlay ──────────────────────────────────────────────────────

import type { Card } from '@/types/card';
import { CORRUPTION_MAP as CM } from '@/data/riftCorruptions';
import CardComponent from '@/components/battle/CardComponent';

function DeckViewer({
  deck,
  corruptions,
  onClose,
}: {
  deck: Card[];
  corruptions: string[];
  onClose: () => void;
}) {
  const totalCost = deck.reduce((s, c) => s + c.cost, 0);
  const avgCost = deck.length > 0 ? (totalCost / deck.length).toFixed(1) : '0';
  const junkCount = deck.filter((c) => c.id === 'junk_data').length;
  const agentCount = deck.filter((c) => c.type === 'agent').length;
  const scriptCount = deck.filter((c) => c.type !== 'agent' && c.id !== 'junk_data').length;

  // Sort: agents first, then scripts/malware/trap, then junk
  const sorted = [...deck].sort((a, b) => {
    const rank = (c: Card) => c.id === 'junk_data' ? 2 : c.type === 'agent' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.cost - b.cost;
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          maxWidth: 960,
          margin: '0 auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #00f0ff33',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ color: '#00f0ff', fontFamily: 'var(--font-display, monospace)', fontSize: 15, fontWeight: 700 }}>
              📋 DECK — {deck.length} cards
            </span>
            <span style={{ fontSize: 11, color: '#555' }}>
              Avg cost <span style={{ color: '#aaa' }}>{avgCost}</span>
              {' · '}Agents <span style={{ color: '#39ff14' }}>{agentCount}</span>
              {' · '}Scripts <span style={{ color: '#00f0ff' }}>{scriptCount}</span>
              {junkCount > 0 && <><span style={{ color: '#555' }}>{' · '}</span><span style={{ color: '#ff4444' }}>Junk {junkCount}</span></>}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #333', borderRadius: 4, color: '#888', fontSize: 13, cursor: 'pointer', padding: '4px 10px', fontFamily: 'monospace' }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Active Corruptions */}
        {corruptions.length > 0 && (
          <div style={{
            padding: '8px 20px',
            borderBottom: '1px solid #ff440022',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
            background: 'rgba(255,40,0,0.04)',
          }}>
            <span style={{ fontSize: 10, color: '#555', alignSelf: 'center', flexShrink: 0 }}>CORRUPTIONS:</span>
            {corruptions.map((cid) => {
              const c = CM[cid];
              if (!c) return null;
              return (
                <span key={cid} style={{ fontSize: 11, color: '#ff6644', background: 'rgba(255,40,0,0.12)', borderRadius: 4, padding: '2px 7px', border: '1px solid #ff444422' }}>
                  {c.icon} {c.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Card grid */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignContent: 'flex-start',
        }}>
          {sorted.map((card, i) => (
            <CardComponent
              key={card.uniqueId ?? `${card.id}_${i}`}
              card={card}
              size="hand"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
