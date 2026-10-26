import { ArtistFilter, BackingBeat, ChromaKeySettings } from '../types';

export const STUDIO_BACKGROUNDS = [
  {
    id: 'trap_neon_stage',
    name: 'Trap Neon Stage',
    genre: 'Trap / Hip-Hop',
    src: '/src/assets/images/trap_neon_stage_1792969104282.jpg',
    description: 'Neon purple laser towers and concert fog arena'
  },
  {
    id: 'tokyo_rooftop',
    name: 'Tokyo Neon Skyline',
    genre: 'Drill / Urban',
    src: '/src/assets/images/tokyo_night_skyline_1792969117088.jpg',
    description: 'Rainy skyscraper rooftop with cyber billboards'
  },
  {
    id: 'grunge_warehouse',
    name: 'Industrial Warehouse',
    genre: 'Rock / Underground',
    src: '/src/assets/images/grunge_warehouse_1792969116730.jpg',
    description: 'Gritty concrete columns with dramatic warm spot beams'
  },
  {
    id: 'sunset_palms',
    name: 'Miami Synth Sunset',
    genre: 'Reggaeton / Pop',
    src: '/src/assets/images/sunset_palms_1792969116943.jpg',
    description: 'Retro synthwave beach with neon palm silhouettes'
  }
];

export const DEFAULT_CHROMA_SETTINGS: ChromaKeySettings = {
  enabled: false,
  keyColor: '#00ff00',
  tolerance: 0.35,
  softness: 0.15,
  spillReduction: 0.65,
  backgroundType: 'preset',
  backgroundSrc: '/src/assets/images/trap_neon_stage_1792969104282.jpg',
  backgroundName: 'Trap Neon Stage'
};

export const CHROMA_COLOR_PRESETS = [
  { name: 'Studio Green', hex: '#00ff00', label: 'Green Screen' },
  { name: 'Chroma Blue', hex: '#0044ff', label: 'Blue Screen' },
  { name: 'Magenta Screen', hex: '#ff00aa', label: 'Magenta' },
  { name: 'Cyan Screen', hex: '#00e5ff', label: 'Cyan Key' },
  { name: 'Dark Void', hex: '#0a0a14', label: 'Blackout' },
];

export const ARTIST_FILTERS: ArtistFilter[] = [
  {
    id: 'normal',
    name: 'Raw Studio',
    category: 'cinematic',
    description: 'Clean high-fidelity uncompressed camera capture',
    cssFilter: () => 'none',
    accentColor: '#94a3b8'
  },
  {
    id: 'trap_cyber',
    name: 'Trap Neon Glow',
    category: 'trap',
    description: 'Electric violet hue shift, boosted contrast and neon rim highlights',
    cssFilter: (intensity) => `contrast(${1 + 0.5 * intensity}) saturate(${1 + 0.8 * intensity}) hue-rotate(${intensity * 35}deg) drop-shadow(0 0 ${8 * intensity}px rgba(168,85,247,0.4))`,
    accentColor: '#c084fc'
  },
  {
    id: 'vhs_retro',
    name: '90s VHS Camcorder',
    category: 'retro',
    description: 'Analog tape saturation, chromatic aberration simulation, and scanlines',
    cssFilter: (intensity) => `contrast(${1 + 0.3 * intensity}) saturate(${1 + 0.5 * intensity}) sepia(${0.25 * intensity})`,
    accentColor: '#fbbf24'
  },
  {
    id: 'hiphop_fisheye',
    name: 'Hype Fish-Eye',
    category: 'hiphop',
    description: 'Ultra-wide music video perspective with punchy contrast and 90s edge vignette',
    cssFilter: (intensity) => `contrast(${1 + 0.45 * intensity}) brightness(${1 + 0.1 * intensity})`,
    accentColor: '#f97316'
  },
  {
    id: 'glitch_matrix',
    name: 'Digital Glitch',
    category: 'glitch',
    description: 'Cyberpunk digital artifacting, channel separation, and high energy strobe',
    cssFilter: (intensity) => `invert(${0.1 * intensity}) contrast(${1 + 0.6 * intensity}) hue-rotate(${intensity * 90}deg)`,
    accentColor: '#06b6d4'
  },
  {
    id: 'noir_cinema',
    name: 'Dark Noir B&W',
    category: 'cinematic',
    description: 'Dramatic black and white with crushed darks and silver highlights',
    cssFilter: (intensity) => `grayscale(${1 * intensity}) contrast(${1 + 0.8 * intensity}) brightness(${0.9 + 0.1 * (1 - intensity)})`,
    accentColor: '#e2e8f0'
  },
  {
    id: 'reggaeton_sun',
    name: 'Miami Golden Dembow',
    category: 'reggaeton',
    description: 'Warm golden tropics, amber sun flare, and boosted vibrance',
    cssFilter: (intensity) => `sepia(${0.3 * intensity}) saturate(${1 + 0.6 * intensity}) brightness(${1 + 0.15 * intensity})`,
    accentColor: '#eab308'
  },
  {
    id: 'pop_dream',
    name: 'Pastel Pop Dream',
    category: 'pop',
    description: 'Silky smooth pastel diffusion, ethereal magenta bloom, and soft skin tone',
    cssFilter: (intensity) => `brightness(${1 + 0.2 * intensity}) saturate(${1 + 0.35 * intensity}) drop-shadow(0 0 ${12 * intensity}px rgba(244,114,182,0.35))`,
    accentColor: '#f472b6'
  },
  {
    id: 'rage_rock',
    name: 'Rage Grunge',
    category: 'rock',
    description: 'High gain grit, crushed shadows, harsh mids, and industrial warmth',
    cssFilter: (intensity) => `contrast(${1 + 0.9 * intensity}) saturate(${0.7 + 0.3 * (1 - intensity)}) brightness(${0.95})`,
    accentColor: '#ef4444'
  }
];

export const PRESET_BEATS: BackingBeat[] = [
  {
    id: 'beat_savage_808',
    title: 'Savage 808 Night',
    artist: 'VibeStudio Labs',
    genre: 'Trap',
    bpm: 140,
    key: 'F Minor',
    duration: 60,
    synthStyle: 'trap808'
  },
  {
    id: 'beat_drill_anthem',
    title: 'Ghost Drill Anthem',
    artist: 'VibeStudio Labs',
    genre: 'Drill',
    bpm: 142,
    key: 'C Minor',
    duration: 60,
    synthStyle: 'drill'
  },
  {
    id: 'beat_boombap_94',
    title: 'Queensbridge 94',
    artist: 'VibeStudio Labs',
    genre: 'Hip-Hop',
    bpm: 92,
    key: 'G Minor',
    duration: 60,
    synthStyle: 'boombap'
  },
  {
    id: 'beat_dembow_fuego',
    title: 'Dembow Fuego',
    artist: 'VibeStudio Labs',
    genre: 'Reggaeton',
    bpm: 96,
    key: 'A Minor',
    duration: 60,
    synthStyle: 'reggaeton'
  },
  {
    id: 'beat_synthpop_highway',
    title: 'Neon Highway 1986',
    artist: 'VibeStudio Labs',
    genre: 'Pop / Synthwave',
    bpm: 118,
    key: 'D Minor',
    duration: 60,
    synthStyle: 'synthpop'
  },
  {
    id: 'beat_rage_rock',
    title: 'Overdrive Riot',
    artist: 'VibeStudio Labs',
    genre: 'Rock / Trap Metal',
    bpm: 148,
    key: 'E Minor',
    duration: 60,
    synthStyle: 'rock'
  }
];
