'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { CRAFTING_ITEMS } from '@/data/craftingItems';
import { MODS, MOD_MAP } from '@/data/mods';
import { generateModdedCard, rarityFromModCount } from '@/utils/cardMods';
import type { Card } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import CardComponent from '@/components/battle/CardComponent';
import NeonButton from '@/components/ui/NeonButton';

interface CraftingPanelProps {
  onClose: () => void;
}

export default function CraftingPanel({ onClose }: CraftingPanelProps) {
  const { gameState, removeCraftingItem } = useGameStore();
  const [selectedItem, setSelectedItem]   = useState<CraftingItemId | null>(null);
  const [selectedCard, setSelectedCard]   = useState<Card | null>(null);
  const [result, setResult]               = useState<string | null>(null);
  const [resultCard, setResultCard]       = useState<Card | null>(null);

  const inventory = gameState?.inventory ?? [];
  const collection = gameState?.collection ?? [];

  const itemDef = selectedItem ? CRAFTING_ITEMS[selectedItem] : null;

  // ── Apply crafting item to selected card ────────────────────────────────────

  const handleCraft = useCallback(() => {
    if (!selectedItem || !selectedCard || !gameState) return;

    const consumed = removeCraftingItem(selectedItem);
    if (!consumed) return;

    let newCard: Card = selectedCard;
    let msg = '';

    switch (selectedItem) {
      case 'data_fragment': {
        // Add 1 random mod to the card
        const currentMods = selectedCard.mods?.mods ?? [];
        const newCount = Math.min(4, currentMods.length + 1);
        newCard = generateModdedCard(
          { ...selectedCard, mods: undefined },
          newCount
        );
        // Preserve existing mods and append
        const existingMods = currentMods.slice(0, currentMods.length);
        const freshMods = newCard.mods?.mods ?? [];
        const addedMod = freshMods[freshMods.length - 1];
        if (addedMod) {
          const allMods = [...existingMods, addedMod];
          newCard = generateModdedCard({ ...selectedCard, mods: undefined }, allMods.length);
        }
        msg = `Added a new mod to ${newCard.mods?.displayName ?? newCard.name}`;
        break;
      }
      case 'wipe_drive': {
        newCard = { ...selectedCard, mods: undefined };
        msg = `Stripped all mods from ${selectedCard.name}`;
        break;
      }
      case 'recompiler': {
        const count = selectedCard.mods?.mods.length ?? 1;
        newCard = generateModdedCard({ ...selectedCard, mods: undefined }, count);
        msg = `Re-rolled mods on ${newCard.mods?.displayName ?? newCard.name}`;
        break;
      }
      case 'tier_boost': {
        if (!selectedCard.mods || selectedCard.mods.mods.length === 0) {
          msg = 'No mods to upgrade!';
          setResult(msg);
          return;
        }
        // Upgrade the lowest-tier mod (tier 3 → tier 2 → tier 1)
        const mods = [...selectedCard.mods.mods];
        const idx = mods.reduce((best, m, i) =>
          mods[i].tier > mods[best].tier ? i : best, 0);
        mods[idx] = { ...mods[idx], tier: Math.max(1, mods[idx].tier - 1) as 1 | 2 | 3 };
        newCard = {
          ...selectedCard,
          mods: { ...selectedCard.mods, mods },
        };
        const modName = MOD_MAP[mods[idx].modId]?.name ?? mods[idx].modId;
        msg = `Upgraded ${modName} to Tier ${mods[idx].tier}`;
        break;
      }
      case 'quantum_lock': {
        if (!selectedCard.mods || selectedCard.mods.mods.length === 0) {
          msg = 'No mods to lock!';
          setResult(msg);
          return;
        }
        // Lock a random unlocked mod
        const unlocked = selectedCard.mods.mods.filter(
          (m) => !selectedCard.mods!.locked.includes(m.modId)
        );
        if (unlocked.length === 0) {
          msg = 'All mods are already locked!';
          setResult(msg);
          return;
        }
        const target = unlocked[Math.floor(Math.random() * unlocked.length)];
        newCard = {
          ...selectedCard,
          mods: {
            ...selectedCard.mods,
            locked: [...selectedCard.mods.locked, target.modId],
          },
        };
        msg = `Locked mod: ${MOD_MAP[target.modId]?.name ?? target.modId}`;
        break;
      }
      case 'architects_key': {
        // Add a random boss mod
        const bossMods = MODS.filter((m) => m.isBossMod);
        const pick = bossMods[Math.floor(Math.random() * bossMods.length)];
        if (!pick) { msg = 'No boss mods available!'; setResult(msg); return; }
        const existingMods = selectedCard.mods?.mods ?? [];
        if (existingMods.length >= 4) {
          msg = 'Card already has 4 mods — use Wipe Drive first!';
          setResult(msg);
          return;
        }
        newCard = {
          ...selectedCard,
          mods: {
            mods: [...existingMods, { modId: pick.id, tier: 2 }],
            modRarity: rarityFromModCount(existingMods.length + 1),
            displayName: selectedCard.mods?.displayName ?? selectedCard.name,
            locked: selectedCard.mods?.locked ?? [],
          },
        };
        msg = `Boss mod "${pick.name}" added!`;
        break;
      }
      default:
        msg = 'Unknown item';
    }

    // Update card in collection
    useGameStore.setState((s) => {
      if (!s.gameState) return s;
      return {
        gameState: {
          ...s.gameState,
          collection: s.gameState.collection.map((c) =>
            c.id === selectedCard.id ? newCard : c
          ),
        },
      };
    });
    useGameStore.getState().saveGame();

    setResultCard(newCard);
    setResult(msg);
    setSelectedCard(null);
  }, [selectedItem, selectedCard, gameState, removeCraftingItem]);

  const reset = () => {
    setResult(null);
    setResultCard(null);
    setSelectedCard(null);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,20,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      zIndex: 40,
      overflowY: 'auto',
      padding: '20px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 700, marginBottom: 16 }}>
        <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 18, color: '#00f0ff', letterSpacing: '0.2em' }}>
          CRAFTING TERMINAL
        </p>
        <NeonButton variant="ghost" size="sm" onClick={onClose}>✕ CLOSE</NeonButton>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginBottom: 16,
              padding: '10px 20px',
              border: '1px solid #00f0ff',
              color: '#00f0ff',
              fontSize: 12,
              textAlign: 'center',
              maxWidth: 700,
              width: '100%',
            }}
          >
            {result}
            {resultCard && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                <CardComponent card={resultCard} size="hand" selected={false} />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <NeonButton variant="cyan" size="sm" onClick={reset}>CONTINUE</NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 700 }}>
          {/* Step 1: Choose item */}
          <div>
            <p style={{ fontSize: 9, color: '#6666aa', letterSpacing: '0.15em', marginBottom: 8 }}>
              1. SELECT CRAFTING ITEM
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {inventory.length === 0 && (
                <p style={{ fontSize: 11, color: '#444466' }}>No crafting items in inventory. Defeat enemies to find them!</p>
              )}
              {inventory.map(({ id, quantity }) => {
                const def = CRAFTING_ITEMS[id];
                const active = selectedItem === id;
                return (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => { setSelectedItem(active ? null : id); setSelectedCard(null); }}
                    style={{
                      background: active ? `rgba(${hexToRgb(def.color)},0.15)` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? def.color : '#334'}`,
                      color: active ? def.color : '#8888aa',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 2,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{def.icon}</span>
                    <span>{def.name}</span>
                    <span style={{ opacity: 0.6, fontSize: 10 }}>×{quantity}</span>
                  </motion.button>
                );
              })}
            </div>
            {itemDef && (
              <p style={{ fontSize: 10, color: itemDef.color, marginTop: 6, opacity: 0.8 }}>
                ⟩ {itemDef.description}
              </p>
            )}
          </div>

          {/* Step 2: Choose card (only if item selected) */}
          {selectedItem && (
            <div>
              <p style={{ fontSize: 9, color: '#6666aa', letterSpacing: '0.15em', marginBottom: 8 }}>
                2. SELECT A CARD FROM YOUR COLLECTION
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {collection.map((card) => {
                  const isSelected = selectedCard?.id === card.id;
                  return (
                    <motion.div
                      key={card.id + (card.mods?.displayName ?? '')}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedCard(isSelected ? null : card)}
                      style={{
                        cursor: 'pointer',
                        outline: isSelected ? '2px solid #00f0ff' : 'none',
                        outlineOffset: 3,
                        borderRadius: 4,
                      }}
                    >
                      <CardComponent card={card} size="hand" selected={isSelected} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Craft button */}
          {selectedItem && selectedCard && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <NeonButton
                variant="cyan"
                size="lg"
                onClick={handleCraft}
              >
                ⚡ APPLY {CRAFTING_ITEMS[selectedItem].name.toUpperCase()}
              </NeonButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: convert hex color to "r,g,b" for rgba()
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
