import { Project, ProjectTake, MediaClip, Track, AspectRatio } from '../types';
import { PRESET_BEATS, DEFAULT_CHROMA_SETTINGS, STUDIO_BACKGROUNDS } from '../constants/presets';

const STORAGE_KEY = 'vibestudio_projects_v1';
const CURRENT_PROJECT_ID_KEY = 'vibestudio_current_id_v1';

export function createInitialProject(title: string = 'Trap Anthem Take 1', genre: string = 'Trap'): Project {
  const projectId = 'proj_' + Date.now();
  const defaultBeat = PRESET_BEATS[0]; // Savage 808 Night

  const initialTracks: Track[] = [
    { id: 'tr_bg', name: 'Background Video / Stage', type: 'video', isMuted: false, isLocked: false, volume: 1 },
    { id: 'tr_artist', name: 'Artist Camera (Chroma Key)', type: 'video', isMuted: false, isLocked: false, volume: 1 },
    { id: 'tr_titles', name: 'Titles & Lyrics FX', type: 'overlay', isMuted: false, isLocked: false, volume: 1 },
    { id: 'tr_beat', name: 'Instrumental Beat', type: 'audio', isMuted: false, isLocked: false, volume: 0.9 },
    { id: 'tr_vocals', name: 'Vocal Takes Mix', type: 'audio', isMuted: false, isLocked: false, volume: 1.0 },
  ];

  // Initial starter clips to make the studio instantly editable and demonstrable
  const initialClips: MediaClip[] = [
    {
      id: 'clip_bg_1',
      trackId: 'tr_bg',
      name: 'Neon Stage Backdrop',
      type: 'image',
      src: STUDIO_BACKGROUNDS[0].src,
      startTime: 0,
      duration: 15,
      trimStart: 0,
      trimEnd: 15,
      volume: 1,
      speed: 1,
      isMuted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    },
    {
      id: 'clip_title_1',
      trackId: 'tr_titles',
      name: 'Drop Title FX',
      type: 'text',
      src: '',
      textContent: 'SAVAGE 808 ⚡',
      textStyle: {
        fontSize: 48,
        color: '#f0abfc',
        strokeColor: '#3b0764',
        fontFamily: 'Plus Jakarta Sans',
        letterSpacing: '0.05em'
      },
      startTime: 1,
      duration: 4,
      trimStart: 0,
      trimEnd: 4,
      volume: 1,
      speed: 1,
      isMuted: false,
      transform: { x: 0, y: -25, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    }
  ];

  return {
    id: projectId,
    title,
    genre,
    aspectRatio: '9:16' as AspectRatio,
    resolution: '1080p',
    fps: 30,
    duration: 15,
    bpm: defaultBeat.bpm,
    backingBeat: defaultBeat,
    tracks: initialTracks,
    clips: initialClips,
    takes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnailUrl: STUDIO_BACKGROUNDS[0].src
  };
}

export function loadAllProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialProject();
      saveProject(initial);
      return [initial];
    }
    const projects: Project[] = JSON.parse(raw);
    if (projects.length === 0) {
      const initial = createInitialProject();
      saveProject(initial);
      return [initial];
    }
    return projects;
  } catch (e) {
    console.error('Error loading projects from storage', e);
    const initial = createInitialProject();
    return [initial];
  }
}

export function saveProject(project: Project): void {
  try {
    const all = loadAllProjects().filter(p => p.id !== project.id);
    const updated = { ...project, updatedAt: Date.now() };
    all.unshift(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, project.id);
  } catch (e) {
    console.error('Error saving project to storage', e);
  }
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_ID_KEY);
}

export function addTakeToProject(project: Project, take: ProjectTake): Project {
  const updatedTakes = [take, ...project.takes];
  
  // Also automatically insert take video clip into the foreground video track
  const newClip: MediaClip = {
    id: 'clip_take_' + take.id,
    trackId: 'tr_artist',
    name: take.title,
    type: take.id.startsWith('photo_') ? 'image' : 'video',
    src: take.videoUrl,
    startTime: 0,
    duration: Math.max(3, take.duration),
    trimStart: 0,
    trimEnd: Math.max(3, take.duration),
    volume: 1,
    speed: 1,
    isMuted: false,
    transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    chromaKey: take.chromaSettings || { ...DEFAULT_CHROMA_SETTINGS, enabled: true },
    filterId: take.filterId || 'normal',
    filterIntensity: 0.7
  };

  const updatedClips = [...project.clips, newClip];

  // If take was recorded with custom music, also insert the music clip into tr_beat
  if (take.beatAudioUrl) {
    const musicClip: MediaClip = {
      id: 'clip_music_' + take.id,
      trackId: 'tr_beat',
      name: take.beatName || 'Backing Music',
      type: 'audio',
      src: take.beatAudioUrl,
      startTime: 0,
      duration: Math.max(3, take.duration),
      trimStart: take.beatStartTime || 0,
      trimEnd: (take.beatStartTime || 0) + Math.max(3, take.duration),
      volume: 0.9,
      speed: 1,
      isMuted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    };
    updatedClips.push(musicClip);
  }

  const newDuration = Math.max(project.duration, take.duration);

  const updatedProject = {
    ...project,
    takes: updatedTakes,
    clips: updatedClips,
    duration: newDuration,
    updatedAt: Date.now()
  };

  saveProject(updatedProject);
  return updatedProject;
}
