'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { CARDS } from '@/data/cards';
import { shuffle } from '@/engine/BattleEngine';
import { generateModdedCard, pickSingleMod } from '@/utils/cardMods';
import { CRAFTING_ITEMS, CRAFTING_ITEMS_LIST } from '@/data/craftingItems';
import type { Card } from '@/types/card';
import type { CraftingItemId } from '@/types/game';
import { ENERGY_COLORS } from '@/utils/energyColors';
import CardComponent from '@/components/battle/CardComponent';
import NeonButton from '@/components/ui/NeonButton';
import { MODS, MOD_MAP } from '@/data/mods';
import { rarityFromModCount } from '@/utils/cardMods';
import { MAX_TIER } from '@/utils/tierUtils';

void ENERGY_COLORS;

const DEALER_LINES = [
  "Looking for some fresh code, Drifter?",
  "I got the best programs on Neon Row...",
  "Credits first, questions later.",
  "Everything's for sale if you got the coin.",
];

function cardBasePrice(card: Card): number {
  if (card.cost <= 2) return 30 + card.cost * 10;
  if (card.cost <= 4) return 80 + card.cost * 10;
  return 150 + card.cost * 15;
}

function cardPrice(card: Card, shopDiscount = 0): number {
  return Math.max(1, Math.floor(cardBasePrice(card) * (1 - shopDiscount)));
}

function sellPrice(card: Card, sellBonus = 0): number {
  return Math.floor(cardBasePrice(card) * (0.3 + sellBonus));
}

const PACK_PRICE = 0;
const PACK_SIZE  = 3;

function buildInventory() {
  const pool = shuffle([...CARDS]);
  // Testing: force high mod counts so we see 5–6 mod cards
  return pool.slice(0, 6).map((c) => {
    const r = Math.random();
    const modCount = r < 0.20 ? 6 : r < 0.45 ? 5 : r < 0.70 ? 4 : r < 0.88 ? 3 : 2;
    return generateModdedCard(c, modCount);
  });
}

interface ShopProps {
  onClose: () => void;
}

