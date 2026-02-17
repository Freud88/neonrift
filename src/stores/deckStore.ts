'use client';

import { create } from 'zustand';
import type { Card } from '@/types/card';

interface DeckStoreState {
  collection: Card[];
  currentDeck: Card[];

  setCollection: (cards: Card[]) => void;
  setDeck: (cards: Card[]) => void;
  addToCollection: (card: Card) => void;
  removeFromCollection: (cardId: string) => void;
  addToDeck: (cardId: string) => boolean;
  removeFromDeck: (cardId: string) => void;
  isDeckValid: () => boolean;
}

export const useDeckStore = create<DeckStoreState>((set, get) => ({
  collection: [],
  currentDeck: [],

  setCollection: (cards) => set({ collection: cards }),
  setDeck: (cards) => set({ currentDeck: cards }),

  addToCollection: (card) =>
    set((state) => ({ collection: [...state.collection, card] })),

  removeFromCollection: (cardId) =>
    set((state) => {
      const idx = state.collection.findIndex((c) => c.id === cardId);
      if (idx === -1) return state;
      const next = [...state.collection];
      next.splice(idx, 1);
      return { collection: next };
    }),

  addToDeck: (cardId) => {
    const { collection, currentDeck } = get();
    if (currentDeck.length >= 30) return false;
    const card = collection.find((c) => c.id === cardId);
    if (!card) return false;
    set({ currentDeck: [...currentDeck, card] });
    return true;
  },

  removeFromDeck: (cardId) =>
    set((state) => {
      const idx = state.currentDeck.findIndex((c) => c.id === cardId);
      if (idx === -1) return state;
      const next = [...state.currentDeck];
      next.splice(idx, 1);
      return { currentDeck: next };
    }),

  isDeckValid: () => {
    const { currentDeck } = get();
    return currentDeck.length >= 20 && currentDeck.length <= 30;
  },
}));
