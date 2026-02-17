'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { CARDS } from '@/data/cards';
import type { Card, EnergyType, CardType } from '@/types/card';
import { ENERGY_COLORS, ENERGY_LABEL, TYPE_LABEL } from '@/utils/energyColors';
import CardComponent from '@/components/battle/CardComponent';
import NeonButton from '@/components/ui/NeonButton';
import { MOD_MAP } from '@/data/mods';
import { MOD_RARITY_COLOR } from '@/utils/cardMods';

const TIER_COLOR: Record<1 | 2 | 3, string> = { 1: '#ff6622', 2: '#ffe600', 3: '#cccccc' };

const ENERGIES: (EnergyType | 'all')[] = ['all', 'volt', 'cipher', 'neutral'];
const TYPES: (CardType | 'all')[] = ['all', 'agent', 'script', 'malware', 'trap'];

interface DeckBuilderProps {
  onClose: () => void;
}

// Cost histogram bar
function ManaCurve({ deck }: { deck: Card[] }) {
  const counts: Record<number, number> = {};
  for (const c of deck) counts[c.cost] = (counts[c.cost] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
      {[0, 1, 2, 3, 4, 5, 6].map((cost) => (
        <div key={cost} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={{
            width: 14,
            height: Math.round(((counts[cost] ?? 0) / max) * 28),
            background: '#00f0ff',
            boxShadow: '0 0 4px #00f0ff',
            minHeight: counts[cost] ? 3 : 0,
            borderRadius: 1,
          }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: '#444466' }}>{cost}</span>
        </div>
      ))}
    </div>
  );
}

