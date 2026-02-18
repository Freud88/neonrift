export interface Dialogue {
  id: string;
  speaker?: string;
  lines: string[];
}

export const DIALOGUES: Record<string, Dialogue> = {
  zero_intro: {
    id: 'zero_intro',
    speaker: 'Zero',
    lines: [
      "Hey, Drifter. You're new to Neon Row, aren't you.",
      "Watch yourself out there. Madame Flux owns this block — her boys are everywhere.",
      "Take out enough of her crew and she'll have to face you herself.",
    ],
  },
  raya_intro: {
    id: 'raya_intro',
    speaker: 'Raya',
    lines: [
      "The Grid is bleeding. Can you feel it? The data streams are wrong.",
      "Flux is siphoning power from every node in the district.",
      "Beat her and we might have a chance. Maybe.",
    ],
  },
  lore_grid_origin: {
    id: 'lore_grid_origin',
    speaker: 'TERMINAL',
    lines: [
      "[ENCRYPTED LOG — 2171.03.14]",
      "The Grid was built to be free. An open quantum network for all of NeonRift City.",
      "Then the Corps came. They carved it up like meat.",
      "Now every node is owned. Every data stream taxed. Every connection monitored.",
    ],
  },
  lore_madame_flux: {
    id: 'lore_madame_flux',
    speaker: 'TERMINAL',
    lines: [
      "[INTEL FILE — SUBJECT: MADAME FLUX]",
      "Real name unknown. Controls the Volt faction in Neon Row.",
      "Specializes in overclock techniques — her Agents attack before you can blink.",
      "WARNING: Do not engage without a fast counter-strategy.",
    ],
  },

  // ── City Hub dialogues ──────────────────────────────────────────────────────
  deck_terminal: {
    id: 'deck_terminal',
    speaker: 'DECK BUILDER',
    lines: [
      "[DECK BUILDER v3.1 — Online]",
      "Manage your combat deck here. Add, remove, or reorder cards.",
    ],
  },
  quest_board: {
    id: 'quest_board',
    speaker: 'Nexus',
    lines: [
      "The quest board flickers with static. No active contracts yet.",
      "Check back later, Drifter. The Grid always needs fixers.",
    ],
  },
  story_gate: {
    id: 'story_gate',
    speaker: 'TERMINAL',
    lines: [
      "[STORY GATE — ACCESS RESTRICTED]",
      "Campaign mode is still being compiled. Check back after the next patch.",
    ],
  },
  zone_portal: {
    id: 'zone_portal',
    speaker: 'GRID PORTAL',
    lines: [
      "[GRID PORTAL — ACTIVE]",
      "Step into the Rift. Collect Key Shards. Forge the Grid Key. Face the Boss.",
      "Each level deeper, the Grid fights back harder.",
    ],
  },
  stash_terminal: {
    id: 'stash_terminal',
    speaker: 'TERMINAL',
    lines: [
      "[STASH — OFFLINE]",
      "Card storage system is undergoing maintenance. Come back later.",
    ],
  },
};
