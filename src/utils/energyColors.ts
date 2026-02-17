import type { EnergyType } from '@/types/card';

export const ENERGY_COLORS: Record<EnergyType, { primary: string; glow: string; bg: string }> = {
  volt:    { primary: '#ffe600', glow: 'rgba(255,230,0,0.5)',   bg: 'rgba(255,230,0,0.08)'   },
  cipher:  { primary: '#00f0ff', glow: 'rgba(0,240,255,0.5)',   bg: 'rgba(0,240,255,0.08)'   },
  rust:    { primary: '#ff6b2b', glow: 'rgba(255,107,43,0.5)',  bg: 'rgba(255,107,43,0.08)'  },
  phantom: { primary: '#c850ff', glow: 'rgba(200,80,255,0.5)',  bg: 'rgba(200,80,255,0.08)'  },
  synth:   { primary: '#39ff14', glow: 'rgba(57,255,20,0.5)',   bg: 'rgba(57,255,20,0.08)'   },
  neutral: { primary: '#8888aa', glow: 'rgba(136,136,170,0.4)', bg: 'rgba(136,136,170,0.06)' },
};

export const ENERGY_LABEL: Record<EnergyType, string> = {
  volt:    'VOLT',
  cipher:  'CIPHER',
  rust:    'RUST',
  phantom: 'PHANTOM',
  synth:   'SYNTH',
  neutral: 'NEUTRAL',
};

export const TYPE_LABEL: Record<string, string> = {
  agent:   'AGENT',
  script:  'SCRIPT',
  malware: 'MALWARE',
  trap:    'TRAP',
};