export default function DeckBuilder({ onClose }: DeckBuilderProps) {
  const { gameState } = useGameStore();
  const [deck, setDeck] = useState<Card[]>(() => gameState?.deck ?? []);
  const [filterEnergy, setFilterEnergy] = useState<EnergyType | 'all'>('all');
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');
  const [filterCost, setFilterCost] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [saved, setSaved] = useState(false);

  // Only show cards the player owns (from collection)
  const collection = gameState?.collection ?? [];

  // Count cards by id in collection
  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of collection) counts[c.id] = (counts[c.id] ?? 0) + 1;
    return counts;
  }, [collection]);

  // Count cards by id in deck
  const deckCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of deck) counts[c.id] = (counts[c.id] ?? 0) + 1;
    return counts;
  }, [deck]);

  // Unique cards in collection
  const uniqueCollection = useMemo(() => {
    const seen = new Set<string>();
    return collection.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [collection]);

  // Filtered collection
  const filtered = useMemo(() => {
    return uniqueCollection.filter((c) => {
      if (filterEnergy !== 'all' && c.energy !== filterEnergy) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (filterCost !== 'all' && c.cost !== filterCost) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [uniqueCollection, filterEnergy, filterType, filterCost, search]);

  // Deck sorted
  const deckSorted = useMemo(() => {
    const unique: { card: Card; qty: number }[] = [];
    const seen = new Set<string>();
    for (const c of deck) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push({ card: c, qty: deckCounts[c.id] });
      }
    }
    return unique.sort((a, b) => a.card.cost - b.card.cost);
  }, [deck, deckCounts]);

  const deckValid = deck.length >= 20 && deck.length <= 30;

  const addToDeck = (card: Card) => {
    if (deck.length >= 30) return;
    const inDeck = deckCounts[card.id] ?? 0;
    const owned  = collectionCounts[card.id] ?? 0;
    if (inDeck >= owned) return; // can't add more than owned
    setDeck((d) => [...d, card]);
    setSaved(false);
  };

  const removeFromDeck = (cardId: string) => {
    const idx = deck.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const next = [...deck];
    next.splice(idx, 1);
    setDeck(next);
    setSaved(false);
  };

  const saveDeck = () => {
    if (!deckValid) return;
    // Persist to gameStore
    useGameStore.setState((s) => ({
      gameState: s.gameState ? { ...s.gameState, deck } : null,
    }));
    useGameStore.getState().saveGame();
    setSaved(true);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#070710',
      display: 'flex', flexDirection: 'column',
      zIndex: 30, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(0,240,255,0.2)',
        background: 'rgba(5,5,20,0.9)',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: '#00f0ff', letterSpacing: '0.2em' }}>DECK BUILDER</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#444466', marginTop: 2 }}>
            {deck.length}/30 cards {!deckValid && deck.length < 20 ? `— need ${20 - deck.length} more` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NeonButton variant="cyan" size="sm" onClick={saveDeck} disabled={!deckValid}>
            {saved ? '✓ SAVED' : 'SAVE DECK'}
          </NeonButton>
          <NeonButton variant="ghost" size="sm" onClick={onClose}>CLOSE</NeonButton>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: Collection */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(0,240,255,0.1)',
          overflow: 'hidden',
        }}>
          {/* Filters */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(0,240,255,0.1)', flexShrink: 0 }}>
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards..."
              style={{
                width: '100%', marginBottom: 6,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(0,240,255,0.3)',
                color: '#e0e0ff',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, padding: '5px 8px',
                outline: 'none',
              }}
            />
            {/* Energy filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
              {ENERGIES.map((e) => (
                <button
                  key={e}
                  onClick={() => setFilterEnergy(e)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                    padding: '3px 7px',
                    background: 'transparent',
                    border: `1px solid ${filterEnergy === e ? (e === 'all' ? '#00f0ff' : ENERGY_COLORS[e]?.primary ?? '#00f0ff') : '#1a1a3a'}`,
                    color: filterEnergy === e ? (e === 'all' ? '#00f0ff' : ENERGY_COLORS[e]?.primary ?? '#00f0ff') : '#444466',
                    cursor: 'pointer',
                  }}
                >
                  {e === 'all' ? 'ALL' : ENERGY_LABEL[e]}
                </button>
              ))}
            </div>
            {/* Type + cost filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                    padding: '3px 7px',
                    background: 'transparent',
                    border: `1px solid ${filterType === t ? '#00f0ff' : '#1a1a3a'}`,
                    color: filterType === t ? '#00f0ff' : '#444466',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'all' ? 'ALL TYPES' : TYPE_LABEL[t]}
                </button>
              ))}
              {[0,1,2,3,4,5,6].map((cost) => (
                <button
                  key={cost}
                  onClick={() => setFilterCost(filterCost === cost ? 'all' : cost)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                    padding: '3px 6px',
                    background: 'transparent',
                    border: `1px solid ${filterCost === cost ? '#ffe600' : '#1a1a3a'}`,
                    color: filterCost === cost ? '#ffe600' : '#444466',
                    cursor: 'pointer',
                  }}
                >
                  {cost}
                </button>
              ))}
            </div>
          </div>

          {/* Card grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '8px 10px',
            display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start',
          }}>
            {filtered.map((card) => {
              const inDeck = deckCounts[card.id] ?? 0;
              const owned  = collectionCounts[card.id] ?? 0;
              const canAdd = deck.length < 30 && inDeck < owned;
              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -4 }}
                  style={{ position: 'relative', cursor: canAdd ? 'pointer' : 'default' }}
                  onClick={() => canAdd && addToDeck(card)}
                  onMouseEnter={() => setPreviewCard(card)}
                  onMouseLeave={() => setPreviewCard(null)}
                >
                  <CardComponent card={card} size="hand" disabled={!canAdd} />
                  {/* Owned badge */}
                  <div style={{
                    position: 'absolute', top: 2, right: 2,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                    background: 'rgba(0,0,0,0.8)',
                    color: inDeck > 0 ? '#00f0ff' : '#444466',
                    padding: '1px 3px',
                    borderRadius: 2,
                  }}>
                    {inDeck}/{owned}
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#333355', padding: 20 }}>
                No cards match filters.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: Current Deck */}
        <div style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 10px', borderBottom: '1px solid rgba(0,240,255,0.1)', flexShrink: 0,
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6666aa', marginBottom: 6 }}>
              CURRENT DECK — {deck.length} cards
            </p>
            {/* Validity bar */}
            <div style={{ height: 4, background: '#0a0a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (deck.length / 30) * 100)}%`,
                background: deckValid ? '#00f0ff' : '#ffe600',
                boxShadow: `0 0 4px ${deckValid ? '#00f0ff' : '#ffe600'}`,
                transition: 'width 0.3s',
              }} />
            </div>
            <ManaCurve deck={deck} />
          </div>

          {/* Deck list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            <AnimatePresence>
              {deckSorted.map(({ card, qty }) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 6px', marginBottom: 2,
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${ENERGY_COLORS[card.energy].primary}22`,
                    cursor: 'pointer',
                  }}
                  onClick={() => removeFromDeck(card.id)}
                >
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                    color: ENERGY_COLORS[card.energy].primary,
                    minWidth: 14, textAlign: 'center',
                  }}>
                    {card.cost}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                    color: '#e0e0ff', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {card.name}
                  </span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                    color: '#6666aa',
                  }}>
                    ×{qty}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {deck.length === 0 && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#333355', padding: '10px 4px' }}>
                Add cards from the collection →
              </p>
            )}
          </div>

          {/* Energy distribution */}
          <div style={{ padding: '6px 10px', borderTop: '1px solid rgba(0,240,255,0.1)', flexShrink: 0 }}>
            {ENERGIES.filter(e => e !== 'all').map((e) => {
              const count = deck.filter(c => c.energy === e).length;
              if (count === 0) return null;
              const pct = Math.round((count / deck.length) * 100);
              return (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <div style={{ width: 6, height: 6, background: ENERGY_COLORS[e as EnergyType].primary, borderRadius: 1 }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#444466', flex: 1 }}>
                    {ENERGY_LABEL[e as EnergyType]}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: ENERGY_COLORS[e as EnergyType].primary }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card preview tooltip */}
      <AnimatePresence>
        {previewCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', bottom: 80, left: 20,
              zIndex: 50, pointerEvents: 'none',
            }}
          >
            <CardComponent card={previewCard} size="preview" />
            <div style={{
              marginTop: 4, background: 'rgba(5,5,20,0.95)',
              border: `1px solid ${ENERGY_COLORS[previewCard.energy].primary}`,
              padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, color: '#aaaacc', maxWidth: 130, lineHeight: 1.4,
            }}>
              {previewCard.description}
              {previewCard.keywords?.map((kw) => (
                <div key={kw.keyword} style={{ color: ENERGY_COLORS[previewCard.energy].primary, marginTop: 3 }}>
                  [{kw.keyword.toUpperCase()}{kw.value ? ` ${kw.value}` : ''}]
                </div>
              ))}
            </div>
            {/* Mods panel */}
            {previewCard.mods && previewCard.mods.mods.length > 0 && (
              <div style={{
                marginTop: 4, background: 'rgba(5,5,20,0.95)',
                border: `1px solid ${MOD_RARITY_COLOR[previewCard.mods.modRarity]}`,
                padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace',
                maxWidth: 130,
                boxShadow: `0 0 8px ${MOD_RARITY_COLOR[previewCard.mods.modRarity]}44`,
              }}>
                <div style={{ fontSize: 7, color: MOD_RARITY_COLOR[previewCard.mods.modRarity], letterSpacing: '0.15em', marginBottom: 5, textAlign: 'center' }}>
                  {previewCard.mods.modRarity.toUpperCase()} · {previewCard.mods.mods.length} MOD{previewCard.mods.mods.length > 1 ? 'S' : ''}
                </div>
                {previewCard.mods.mods.map((applied, i) => {
                  const mod = MOD_MAP[applied.modId];
                  if (!mod) return null;
                  const tier = applied.tier as 1 | 2 | 3;
                  const effect = mod.tiers[tier];
                  return (
                    <div key={i} style={{ marginBottom: i < previewCard.mods!.mods.length - 1 ? 5 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 7, color: TIER_COLOR[tier], fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '1px 3px', borderRadius: 2 }}>
                          T{tier}
                        </span>
                        <span style={{ fontSize: 8, color: '#e0e0ff', fontWeight: 700 }}>
                          {mod.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 7, color: '#8888aa', marginTop: 1, marginLeft: 4 }}>
                        {effect.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