// Helper: convert hex color to "r,g,b" for rgba()
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export default function Shop({ onClose }: ShopProps) {
  const { gameState, spendCredits, addToCollection, addCraftingItem, removeCraftingItem } = useGameStore();
  const credits    = gameState?.player.credits ?? 0;
  const collection = gameState?.collection ?? [];
  const deck       = gameState?.deck ?? [];

  // Trader skill bonuses
  const traderLevel = gameState?.skills?.trees.trader ?? 0;
  const shopDiscount = traderLevel >= 1 ? 0.10 : 0;  // Trader Lv.1: -10% prices
  const sellBonus    = traderLevel >= 4 ? 0.25 : 0;   // Trader Lv.4: +25% sell price

  const [tab, setTab] = useState<'buy' | 'sell' | 'items'>('buy');
  const [dealerLine] = useState(() => DEALER_LINES[Math.floor(Math.random() * DEALER_LINES.length)]);
  const [buyFlash, setBuyFlash]   = useState<string | null>(null);
  const [sellFlash, setSellFlash] = useState<string | null>(null);
  const [packOpenCards, setPackOpenCards] = useState<Card[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh triggers: level-up, rift complete, rift fail
  const playerLevel     = gameState?.player.level ?? 1;
  const zonesCompleted  = gameState?.progress.zonesCompleted ?? 0;
  const totalLosses     = gameState?.progress.totalLosses ?? 0;
  const prevLevel       = useRef(playerLevel);
  const prevZones       = useRef(zonesCompleted);
  const prevLosses      = useRef(totalLosses);
  // Skip on first mount (values are equal to initial refs)
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const levelled  = playerLevel    > prevLevel.current;
    const riftDone  = zonesCompleted > prevZones.current;
    const riftFail  = totalLosses    > prevLosses.current;
    if (levelled || riftDone || riftFail) {
      setRefreshKey((k) => k + 1);
    }
    prevLevel.current  = playerLevel;
    prevZones.current  = zonesCompleted;
    prevLosses.current = totalLosses;
  }, [playerLevel, zonesCompleted, totalLosses]);

  // Shop inventory: refreshes when refreshKey changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inventory = useMemo(() => buildInventory(), [refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleBuy = (card: Card) => {
    const price = cardPrice(card, shopDiscount);
    if (credits < price) return;
    const ok = spendCredits(price);
    if (ok) {
      addToCollection(card);
      useGameStore.getState().saveGame();
      setBuyFlash(card.uniqueId ?? card.id);
      setTimeout(() => setBuyFlash(null), 1200);
    }
  };

  const handleBuyPack = () => {
    if (PACK_PRICE > 0 && credits < PACK_PRICE) return;
    const ok = PACK_PRICE === 0 ? true : spendCredits(PACK_PRICE);
    if (ok) {
      const pack = shuffle([...CARDS]).slice(0, PACK_SIZE).map((c) => {
        const r = Math.random();
        const modCount = r < 0.15 ? 6 : r < 0.35 ? 5 : r < 0.60 ? 4 : r < 0.80 ? 3 : 2;
        return generateModdedCard(c, modCount);
      });
      for (const c of pack) addToCollection(c);
      useGameStore.getState().saveGame();
      setPackOpenCards(pack);
    }
  };

  const handleSell = (card: Card, index: number) => {
    const cardKey = (c: Card) => c.uniqueId ?? c.id;
    const key = cardKey(card);
    const inDeck = deck.filter((c) => cardKey(c) === key).length;
    const owned  = collection.filter((c) => cardKey(c) === key).length;
    if (owned <= inDeck) return;
    useGameStore.setState((s) => {
      if (!s.gameState) return s;
      const coll = [...s.gameState.collection];
      const idx  = coll.findIndex((c) => cardKey(c) === key);
      if (idx !== -1) coll.splice(idx, 1);
      return { gameState: { ...s.gameState, collection: coll, player: { ...s.gameState.player, credits: s.gameState.player.credits + sellPrice(card, sellBonus) } } };
    });
    useGameStore.getState().saveGame();
    setSellFlash(card.id + index);
    setTimeout(() => setSellFlash(null), 1000);
    void index;
  };

  // Give item for free (testing)
  const handleGetItem = (itemId: CraftingItemId) => {
    addCraftingItem(itemId);
    useGameStore.getState().saveGame();
  };

  const uniqueCollection = useMemo(() => {
    const seen = new Set<string>();
    return collection.filter((c) => {
      const key = c.uniqueId ?? c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [collection]);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#070710',
      display: 'flex', flexDirection: 'column', zIndex: 30, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(200,80,255,0.3)',
        background: 'rgba(5,5,20,0.9)',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: '#c850ff', letterSpacing: '0.2em' }}>DEALER</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', marginTop: 1, fontStyle: 'italic' }}>
            &ldquo;{dealerLine}&rdquo;
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c850ff', fontWeight: 700 }}>
            ¢ {credits}
          </span>
          <NeonButton variant="ghost" size="sm" onClick={onClose}>LEAVE</NeonButton>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,80,255,0.2)', flexShrink: 0 }}>
        {(['buy', 'sell', 'items'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              background: 'transparent',
              color: tab === t ? '#c850ff' : '#444466',
              cursor: 'pointer',
              border: 'none',
              borderBottom: tab === t ? '2px solid #c850ff' : '2px solid transparent',
            }}
          >
            {t === 'items' ? '⚗ ITEMS' : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

        {/* ── BUY TAB ── */}
        {tab === 'buy' && (
          <>
            {/* Pack */}
            <motion.div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: 16,
                background: 'rgba(200,80,255,0.08)',
                border: '1px solid rgba(200,80,255,0.4)',
                borderRadius: 4,
              }}
              animate={{ boxShadow: ['0 0 0px #c850ff', '0 0 12px rgba(200,80,255,0.3)', '0 0 0px #c850ff'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div>
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, color: '#c850ff', letterSpacing: '0.15em', marginBottom: 3 }}>
                  GHOST_SIGNAL PACKET
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa' }}>
                  3 encrypted programs — contents unknown until opened
                </p>
              </div>
              <NeonButton
                variant="magenta"
                size="sm"
                disabled={PACK_PRICE > 0 && credits < PACK_PRICE}
                onClick={handleBuyPack}
              >
                {PACK_PRICE === 0 ? 'FREE' : `¢ ${PACK_PRICE}`}
              </NeonButton>
            </motion.div>

            {/* Singles header + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', letterSpacing: '0.1em' }}>
                SINGLES — refreshes on level-up, rift clear or rift fail
              </p>
              <button
                onClick={handleRefresh}
                style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                  color: '#00f0ff', background: 'transparent',
                  border: '1px solid #00f0ff44', borderRadius: 3,
                  padding: '3px 8px', cursor: 'pointer', letterSpacing: '0.1em',
                }}
              >
                ⟳ REFRESH
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {inventory.map((card) => {
                const price    = cardPrice(card, shopDiscount);
                const canBuy   = credits >= price;
                const flashKey = card.uniqueId ?? card.id;
                const justBought = buyFlash === flashKey;
                return (
                  <div key={flashKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ position: 'relative' }}>
                      <CardComponent card={card} size="hand" disabled={!canBuy} />
                      <motion.div
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                          pointerEvents: 'none', borderRadius: 4,
                        }}
                        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      {justBought ? (
                        <motion.span key="bought" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#39ff14' }}>
                          ✓ Added!
                        </motion.span>
                      ) : (
                        <NeonButton
                          key="buy"
                          variant={canBuy ? 'magenta' : 'ghost'}
                          size="sm"
                          disabled={!canBuy}
                          onClick={() => handleBuy(card)}
                        >
                          ¢ {price}
                        </NeonButton>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── SELL TAB ── */}
        {tab === 'sell' && (
          <>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', marginBottom: 12, letterSpacing: '0.1em' }}>
              YOUR COLLECTION — sell at 30% value (cards in deck are protected)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {uniqueCollection.map((card, i) => {
                const price   = sellPrice(card, sellBonus);
                const inDeck  = deck.filter((c) => c.id === card.id).length;
                const owned   = collection.filter((c) => c.id === card.id).length;
                const canSell = owned > inDeck;
                const flashed = sellFlash === card.id + i;
                return (
                  <div key={card.id + i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ position: 'relative' }}>
                      <CardComponent card={card} size="hand" disabled={!canSell} />
                      <div style={{
                        position: 'absolute', top: 2, right: 2,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                        background: 'rgba(0,0,0,0.8)', color: '#6666aa', padding: '1px 3px',
                      }}>×{owned}</div>
                    </div>
                    <AnimatePresence mode="wait">
                      {flashed ? (
                        <motion.span key="sold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c850ff' }}>
                          ¢ +{price}
                        </motion.span>
                      ) : (
                        <NeonButton
                          key="sell"
                          variant={canSell ? 'cyan' : 'ghost'}
                          size="sm"
                          disabled={!canSell}
                          onClick={() => handleSell(card, i)}
                        >
                          SELL ¢{price}
                        </NeonButton>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {uniqueCollection.length === 0 && (
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333355', padding: 20 }}>
                  No cards to sell. Win some battles first.
                </p>
              )}
            </div>
          </>
        )}

        {/* ── ITEMS TAB ── */}
        {tab === 'items' && (
          <ItemsTab
            inventory={gameState?.inventory ?? []}
            collection={collection}
            onGetItem={handleGetItem}
            removeCraftingItem={removeCraftingItem}
          />
        )}

      </div>

      {/* Pack open reveal overlay */}
      <AnimatePresence>
        {packOpenCards && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,5,20,0.96)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, color: '#c850ff', letterSpacing: '0.2em', marginBottom: 6 }}
            >
              SIGNAL DECRYPTED
            </motion.p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', marginBottom: 24 }}>
              3 programs extracted from the ghost signal
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {packOpenCards.map((card, i) => (
                <motion.div
                  key={(card.uniqueId ?? card.id) + i}
                  initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ delay: i * 0.25, type: 'spring', stiffness: 200 }}
                >
                  <CardComponent card={card} size="hand" selected={false} />
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ marginTop: 28 }}
            >
              <NeonButton variant="magenta" size="lg" onClick={() => setPackOpenCards(null)}>
                ADD TO COLLECTION
              </NeonButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Items Tab ─────────────────────────────────────────────────────────────────

interface ItemsTabProps {
  inventory: { id: CraftingItemId; quantity: number }[];
  collection: Card[];
  onGetItem: (id: CraftingItemId) => void;
  removeCraftingItem: (id: CraftingItemId) => boolean;
}

function ItemsTab({ inventory, collection, onGetItem, removeCraftingItem }: ItemsTabProps) {
  const [selectedItem, setSelectedItem] = useState<CraftingItemId | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(-1);
  const [result, setResult] = useState<{ msg: string; card?: Card } | null>(null);

  const itemQty = (id: CraftingItemId) =>
    inventory.find((i) => i.id === id)?.quantity ?? 0;

  const handleApply = useCallback(() => {
    if (!selectedItem || !selectedCard) return;
    const consumed = removeCraftingItem(selectedItem);
    if (!consumed) return;

    let newCard: Card = selectedCard;
    let msg = '';

    switch (selectedItem) {
      case 'data_fragment': {
        const existing = selectedCard.mods?.mods ?? [];
        if (existing.length >= 6) {
          msg = 'Card already has 6 mods (maximum)!';
          setResult({ msg });
          return;
        }
        const existingIds = existing.map((m) => m.modId);
        const newMod = pickSingleMod(selectedCard, existingIds);
        if (!newMod) { msg = 'No more unique mods available for this card type!'; setResult({ msg }); return; }
        const combinedMods = [...existing, newMod];
        const modRarity = rarityFromModCount(combinedMods.length);
        newCard = {
          ...selectedCard,
          mods: {
            mods: combinedMods,
            modRarity,
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
          msg = 'All mods are locked — nothing to re-roll!';
          setResult({ msg });
          return;
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
          msg = 'No mods to upgrade!';
          setResult({ msg });
          return;
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
          if (allLocked) { msg = 'All mods are locked!'; }
          else if (allMax) { msg = `All mods already at T${MAX_TIER}!`; }
          else { msg = `All unlocked mods are already at T${MAX_TIER}!`; }
          setResult({ msg });
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
          msg = 'No mods to lock!';
          setResult({ msg });
          return;
        }
        const unlocked = selectedCard.mods.mods.filter(
          (m) => !selectedCard.mods!.locked.includes(m.modId)
        );
        if (unlocked.length === 0) { msg = 'All mods are already locked!'; setResult({ msg }); return; }
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
        if (existing.length >= 6) { msg = 'Card already has 6 mods (maximum)!'; setResult({ msg }); return; }
        const existingIds = existing.map((m) => m.modId);
        const bossMods = MODS.filter((m) => m.isBossMod && m.applicableTo.includes(selectedCard.type) && !existingIds.includes(m.id));
        const pick = bossMods[Math.floor(Math.random() * bossMods.length)];
        if (!pick) { msg = 'No compatible boss mods available for this card!'; setResult({ msg }); return; }
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

    // Update card in collection by index (only this specific card)
    // Also update matching card in deck if present
    useGameStore.setState((s) => {
      if (!s.gameState || selectedCardIndex < 0) return s;
      const coll = [...s.gameState.collection];
      const oldCard = coll[selectedCardIndex];
      coll[selectedCardIndex] = newCard;
      // Update deck: find the same card instance by old reference match
      const deck = s.gameState.deck.map((c) => c === oldCard ? newCard : c);
      return {
        gameState: { ...s.gameState, collection: coll, deck },
      };
    });
    useGameStore.getState().saveGame();
    setResult({ msg, card: newCard });
    setSelectedCard(null);
    setSelectedCardIndex(-1);
    setSelectedItem(null);
  }, [selectedItem, selectedCard, selectedCardIndex, removeCraftingItem]);

  const reset = () => {
    setResult(null);
    setSelectedCard(null);
    setSelectedCardIndex(-1);
    setSelectedItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '10px 16px',
              border: '1px solid #00f0ff',
              borderRadius: 4,
              color: '#00f0ff',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          >
            <div style={{ marginBottom: result.card ? 10 : 0 }}>{result.msg}</div>
            {result.card && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <CardComponent card={result.card} size="preview" />
              </div>
            )}
            <NeonButton variant="cyan" size="sm" onClick={reset}>CONTINUE</NeonButton>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <>
          {/* Available items to grab for free (testing) */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', letterSpacing: '0.1em', marginBottom: 8 }}>
              CRAFTING ITEMS — all free for testing
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {CRAFTING_ITEMS_LIST.map((def) => {
                const qty = itemQty(def.id);
                return (
                  <motion.button
                    key={def.id}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => onGetItem(def.id)}
                    style={{
                      background: `rgba(${hexToRgb(def.color)},0.12)`,
                      border: `1px solid ${def.color}88`,
                      color: def.color,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      display: 'flex', alignItems: 'center', gap: 6,
                      borderRadius: 3,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{def.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>{def.name}</div>
                      <div style={{ fontSize: 8, opacity: 0.7 }}>{def.description}</div>
                    </div>
                    <span style={{
                      marginLeft: 4, fontSize: 9, opacity: 0.8,
                      background: 'rgba(0,0,0,0.4)', borderRadius: 3, padding: '1px 5px',
                    }}>
                      ×{qty} → GET FREE
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Apply item to card */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', letterSpacing: '0.1em', marginBottom: 8 }}>
              APPLY ITEM TO CARD
            </p>

            {/* Select item from inventory */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {inventory.length === 0 ? (
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333355' }}>
                  No items in inventory — get some above.
                </p>
              ) : (
                inventory.map(({ id, quantity }) => {
                  const def = CRAFTING_ITEMS[id];
                  const active = selectedItem === id;
                  return (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.04 }}
                      onClick={() => { setSelectedItem(active ? null : id); setSelectedCard(null); setSelectedCardIndex(-1); }}
                      style={{
                        background: active ? `rgba(${hexToRgb(def.color)},0.2)` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? def.color : '#334'}`,
                        color: active ? def.color : '#8888aa',
                        padding: '7px 12px',
                        cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        display: 'flex', alignItems: 'center', gap: 6,
                        borderRadius: 3,
                      }}
                    >
                      <span>{def.icon}</span>
                      <span>{def.name}</span>
                      <span style={{ opacity: 0.6, fontSize: 9 }}>×{quantity}</span>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Select card */}
            {selectedItem && (
              <>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', letterSpacing: '0.1em', marginBottom: 8 }}>
                  SELECT CARD FROM COLLECTION
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
                  {collection.map((card, idx) => {
                    const isSelected = selectedCardIndex === idx;
                    return (
                      <motion.div
                        key={card.id + idx + (card.mods?.displayName ?? '')}
                        whileHover={{ y: -4 }}
                        onClick={() => {
                          if (isSelected) { setSelectedCard(null); setSelectedCardIndex(-1); }
                          else { setSelectedCard(card); setSelectedCardIndex(idx); }
                        }}
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
                  {collection.length === 0 && (
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333355' }}>
                      No cards in collection.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Apply button */}
            {selectedItem && selectedCard && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <NeonButton variant="cyan" size="lg" onClick={handleApply}>
                  ⚡ APPLY {CRAFTING_ITEMS[selectedItem].name.toUpperCase()}
                </NeonButton>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
