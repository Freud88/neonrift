export interface RiftAbilityTier {
  description: string;
  value: number;
  value2?: number;
}

export interface RiftAbility {
  id: string;
  name: string;
  icon: string;
  applicableTo: ('script' | 'malware' | 'trap')[];
  tiers: Record<number, RiftAbilityTier>; // 1-5 tiers
}

function buildTiers(values: number[], fn: (v: number, tier: number) => RiftAbilityTier): Record<number, RiftAbilityTier> {
  return Object.fromEntries(values.map((v, i) => [i + 1, fn(v, i + 1)]));
}

export const RIFT_ABILITIES: RiftAbility[] = [
  {
    id: 'RA01', name: 'Void Pulse', icon: '💀', applicableTo: ['script'],
    tiers: buildTiers([3, 5, 7, 10, 14], (v) => ({
      description: `Deal ${v} damage to all enemy agents`,
      value: v,
    })),
  },
  {
    id: 'RA02', name: 'Neon Drain', icon: '🩸', applicableTo: ['script'],
    tiers: buildTiers([2, 3, 5, 7, 10], (v) => ({
      description: `Deal ${v} damage to target and heal that much`,
      value: v,
    })),
  },
  {
    id: 'RA03', name: 'Data Surge', icon: '⚡', applicableTo: ['script'],
    tiers: buildTiers([1, 2, 2, 3, 4], (v) => ({
      description: `Draw ${v} card${v > 1 ? 's' : ''} and gain 1 Data Cell`,
      value: v,
    })),
  },
  {
    id: 'RA04', name: 'Chrome Shield', icon: '🛡', applicableTo: ['script', 'trap'],
    tiers: buildTiers([2, 3, 4, 6, 8], (v) => ({
      description: `Give all your agents +${v} DEF`,
      value: v,
    })),
  },
  {
    id: 'RA05', name: 'Grid Overload', icon: '💥', applicableTo: ['script'],
    tiers: buildTiers([4, 6, 9, 12, 16], (v) => ({
      description: `Deal ${v} damage to the enemy player`,
      value: v,
    })),
  },
  {
    id: 'RA06', name: 'Phantom Recall', icon: '👻', applicableTo: ['script'],
    tiers: buildTiers([1, 1, 2, 2, 3], (v) => ({
      description: `Return ${v} card${v > 1 ? 's' : ''} from graveyard to hand`,
      value: v,
    })),
  },
  {
    id: 'RA07', name: 'Rift Summon', icon: '🌀', applicableTo: ['script'],
    tiers: buildTiers([2, 3, 4, 5, 7], (v) => ({
      description: `Summon a ${v}/${v} Rift Agent`,
      value: v,
    })),
  },
  {
    id: 'RA08', name: 'Entropy Wave', icon: '🌊', applicableTo: ['script', 'malware'],
    tiers: buildTiers([1, 2, 2, 3, 4], (v) => ({
      description: `Reduce all enemy agents' ATK by ${v}`,
      value: v,
    })),
  },
  {
    id: 'RA09', name: 'Quantum Lock', icon: '🔒', applicableTo: ['trap'],
    tiers: buildTiers([1, 1, 2, 2, 3], (v) => ({
      description: `When triggered: lock ${v} random enemy agent${v > 1 ? 's' : ''} (skip attack)`,
      value: v,
    })),
  },
  {
    id: 'RA10', name: 'Void Siphon', icon: '🕳', applicableTo: ['malware'],
    tiers: buildTiers([1, 1, 2, 2, 3], (v) => ({
      description: `Each turn: steal ${v} HP from enemy`,
      value: v,
    })),
  },
  {
    id: 'RA11', name: 'Neon Storm', icon: '⛈', applicableTo: ['script'],
    tiers: buildTiers([2, 3, 4, 5, 7], (v) => ({
      description: `Deal ${v} damage to a random enemy ${Math.ceil(v / 2)} times`,
      value: v, value2: Math.ceil(v / 2),
    })),
  },
  {
    id: 'RA12', name: 'System Purge', icon: '🧹', applicableTo: ['script'],
    tiers: buildTiers([1, 2, 2, 3, 4], (v) => ({
      description: `Destroy ${v} random enemy trap${v > 1 ? 's' : ''} and malware`,
      value: v,
    })),
  },
  {
    id: 'RA13', name: 'Echo Clone', icon: '🪞', applicableTo: ['script'],
    tiers: buildTiers([1, 2, 2, 3, 3], (v) => ({
      description: `Copy your strongest agent (${v === 1 ? 'base stats' : `+${v - 1} ATK/DEF`})`,
      value: v,
    })),
  },
  {
    id: 'RA14', name: 'Rift Blessing', icon: '✨', applicableTo: ['script', 'malware'],
    tiers: buildTiers([1, 2, 2, 3, 4], (v) => ({
      description: `Give all your agents +${v} ATK permanently`,
      value: v,
    })),
  },
  {
    id: 'RA15', name: 'Oblivion Gate', icon: '🕳', applicableTo: ['script'],
    tiers: buildTiers([99, 99, 99, 99, 99], () => ({
      description: 'Destroy ALL agents on the field (both sides)',
      value: 99,
    })),
  },
];

export const RIFT_ABILITY_MAP: Record<string, RiftAbility> = Object.fromEntries(
  RIFT_ABILITIES.map((a) => [a.id, a])
);
