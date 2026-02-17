import type { Card, AppliedMod } from '@/types/card';
import { seededRandom, seededPick } from './seededRandom';

// ── Word pools ────────────────────────────────────────────────────────────────

const ADJECTIVES = [
  // Volt
  'Arc', 'Pulse', 'Surge', 'Flux', 'Spark', 'Ion', 'Volt', 'Static', 'Plasma', 'Thunder',
  // Cipher
  'Null', 'Void', 'Echo', 'Ghost', 'Shadow', 'Phantom', 'Nexus', 'Proxy', 'Mirror', 'Glitch',
  // Rust
  'Iron', 'Chrome', 'Steel', 'Alloy', 'Titan', 'Forge', 'Scrap', 'Rust', 'Heavy', 'Solid',
  // Phantom
  'Dark', 'Silent', 'Hollow', 'Fading', 'Obsidian', 'Nether', 'Grim', 'Pale', 'Deep', 'Lost',
  // Synth
  'Bio', 'Vivid', 'Prime', 'Nano', 'Cell', 'Gene', 'Viral', 'Toxic', 'Feral', 'Mutant',
  // Generic cyberpunk
  'Neon', 'Cyber', 'Digi', 'Quantum', 'Zero', 'Hyper', 'Ultra', 'Proto', 'Meta', 'Omega',
];

const NOUNS: Record<string, string[]> = {
  agent: [
    'Viper', 'Sentinel', 'Wraith', 'Specter', 'Hound', 'Hawk', 'Crawler', 'Hunter',
    'Striker', 'Guardian', 'Stalker', 'Reaper', 'Watcher', 'Runner', 'Drifter',
    'Enforcer', 'Breaker', 'Weaver', 'Splicer', 'Daemon', 'Construct', 'Golem',
    'Automaton', 'Revenant', 'Shade', 'Operative', 'Defector', 'Prototype',
  ],
  script: [
    'Blast', 'Wave', 'Spike', 'Torrent', 'Cascade', 'Burst', 'Rift', 'Shock',
    'Flare', 'Pulse', 'Storm', 'Crash', 'Breach', 'Overflow', 'Injection',
    'Exploit', 'Payload', 'Protocol', 'Sequence', 'Routine', 'Interrupt',
  ],
  malware: [
    'Virus', 'Worm', 'Trojan', 'Rootkit', 'Botnet', 'Spyware',
    'Backdoor', 'Keylogger', 'Parasite', 'Infection', 'Corruption', 'Plague',
    'Contagion', 'Blight', 'Decay', 'Erosion', 'Canker',
  ],
  trap: [
    'Snare', 'Net', 'Cage', 'Mine', 'Tripwire', 'Ambush', 'Deadfall', 'Pitfall',
    'Honeypot', 'Decoy', 'Lure', 'Web', 'Gridlock', 'Lockdown', 'Quarantine',
  ],
};

const SUFFIXES = [
  'MK-II', 'MK-III', 'MK-IV', 'v2.0', 'v3.1', 'X', 'Prime', 'Zero',
  'Alpha', 'Beta', 'Omega', 'EX', 'Plus', 'Pro', 'Elite', 'Sigma',
];

// ── Main function ─────────────────────────────────────────────────────────────

export function generateCardName(baseCard: Card, mods: AppliedMod[]): string {
  if (mods.length === 0) return baseCard.name;

  // Deterministic seed: same card + same mods = same name
  const modKey = mods
    .map((m) => `${m.modId}_T${m.tier}`)
    .sort()
    .join('_');
  const seed = `${baseCard.id}__${modKey}`;
  const rng = seededRandom(seed);

  const adj  = seededPick(ADJECTIVES, rng);
  const pool = NOUNS[baseCard.type] ?? NOUNS.agent;
  const noun = seededPick(pool, rng);
  const addSuffix = rng() < 0.3;
  const suffix = addSuffix ? ' ' + seededPick(SUFFIXES, rng) : '';

  return `${adj} ${noun}${suffix}`;
}
