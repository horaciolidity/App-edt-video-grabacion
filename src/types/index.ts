export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Resolution = '1080p' | '720p' | '480p';

export interface ChromaKeySettings {
  enabled: boolean;
  keyColor: string; // Hex string e.g. '#00ff00'
  tolerance: number; // 0.05 to 0.8
  softness: number; // 0.0 to 0.5
  spillReduction: number; // 0.0 to 1.0
  backgroundType: 'preset' | 'image' | 'video' | 'color';
  backgroundSrc: string; // URL / asset path
  backgroundName: string;
}

export interface ArtistFilter {
  id: string;
  name: string;
  category: 'hiphop' | 'trap' | 'pop' | 'rock' | 'reggaeton' | 'cinematic' | 'retro' | 'glitch';
  description: string;
  cssFilter: (intensity: number) => string;
  accentColor: string;
}

export interface ClipTransform {
  x: number; // -100 to 100 percentage
  y: number; // -100 to 100 percentage
  scale: number; // 0.1 to 3
  rotation: number; // 0 to 360 deg
  opacity: number; // 0 to 1
}

export interface ClipTextStyle {
  fontSize: number;
  color: string;
  strokeColor?: string;
  fontFamily: string;
  letterSpacing: string;
}

export interface MediaClip {
  id: string;
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  src: string;
  blobUrl?: string;
  startTime: number; // timeline start in seconds
  duration: number; // duration on timeline in seconds
  trimStart: number; // offset into source media in seconds
  trimEnd: number; // end timestamp in source media
  volume: number; // 0 to 2 (1 = 100%)
  speed: number; // 0.25 to 4
  isMuted: boolean;
  transform: ClipTransform;
  filterId?: string;
  filterIntensity: number; // 0 to 1
  chromaKey?: ChromaKeySettings;
  textContent?: string;
  textStyle?: ClipTextStyle;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'overlay';
  isMuted: boolean;
  isLocked: boolean;
  volume: number;
}

export interface ProjectTake {
  id: string;
  takeNumber: number;
  title: string;
  createdAt: number;
  videoUrl: string;
  vocalAudioUrl?: string;
  duration: number;
  beatId?: string;
  beatName?: string;
  beatAudioUrl?: string;
  beatStartTime?: number;
  isCustomMusic?: boolean;
  latencyOffsetMs: number;
  thumbnailUrl?: string;
  chromaSettings?: ChromaKeySettings;
  filterId?: string;
}

export interface BackingBeat {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  synthStyle: 'trap808' | 'boombap' | 'reggaeton' | 'synthpop' | 'drill' | 'rock';
  audioUrl?: string;
  isCustom?: boolean;
  fileName?: string;
  fileSize?: number;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  fps: number;
  duration: number;
  bpm: number;
  backingBeat?: BackingBeat;
  tracks: Track[];
  clips: MediaClip[];
  takes: ProjectTake[];
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
}

export type StudioTab = 'home' | 'camera' | 'karaoke' | 'editor' | 'projects' | 'effects';
