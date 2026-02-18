import { TILE, type MapData } from './maps';

const W = TILE.WALL;
const F = TILE.FLOOR;
const R = TILE.ROAD;
const A = TILE.ALLEY;
const T = TILE.WATER;

// ── NeonRift City Hub — 40×30 safe zone ────────────────────────────────────
// No enemies. NPCs open existing screens (shop, craft, deck, zone portal).
// Layout: central plaza, shops left/right, portal at south.

// prettier-ignore
const CITY_TILES: number[][] = [
//0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
 [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 0
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 1
 [W, F, W, W, W, W, F, F, W, W, W, W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, W, F, F, W, W, W, W, F, W], // 2
 [W, F, W, A, A, W, F, F, W, A, A, W, F, F, F, F, F, F, R, R, R, R, F, F, F, F, F, F, W, A, A, W, F, F, W, A, A, W, F, W], // 3
 [W, F, W, A, A, W, F, F, W, A, A, W, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, W, A, A, W, F, F, W, A, A, W, F, W], // 4
 [W, F, W, W, F, W, F, F, W, W, F, W, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, W, F, W, W, F, F, W, F, W, W, F, W], // 5
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 6
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 7
 [W, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, W], // 8
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 9
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 10
 [W, F, W, W, W, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, W, F, W], // 11
 [W, F, W, A, A, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, A, A, W, F, W], // 12
 [W, F, W, A, A, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, A, A, W, F, W], // 13
 [W, F, W, W, F, W, F, F, F, F, F, F, F, R, R, R, R, R, R, F, F, R, R, R, R, R, R, F, F, F, F, F, F, F, W, F, W, W, F, W], // 14  plaza road
 [W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W], // 15
 [W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W], // 16  ← plaza center
 [W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W], // 17
 [W, F, F, F, F, F, F, F, F, F, F, F, F, R, R, R, R, R, R, F, F, R, R, R, R, R, R, F, F, F, F, F, F, F, F, F, F, F, F, W], // 18  plaza road
 [W, F, W, W, W, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, W, F, W], // 19
 [W, F, W, A, A, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, A, A, W, F, W], // 20
 [W, F, W, A, A, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, A, A, W, F, W], // 21
 [W, F, W, W, F, W, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, W, F, W, W, F, W], // 22
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 23
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 24
 [W, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, W], // 25
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, R, F, F, R, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 26
 [W, F, F, F, F, F, F, F, F, T, T, F, F, F, F, F, F, F, R, R, R, R, F, F, F, F, F, F, F, T, T, F, F, F, F, F, F, F, F, W], // 27
 [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // 28
 [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 29
];

export const CITY_HUB_MAP: MapData = {
  id: 'city_hub',
  name: 'NeonRift City',
  width: 40,
  height: 30,
  tileSize: 32,
  tiles: CITY_TILES,
  playerSpawn: { x: 19, y: 16 },  // center of plaza
  objects: [
    // ── Card Vendor — top-left building ─────────────────────────────────────
    { id: 'hub_vendor', type: 'dealer', tile: { x: 4, y: 6 }, label: 'VENDOR' },
    // ── Mod Station — top-right building ────────────────────────────────────
    { id: 'hub_craft', type: 'terminal', tile: { x: 10, y: 6 }, dialogueId: 'crafting_terminal', label: 'MOD STATION' },
    // ── Deck Builder — left building row 2 ──────────────────────────────────
    { id: 'hub_deck', type: 'terminal', tile: { x: 4, y: 15 }, dialogueId: 'deck_terminal', label: 'DECK BUILDER' },
    // ── Quest Board — right building row 2 ──────────────────────────────────
    { id: 'hub_quest', type: 'npc', tile: { x: 36, y: 13 }, npcId: 'nexus', dialogueId: 'quest_board', label: 'QUESTS' },
    // ── Story Gate — bottom-left building ───────────────────────────────────
    { id: 'hub_story', type: 'terminal', tile: { x: 4, y: 23 }, dialogueId: 'story_gate', label: 'STORY GATE' },
    // ── Grid Portal — bottom of central road ────────────────────────────────
    { id: 'hub_portal', type: 'terminal', tile: { x: 19, y: 27 }, dialogueId: 'zone_portal', label: 'GRID PORTAL' },
    // ── NPC: Zero — plaza left ──────────────────────────────────────────────
    { id: 'hub_npc_zero', type: 'npc', tile: { x: 16, y: 16 }, npcId: 'zero', dialogueId: 'zero_intro' },
    // ── NPC: Raya — right building row 1 ────────────────────────────────────
    { id: 'hub_npc_raya', type: 'npc', tile: { x: 36, y: 6 }, npcId: 'raya', dialogueId: 'raya_intro' },
    // ── Stash — bottom-right building ───────────────────────────────────────
    { id: 'hub_stash', type: 'terminal', tile: { x: 36, y: 21 }, dialogueId: 'stash_terminal', label: 'STASH' },
  ],
};
