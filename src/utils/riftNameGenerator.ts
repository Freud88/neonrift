import { seededRandom, seededPick } from './seededRandom';
import type { BiomeId } from '@/types/zone';

interface NameParts {
  adjectives: string[];
  nouns: string[];
  suffixes: string[];
}

const RIFT_NAME_PARTS: Record<BiomeId, NameParts> = {
  neon_streets: {
    adjectives: [
      'Flickering', 'Neon', 'Hollow', 'Silent', 'Burning',
      'Shattered', 'Blinding', 'Crimson', 'Frozen', 'Lost',
      'Bleeding', 'Fading', 'Twisted', 'Broken', 'Endless',
      'Screaming', 'Whispering', 'Corrupted', 'Phantom', 'Dying',
    ],
    nouns: [
      'Boulevard', 'District', 'Crossing', 'Junction', 'Avenue',
      'Corridor', 'Block', 'Sector', 'Strip', 'Arcade',
      'Alley', 'Market', 'Plaza', 'Quarter', 'Row',
      'Circuit', 'Terminal', 'Hub', 'Nexus', 'Grid',
    ],
    suffixes: [
      'of Echoes', 'of Ash', 'of Static', 'of the Lost',
      'of Ruin', 'of Ghosts', 'of Decay', 'of the Void',
      'of Neon', 'of Glass', 'of Shadows', 'of the Grid',
      'of the Fallen', 'of Silence', 'of the Forgotten',
    ],
  },
  industrial_wasteland: {
    adjectives: [
      'Rusted', 'Toxic', 'Abandoned', 'Smoldering', 'Grinding',
      'Corroded', 'Leaking', 'Fractured', 'Crumbling', 'Scorched',
      'Polluted', 'Desolate', 'Barren', 'Forsaken', 'Ravaged',
    ],
    nouns: [
      'Foundry', 'Refinery', 'Furnace', 'Smelter', 'Pipeline',
      'Factory', 'Mill', 'Forge', 'Yard', 'Dumpsite',
      'Reactor', 'Incinerator', 'Press', 'Works', 'Plant',
    ],
    suffixes: [
      'of Iron', 'of Slag', 'of Fumes', 'of the Machine',
      'of Cinders', 'of Rust', 'of Smoke', 'of the Furnace',
      'of Waste', 'of the Condemned', 'of Oil', 'of Scrap',
    ],
  },
  data_swamp: {
    adjectives: [
      'Corrupted', 'Drowned', 'Stagnant', 'Festering', 'Glowing',
      'Sunken', 'Bubbling', 'Venomous', 'Murky', 'Putrid',
      'Overflowed', 'Infected', 'Rotting', 'Luminous', 'Flooded',
    ],
    nouns: [
      'Marshland', 'Reservoir', 'Bog', 'Pool', 'Basin',
      'Lagoon', 'Delta', 'Drain', 'Cistern', 'Overflow',
      'Sinkhole', 'Wetland', 'Channel', 'Swamp', 'Depths',
    ],
    suffixes: [
      'of Acid', 'of the Deep', 'of Toxins', 'of Corruption',
      'of the Drowned', 'of Slime', 'of the Abyss', 'of Venom',
      'of the Sunken', 'of Blight', 'of the Consumed',
    ],
  },
  chrome_forest: {
    adjectives: [
      'Chrome', 'Towering', 'Gleaming', 'Twisted', 'Dense',
      'Silver', 'Humming', 'Labyrinthine', 'Metallic', 'Coiled',
      'Spiraling', 'Tangled', 'Resonating', 'Winding', 'Vast',
    ],
    nouns: [
      'Canopy', 'Thicket', 'Grove', 'Spire', 'Forest',
      'Pillar Field', 'Lattice', 'Network', 'Maze', 'Cathedral',
      'Archive', 'Column', 'Pinnacle', 'Cluster', 'Web',
    ],
    suffixes: [
      'of Steel', 'of Wires', 'of the Spires', 'of Resonance',
      'of Alloy', 'of the Network', 'of Chrome', 'of the Lattice',
      'of Cables', 'of the Canopy', 'of the Monolith',
    ],
  },
  void_sector: {
    adjectives: [
      'Void', 'Fractured', 'Null', 'Erased', 'Dissolving',
      'Unstable', 'Collapsing', 'Shattered', 'Warped', 'Infinite',
      'Paradox', 'Entropic', 'Abyssal', 'Zero', 'Impossible',
    ],
    nouns: [
      'Expanse', 'Rift', 'Tear', 'Anomaly', 'Breach',
      'Threshold', 'Horizon', 'Edge', 'Fragment', 'Singularity',
      'Pocket', 'Fracture', 'Membrane', 'Scar', 'Rupture',
    ],
    suffixes: [
      'of Nothing', 'of the End', 'of Oblivion', 'of Entropy',
      'of the Void', 'of Deletion', 'of Null', 'of the Abyss',
      'of Absence', 'of Annihilation', 'of the Erased',
    ],
  },
  rusted_depths: {
    adjectives: [
      'Sunken', 'Dark', 'Forgotten', 'Dripping', 'Narrow',
      'Collapsed', 'Ancient', 'Buried', 'Suffocating', 'Echoing',
      'Crawling', 'Deep', 'Lost', 'Flooded', 'Creaking',
    ],
    nouns: [
      'Tunnel', 'Shaft', 'Catacomb', 'Mine', 'Undercroft',
      'Burrow', 'Sewer', 'Crypt', 'Passage', 'Pit',
      'Vault', 'Bunker', 'Chamber', 'Cavern', 'Underpass',
    ],
    suffixes: [
      'of the Buried', 'of Rust', 'of the Deep', 'of Darkness',
      'of Iron', 'of the Forgotten', 'of Bones', 'of the Drowned',
      'of Echoes', 'of the Earth', 'of Collapse',
    ],
  },
};

/** Generate a deterministic rift name from seed + biome. */
export function generateRiftName(seed: string, biome: BiomeId): string {
  const rng = seededRandom(`${seed}_rift_name`);
  const parts = RIFT_NAME_PARTS[biome];

  const adj = seededPick(parts.adjectives, rng);
  const noun = seededPick(parts.nouns, rng);

  // 50% chance of a suffix
  const hasSuffix = rng() > 0.5;
  const suffix = hasSuffix ? ' ' + seededPick(parts.suffixes, rng) : '';

  return `${adj} ${noun}${suffix}`;
}
