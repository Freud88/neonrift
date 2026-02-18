import type { BiomeId } from '@/types/zone';

export interface BiomePalette {
  floor: string;
  road: string;
  accent: string;
  wallDensity: number;
  wallColor: string;
  waterColor: string;
  rainColor: string;
}

export const BIOME_PALETTES: Record<BiomeId, BiomePalette> = {
  neon_streets: {
    floor: '#0d0d1a',
    road: '#111122',
    accent: '#00f0ff',
    wallDensity: 0.35,
    wallColor: '#0f0f1e',
    waterColor: '#001a1a',
    rainColor: 'rgba(0,240,255,',
  },
  industrial_wasteland: {
    floor: '#121008',
    road: '#1a1508',
    accent: '#ff8800',
    wallDensity: 0.40,
    wallColor: '#1a1208',
    waterColor: '#1a1000',
    rainColor: 'rgba(255,136,0,',
  },
  data_swamp: {
    floor: '#081210',
    road: '#0a1a12',
    accent: '#44ff88',
    wallDensity: 0.28,
    wallColor: '#0a140e',
    waterColor: '#003322',
    rainColor: 'rgba(68,255,136,',
  },
  chrome_forest: {
    floor: '#0e0818',
    road: '#140e22',
    accent: '#cc88ff',
    wallDensity: 0.42,
    wallColor: '#120a1e',
    waterColor: '#0a0022',
    rainColor: 'rgba(204,136,255,',
  },
  void_sector: {
    floor: '#0a0008',
    road: '#140010',
    accent: '#ff0066',
    wallDensity: 0.30,
    wallColor: '#100010',
    waterColor: '#0a000a',
    rainColor: 'rgba(255,0,102,',
  },
  rusted_depths: {
    floor: '#120808',
    road: '#1a0e0e',
    accent: '#ff4422',
    wallDensity: 0.45,
    wallColor: '#1a0a08',
    waterColor: '#1a0800',
    rainColor: 'rgba(255,68,34,',
  },
};

export const BIOME_ORDER: BiomeId[] = [
  'neon_streets', 'industrial_wasteland', 'data_swamp',
  'chrome_forest', 'void_sector', 'rusted_depths',
];
