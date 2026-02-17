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
};
