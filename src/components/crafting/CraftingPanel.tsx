'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { CRAFTING_ITEMS } from '@/data/craftingItems';
import { MODS, MOD_MAP } from '@/data/mods';
import { rarityFromModCount, pickSingleMod, applyModStats } from '@/utils/cardMods';
import { generateCardName } from '@/utils/nameGenerator';
import { CARD_MAP } from '@/data/cards';
import type { Card, CardType, EnergyType } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import { MAX_TIER } from '@/utils/tierUtils';
import CardComponent from '@/components/battle/CardComponent';
import NeonButton from '@/components/ui/NeonButton';

interface CraftingPanelProps {
  onClose: () => void;
}

export default function CraftingPanel({ onClose }: CraftingPanelProps) {
  const { gameState, removeCraftingItem } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [activeItem, setActiveItem] = useState<CraftingItemId | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');
  const [filterEnergy, setFilterEnergy] = useState<EnergyType | 'all'>('all');

  const inventory = gameState?.inventory ?? [];
  const collection = gameState?.collection ?? [];

  // Keep selectedCard in sync with collection (after modifications)
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < collection.length) {
      setSelectedCard(collection[selectedIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const showFlash = useCallback((msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashMsg(msg);
    flashTimer.current = setTimeout(() => setFlashMsg(null), 2500);
  }, []);

  // ── Apply crafting item to selected card ───────────────────────────────────

  const applyCraft = useCallback(() => {
    if (!activeItem || !selectedCard || !gameState) return;

    const consumed = removeCraftingItem(activeItem);
    if (!consumed) { showFlash('No items left!'); return; }

    let newCard: Card = selectedCard;
    let msg = '';

    switch (activeItem) {
      case 'data_fragment': {
        const existing = selectedCard.mods?.mods ?? [];
        if (existing.length >= 6) {
          showFlash('Card already has 6 mods (maximum)!');
          return;
        }
        const existingIds = existing.map((m) => m.modId);
        const newMod = pickSingleMod(selectedCard, existingIds);
        if (!newMod) { showFlash('No more unique mods available for this card type!'); return; }
        const combinedMods = [...existing, newMod];
        newCard = {
          ...selectedCard,
          mods: {
            mods: combinedMods,
            modRarity: rarityFromModCount(combinedMods.length),
            displayName: selectedCard.mods?.displayName ?? selectedCard.name,
            locked: selectedCard.mods?.locked ?? [],
          },
        };
        const modName = MOD_MAP[newMod.modId]?.name ?? newMod.modId;
        msg = `Added mod: ${modName}`;
        break;
      }
      case 'wipe_drive': {
        const lockedMods = (selectedCard.mods?.mods ?? []).filter(
          (m) => selectedCard.mods?.locked.includes(m.modId)
        );
        if (lockedMods.length > 0) {
          // Keep locked mods, remove only unlocked
          newCard = {
            ...selectedCard,
            mods: {
              mods: lockedMods,
              modRarity: rarityFromModCount(lockedMods.length),
              displayName: selectedCard.mods?.displayName ?? selectedCard.name,
              locked: selectedCard.mods?.locked ?? [],
            },
          };
          msg = `Wiped unlocked mods — ${lockedMods.length} locked mod${lockedMods.length > 1 ? 's' : ''} preserved`;
        } else {
          newCard = { ...selectedCard, mods: undefined };
          msg = `Stripped all mods from ${selectedCard.name}`;
        }
        break;
      }
      case 'recompiler': {
        const allMods = selectedCard.mods?.mods ?? [];
        const locked = selectedCard.mods?.locked ?? [];
        const lockedMods = allMods.filter((m) => locked.includes(m.modId));
        const unlockCount = allMods.length - lockedMods.length;
        if (unlockCount === 0) {
          showFlash('All mods are locked — nothing to re-roll!'); return;
        }
        // Generate fresh mods one-by-one, excluding locked mod IDs + already-picked
        const excludeIds = lockedMods.map((m) => m.modId);
        const freshMods: typeof allMods = [];
        for (let i = 0; i < unlockCount; i++) {
          const usedIds = [...excludeIds, ...freshMods.map((m) => m.modId)];
          const fresh = pickSingleMod(selectedCard, usedIds);
          if (fresh) freshMods.push(fresh);
        }
        const combinedMods = [...lockedMods, ...freshMods];
        newCard = {
          ...selectedCard,
          mods: {
            mods: combinedMods,
            modRarity: rarityFromModCount(combinedMods.length),
            displayName: selectedCard.mods?.displayName ?? selectedCard.name,
            locked,
          },
        };
        msg = `Re-rolled ${unlockCount} unlocked mod${unlockCount > 1 ? 's' : ''}`;
        break;
      }
      case 'tier_boost': {
        if (!selectedCard.mods || selectedCard.mods.mods.length === 0) {
          showFlash('No mods to upgrade!'); return;
        }
        const mods = [...selectedCard.mods.mods];
        const locked = selectedCard.mods.locked;
        // Find upgradeable mods: not locked AND not already at max tier
        const upgradeable = mods
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => !locked.includes(m.modId) && m.tier < MAX_TIER);
        if (upgradeable.length === 0) {
          const allLocked = mods.every((m) => locked.includes(m.modId));
          const allMax = mods.every((m) => m.tier === MAX_TIER);
          if (allLocked) { showFlash('All mods are locked!'); }
          else if (allMax) { showFlash(`All mods already at T${MAX_TIER}!`); }
          else { showFlash(`All unlocked mods are already at T${MAX_TIER}!`); }
          return;
        }
        // Pick the lowest tier (weakest) to upgrade first
        const worst = upgradeable.reduce((a, b) => a.m.tier < b.m.tier ? a : b);
        mods[worst.i] = { ...mods[worst.i], tier: mods[worst.i].tier + 1 };
        newCard = { ...selectedCard, mods: { ...selectedCard.mods, mods } };
        msg = `Upgraded ${MOD_MAP[mods[worst.i].modId]?.name ?? ''} to T${mods[worst.i].tier}`;
        break;
      }
      case 'quantum_lock': {
        if (!selectedCard.mods || selectedCard.mods.mods.length === 0) {
          showFlash('No mods to lock!'); return;
        }
        const unlocked = selectedCard.mods.mods.filter(
          (m) => !selectedCard.mods!.locked.includes(m.modId)
        );
        if (unlocked.length === 0) { showFlash('All mods already locked!'); return; }
        const target = unlocked[Math.floor(Math.random() * unlocked.length)];
        newCard = {
          ...selectedCard,
          mods: { ...selectedCard.mods, locked: [...selectedCard.mods.locked, target.modId] },
        };
        msg = `Locked: ${MOD_MAP[target.modId]?.name ?? target.modId}`;
        break;
      }
      case 'architects_key': {
        const existing = selectedCard.mods?.mods ?? [];
        if (existing.length >= 6) { showFlash('Card already has 6 mods (maximum)!'); return; }
        const existingIds = existing.map((m) => m.modId);
        const bossMods = MODS.filter((m) => m.isBossMod && m.applicableTo.includes(selectedCard.type) && !existingIds.includes(m.id));
        const pick = bossMods[Math.floor(Math.random() * bossMods.length)];
        if (!pick) { showFlash('No compatible boss mods available for this card!'); return; }
        const combinedMods = [...existing, { modId: pick.id, tier: 8 }];
        newCard = {
          ...selectedCard,
          mods: {
            mods: combinedMods,
            modRarity: rarityFromModCount(combinedMods.length),
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

    // Regenerate uniqueId, displayName and bake stats from base card whenever mods change
    const baseCard = CARD_MAP[newCard.id] ?? newCard;
    if (newCard.mods && newCard.mods.mods.length > 0) {
      const currentMods = newCard.mods.mods;
      const modKey = currentMods.map((m) => `${m.modId}_T${m.tier}`).sort().join('_');
      const statOverrides = applyModStats(baseCard, currentMods);
      newCard = {
        ...baseCard,
        ...statOverrides,
        uniqueId: `${newCard.id}__${modKey}`,
        artIndex: newCard.artIndex,
        mods: {
          ...newCard.mods,
          displayName: generateCardName(baseCard, currentMods),
        },
      };
    } else if (!newCard.mods) {
      // Stripped all mods — restore full base stats
      newCard = { ...baseCard, artIndex: newCard.artIndex, uniqueId: undefined };
    }

    // Update card in collection and sync matching deck copy
    useGameStore.setState((s) => {
      if (!s.gameState || selectedIndex < 0) return s;
      const coll = [...s.gameState.collection];
      coll[selectedIndex] = newCard;
      // Also update the first matching deck copy (same base id + old uniqueId)
      const oldUniqueId = selectedCard?.uniqueId;
      const oldId = selectedCard?.id;
      const deck = [...s.gameState.deck];
      const deckIdx = deck.findIndex(
        (c) => c.id === oldId && (c.uniqueId ?? undefined) === (oldUniqueId ?? undefined)
      );
      if (deckIdx >= 0) deck[deckIdx] = newCard;
      return {
        gameState: { ...s.gameState, collection: coll, deck },
      };
    });
    useGameStore.getState().saveGame();
    setSelectedCard(newCard);
    showFlash(msg);
  }, [activeItem, selectedCard, selectedIndex, gameState, removeCraftingItem, showFlash]);

  // ── Card click handler (applies selected item) ────────────────────────────

  const handleCardClick = useCallback(() => {
    if (!activeItem) {
      showFlash('Right-click an item first!');
      return;
    }
    applyCraft();
  }, [activeItem, applyCraft, showFlash]);

  // ── Item context menu (right-click to select) ────────────────────────────

  const handleItemRightClick = useCallback((e: React.MouseEvent, itemId: CraftingItemId) => {
    e.preventDefault();
    setActiveItem((prev) => prev === itemId ? null : itemId);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // Phase 1: Card selection
  if (!selectedCard) {
    return (
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,5,20,0.97)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'JetBrains Mono, monospace',
        zIndex: 40,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,240,255,0.2)',
          flexShrink: 0,
        }}>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, color: '#00f0ff', letterSpacing: '0.2em' }}>
            CRAFTING TERMINAL
          </p>
          <NeonButton variant="ghost" size="sm" onClick={onClose}>✕ CLOSE</NeonButton>
        </div>

        {/* Filters */}
        <div style={{ padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid rgba(0,240,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {(['all', 'agent', 'script', 'malware', 'trap'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '3px 8px',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  background: filterType === t ? 'rgba(0,240,255,0.15)' : 'transparent',
                  border: filterType === t ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)',
                  color: filterType === t ? '#00f0ff' : '#6666aa',
                  borderRadius: 2,
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([
              { id: 'all', label: 'ALL', color: '#888888' },
              { id: 'volt', label: 'VOLT', color: '#ffe600' },
              { id: 'cipher', label: 'CIPHER', color: '#00f0ff' },
              { id: 'rust', label: 'RUST', color: '#ff6600' },
              { id: 'phantom', label: 'PHANTOM', color: '#cc44ff' },
              { id: 'synth', label: 'SYNTH', color: '#39ff14' },
              { id: 'neutral', label: 'NEUTRAL', color: '#aaaaaa' },
            ] as { id: EnergyType | 'all'; label: string; color: string }[]).map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => setFilterEnergy(id)}
                style={{
                  padding: '3px 8px',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  background: filterEnergy === id ? `${color}22` : 'transparent',
                  border: filterEnergy === id ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
                  color: filterEnergy === id ? color : '#6666aa',
                  borderRadius: 2,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 12 }}>
            {collection.length === 0 && (
              <p style={{ fontSize: 11, color: '#444466', padding: 20 }}>
                No cards in collection. Win some battles first!
              </p>
            )}
            {collection
              .map((card, i) => ({ card, i }))
              .filter(({ card }) =>
                (filterType === 'all' || card.type === filterType) &&
                (filterEnergy === 'all' || card.energy === filterEnergy)
              )
              .map(({ card, i }) => (
                <motion.div
                  key={card.id + i + (card.mods?.displayName ?? '')}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => { setSelectedCard(card); setSelectedIndex(i); }}
                  style={{ cursor: 'pointer', borderRadius: 4 }}
                >
                  <CardComponent card={card} size="hand" selected={false} />
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Card detail + items sidebar
  const activeItemDef = activeItem ? CRAFTING_ITEMS[activeItem] : null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,20,0.97)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'JetBrains Mono, monospace',
      zIndex: 40,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0,240,255,0.2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { setSelectedCard(null); setSelectedIndex(-1); setActiveItem(null); }}
            style={{
              background: 'transparent', border: '1px solid rgba(0,240,255,0.3)',
              color: '#00f0ff', fontSize: 10, padding: '4px 10px',
              cursor: 'pointer', letterSpacing: '0.1em',
            }}
          >
            ← BACK
          </button>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: '#00f0ff', letterSpacing: '0.15em' }}>
            MODDING: {selectedCard.mods?.displayName ?? selectedCard.name}
          </p>
        </div>
        <NeonButton variant="ghost" size="sm" onClick={onClose}>✕ CLOSE</NeonButton>
      </div>

      {/* Main content: card + items */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Card display */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 20,
          position: 'relative',
        }}>
          {/* Flash message */}
          <AnimatePresence>
            {flashMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'absolute', top: 16,
                  padding: '8px 20px',
                  background: 'rgba(0,240,255,0.1)',
                  border: '1px solid rgba(0,240,255,0.4)',
                  color: '#00f0ff',
                  fontSize: 11,
                  letterSpacing: '0.05em',
                  zIndex: 5,
                }}
              >
                {flashMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instruction */}
          {activeItem ? (
            <p style={{
              fontSize: 9, color: activeItemDef?.color ?? '#6666aa',
              letterSpacing: '0.15em', marginBottom: 16, textAlign: 'center',
            }}>
              {activeItemDef?.icon} {activeItemDef?.name?.toUpperCase()} SELECTED — CLICK CARD TO APPLY
            </p>
          ) : (
            <p style={{ fontSize: 9, color: '#444466', letterSpacing: '0.15em', marginBottom: 16 }}>
              RIGHT-CLICK AN ITEM ON THE RIGHT → THEN CLICK THIS CARD
            </p>
          )}

          {/* The card */}
          <motion.div
            whileHover={activeItem ? { scale: 1.05 } : {}}
            onClick={handleCardClick}
            style={{
              cursor: activeItem ? 'pointer' : 'default',
              borderRadius: 6,
              outline: activeItem
                ? `2px solid ${activeItemDef?.color ?? '#00f0ff'}`
                : 'none',
              outlineOffset: 6,
            }}
          >
            <CardComponent card={selectedCard} size="preview" selected={false} />
          </motion.div>

          {/* Mod list below card */}
          {selectedCard.mods && selectedCard.mods.mods.length > 0 && (
            <div style={{ marginTop: 16, maxWidth: 280 }}>
              <p style={{ fontSize: 8, color: '#444466', letterSpacing: '0.15em', marginBottom: 6 }}>
                ACTIVE MODS
              </p>
              {selectedCard.mods.mods.map((m, i) => {
                const mod = MOD_MAP[m.modId];
                const isLocked = selectedCard.mods!.locked.includes(m.modId);
                return (
                  <div key={m.modId + i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 9, color: '#8888aa', marginBottom: 3,
                  }}>
                    <span style={{
                      fontSize: 8, color: '#00f0ff',
                      background: 'rgba(0,240,255,0.1)',
                      padding: '1px 4px',
                    }}>T{m.tier}</span>
                    <span>{mod?.name ?? m.modId}</span>
                    <span style={{ opacity: 0.5, fontSize: 8 }}>
                      {mod?.tiers[m.tier]?.description ?? ''}
                    </span>
                    {isLocked && <span style={{ color: '#39ff14', fontSize: 8 }}>🔒</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Items sidebar */}
        <div style={{
          width: 240,
          borderLeft: '1px solid rgba(0,240,255,0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid rgba(0,240,255,0.1)',
          }}>
            <p style={{ fontSize: 9, color: '#6666aa', letterSpacing: '0.15em' }}>
              CRAFTING ITEMS
            </p>
            <p style={{ fontSize: 8, color: '#444466', marginTop: 2 }}>
              Right-click to select
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {inventory.length === 0 && (
              <p style={{ fontSize: 10, color: '#333355', padding: '12px 4px' }}>
                No crafting items. Defeat enemies to find them!
              </p>
            )}
            {inventory.map(({ id, quantity }) => {
              const def = CRAFTING_ITEMS[id];
              const isActive = activeItem === id;
              return (
                <motion.button
                  key={id}
                  whileHover={{ x: -2 }}
                  onContextMenu={(e) => handleItemRightClick(e, id)}
                  onClick={(e) => { e.preventDefault(); handleItemRightClick(e, id); }}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '8px 10px',
                    marginBottom: 4,
                    background: isActive
                      ? `rgba(${hexToRgb(def.color)},0.15)`
                      : 'rgba(255,255,255,0.02)',
                    border: isActive
                      ? `1px solid ${def.color}`
                      : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? def.color : '#8888aa',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 3,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{def.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 10, fontWeight: 600,
                    }}>
                      <span>{def.name}</span>
                      <span style={{ opacity: 0.6, fontSize: 9 }}>×{quantity}</span>
                    </div>
                    <div style={{ fontSize: 8, opacity: 0.6, marginTop: 2, lineHeight: 1.3 }}>
                      {def.description}
                    </div>
                  </div>
                  {isActive && (
                    <div style={{
                      fontSize: 7, color: def.color,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                      marginTop: 1,
                    }}>
                      ▶ ARMED
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
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
