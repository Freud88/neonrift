'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { CARDS } from '@/data/cards';
import { shuffle } from '@/engine/BattleEngine';
import type { Card } from '@/types/card';
import { ENERGY_COLORS } from '@/utils/energyColors';
import CardComponent from '@/components/battle/CardComponent';
import NeonButton from '@/components/ui/NeonButton';

const DEALER_LINES = [
  "Looking for some fresh code, Drifter?",
  "I got the best programs on Neon Row...",
  "Credits first, questions later.",
  "Everything's for sale if you got the coin.",
];

function cardPrice(card: Card): number {
  if (card.cost <= 2) return 30 + card.cost * 10;
  if (card.cost <= 4) return 80 + card.cost * 10;
  return 150 + card.cost * 15;
}

function sellPrice(card: Card): number {
  return Math.floor(cardPrice(card) * 0.3);
}

const PACK_PRICE = 0;
const PACK_SIZE  = 3;

interface ShopProps {
  onClose: () => void;
}

export default function Shop({ onClose }: ShopProps) {
  const { gameState, spendCredits, addToCollection } = useGameStore();
  const credits = gameState?.player.credits ?? 0;
  const collection = gameState?.collection ?? [];
  const deck = gameState?.deck ?? [];

  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [dealerLine] = useState(() => DEALER_LINES[Math.floor(Math.random() * DEALER_LINES.length)]);
  const [buyFlash, setBuyFlash] = useState<string | null>(null);
  const [sellFlash, setSellFlash] = useState<string | null>(null);
  const [packOpenCards, setPackOpenCards] = useState<Card[] | null>(null);

  // Shop inventory: 6 random cards (stable per session)
  const inventory = useMemo(() => {
    const pool = shuffle([...CARDS]);
    return pool.slice(0, 6);
  }, []);

  const handleBuy = (card: Card) => {
    const price = cardPrice(card);
    if (credits < price) return;
    const ok = spendCredits(price);
    if (ok) {
      addToCollection(card);
      useGameStore.getState().saveGame();
      setBuyFlash(card.id);
      setTimeout(() => setBuyFlash(null), 1200);
    }
  };

  const handleBuyPack = () => {
    if (PACK_PRICE > 0 && credits < PACK_PRICE) return;
    const ok = PACK_PRICE === 0 ? true : spendCredits(PACK_PRICE);
    if (ok) {
      const pack = shuffle([...CARDS]).slice(0, PACK_SIZE);
      for (const c of pack) addToCollection(c);
      useGameStore.getState().saveGame();
      setPackOpenCards(pack);
    }
  };

  const handleSell = (card: Card, index: number) => {
    // Can't sell if card is the only copy in deck
    const inDeck = deck.filter((c) => c.id === card.id).length;
    const owned  = collection.filter((c) => c.id === card.id).length;
    if (owned <= inDeck) return; // would break deck
    // Remove one copy from collection
    useGameStore.setState((s) => {
      if (!s.gameState) return s;
      const coll = [...s.gameState.collection];
      const idx  = coll.findIndex((c) => c.id === card.id);
      if (idx !== -1) coll.splice(idx, 1);
      return { gameState: { ...s.gameState, collection: coll, player: { ...s.gameState.player, credits: s.gameState.player.credits + sellPrice(card) } } };
    });
    useGameStore.getState().saveGame();
    setSellFlash(card.id + index);
    setTimeout(() => setSellFlash(null), 1000);
    void index;
  };

  // Unique collection cards for sell tab
  const uniqueCollection = useMemo(() => {
    const seen = new Set<string>();
    return collection.filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
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
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(200,80,255,0.2)',
        flexShrink: 0,
      }}>
        {(['buy', 'sell'] as const).map((t) => (
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
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>

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

            {/* Individual cards */}
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', marginBottom: 10, letterSpacing: '0.1em' }}>
              SINGLES — inventory refreshes each visit
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {inventory.map((card) => {
                const price  = cardPrice(card);
                const canBuy = credits >= price;
                const justBought = buyFlash === card.id;
                return (
                  <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ position: 'relative' }}>
                      <CardComponent card={card} size="hand" disabled={!canBuy} />
                      {/* Shimmer overlay */}
                      <motion.div
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                          pointerEvents: 'none',
                          borderRadius: 4,
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

        {tab === 'sell' && (
          <>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', marginBottom: 12, letterSpacing: '0.1em' }}>
              YOUR COLLECTION — sell at 30% value (cards in deck are protected)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {uniqueCollection.map((card, i) => {
                const price    = sellPrice(card);
                const inDeck   = deck.filter((c) => c.id === card.id).length;
                const owned    = collection.filter((c) => c.id === card.id).length;
                const canSell  = owned > inDeck;
                const flashed  = sellFlash === card.id + i;
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
                  key={card.id + i}
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
