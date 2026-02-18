'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useExploration } from '@/hooks/useExploration';
import { DIALOGUES } from '@/data/dialogues';
import { ENEMIES } from '@/data/enemies';
import type { MapData } from '@/data/maps';
import ExplorationHUD from './ExplorationHUD';
import VirtualJoystick from './VirtualJoystick';
import DialogueBox from '@/components/ui/DialogueBox';
import type { Dialogue } from '@/data/dialogues';

interface ExplorationViewProps {
  mapData: MapData;
  onBattleStart: (enemyId: string, enemyProfileId: string) => void;
  onShopOpen: () => void;
  onDeckOpen: () => void;
  onCraftingOpen: () => void;
  onTerminalAction?: (dialogueId: string) => void; // custom terminal actions (e.g. zone_portal)
  isActive: boolean;              // true when this screen is visible
  lastBattleResult?: 'win' | 'lose' | null;
}

export default function ExplorationView({
  mapData,
  onBattleStart,
  onShopOpen,
  onDeckOpen,
  onCraftingOpen,
  onTerminalAction,
  isActive,
  lastBattleResult,
}: ExplorationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState } = useGameStore();

  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  const [activeDialogue, setActiveDialogue] = useState<Dialogue | null>(null);
  const [bossBlockedMsg, setBossBlockedMsg] = useState<string | null>(null);

  const defeatedEnemies = gameState?.progress.defeatedEnemies ?? [];
  const defeatedCount   = defeatedEnemies.length;

  const handleEnemyContact = useCallback(
    (enemyId: string, enemyProfileId: string) => {
      if (defeatedEnemies.includes(enemyId)) return;
      // Show pre-battle dialogue first
      const profile = ENEMIES[enemyProfileId];
      if (profile?.dialogue.preBattle) {
        setActiveDialogue({
          id: `pre_${enemyId}`,
          speaker: profile.name,
          lines: [profile.dialogue.preBattle],
        });
        // Trigger battle after dialogue closes
        setTimeout(() => onBattleStart(enemyId, enemyProfileId), 100);
      } else {
        onBattleStart(enemyId, enemyProfileId);
      }
    },
    [defeatedEnemies, onBattleStart]
  );

  const handleNPCContact = useCallback(
    (_npcId: string, dialogueId: string) => {
      const d = DIALOGUES[dialogueId];
      if (d) setActiveDialogue(d);
    },
    []
  );

  const handleDealerContact = useCallback(() => {
    onShopOpen();
  }, [onShopOpen]);

  const handleBossGateContact = useCallback(
    (bossProfileId: string, requiredKills: number) => {
      if (defeatedCount < requiredKills) {
        setBossBlockedMsg(
          `You need to defeat ${requiredKills} enemies first. (${defeatedCount}/${requiredKills})`
        );
        setTimeout(() => setBossBlockedMsg(null), 3000);
      } else {
        onBattleStart('boss_gate', bossProfileId);
      }
    },
    [defeatedCount, onBattleStart]
  );

  const handleTerminalContact = useCallback((dialogueId: string) => {
    if (dialogueId === 'crafting_terminal') {
      onCraftingOpen();
      return;
    }
    if (dialogueId === 'deck_terminal') {
      onDeckOpen();
      return;
    }
    // Custom terminal actions (zone_portal, etc.)
    if (dialogueId === 'zone_portal' && onTerminalAction) {
      onTerminalAction(dialogueId);
      return;
    }
    // Default: show dialogue
    const d = DIALOGUES[dialogueId];
    if (d) setActiveDialogue(d);
  }, [onCraftingOpen, onDeckOpen, onTerminalAction]);

  const { engineRef, entitiesRef, resetContactCooldown, teleportToSpawn } = useExploration(canvasRef, mapData, defeatedEnemies, {
    onEnemyContact:    handleEnemyContact,
    onNPCContact:      handleNPCContact,
    onDealerContact:   handleDealerContact,
    onBossGateContact: handleBossGateContact,
    onTerminalContact: handleTerminalContact,
  }, joystick, isActive);

  // When this screen becomes active again (returning from battle/shop/crafting),
  // reset contact cooldown so the player can immediately interact with entities.
  useEffect(() => {
    if (isActive) resetContactCooldown();
  }, [isActive, resetContactCooldown]);

  // Teleport to spawn when the last battle result was a loss
  useEffect(() => {
    if (isActive && lastBattleResult === 'lose') {
      teleportToSpawn();
    }
  }, [isActive, lastBattleResult, teleportToSpawn]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Main map canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
      />

      {/* HUD overlay */}
      <ExplorationHUD
        health={gameState?.player.health ?? 20}
        maxHealth={gameState?.player.maxHealth ?? 20}
        credits={gameState?.player.credits ?? 0}
        defeatedCount={defeatedCount}
        requiredKills={3}
        engineRef={engineRef}
        entitiesRef={entitiesRef}
        onInventory={onDeckOpen}
      />

      {/* Mobile joystick */}
      <div
        className="absolute bottom-5 left-5"
        style={{ zIndex: 10, touchAction: 'none' }}
      >
        <VirtualJoystick onChange={(x, y) => setJoystick({ x, y })} />
      </div>

      {/* Boss blocked message */}
      {bossBlockedMsg && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-sm text-center pointer-events-none"
          style={{
            zIndex: 20,
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #ff0044',
            color: '#ff0044',
            padding: '12px 20px',
          }}
        >
          {bossBlockedMsg}
        </div>
      )}

      {/* Dialogue box */}
      {activeDialogue && !activeDialogue.id.startsWith('pre_') && (
        <DialogueBox
          dialogue={activeDialogue}
          onClose={() => setActiveDialogue(null)}
        />
      )}
    </div>
  );
}
