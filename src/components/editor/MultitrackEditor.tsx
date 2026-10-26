import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, MediaClip, StudioTab, AspectRatio } from '../../types';
import { PRESET_BEATS, STUDIO_BACKGROUNDS, DEFAULT_CHROMA_SETTINGS } from '../../constants/presets';
import { beatSynthesizer } from '../../services/beatSynthesizer';
import { EditorTopBar } from './EditorTopBar';
import { VideoPreviewMonitor } from './VideoPreviewMonitor';
import { TimelineWorkspace } from './TimelineWorkspace';
import { ContextualToolbar } from './ContextualToolbar';

interface MultitrackEditorProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenExport: () => void;
  onNavigateTab?: (tab: StudioTab) => void;
}

export const MultitrackEditor: React.FC<MultitrackEditorProps> = ({
  project,
  onUpdateProject,
  onOpenExport,
  onNavigateTab
}) => {
  // Timeline Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(45); // pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(project.clips[0]?.id || null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Project[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Playhead timer ref
  const playheadIntervalRef = useRef<number | null>(null);

  const selectedClip = project.clips.find(c => c.id === selectedClipId) || null;

  // Show transient toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  };

  // Push new project snapshot to undo/redo history and save
  const pushHistory = useCallback((newProject: Project) => {
    setIsSaved(false);
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newProject);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    onUpdateProject(newProject);

    setTimeout(() => {
      setIsSaved(true);
    }, 600);
  }, [history, historyIndex, onUpdateProject]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateProject(prev);
      showToast('Undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateProject(next);
      showToast('Redo');
    }
  };

  // Audio elements cache for timeline playback
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Synchronize audio clips with currentTime
  useEffect(() => {
    project.clips.forEach(clip => {
      if (clip.type === 'audio' && clip.src) {
        let aud = audioElementsRef.current.get(clip.src);
        if (!aud) {
          aud = new Audio(clip.src);
          audioElementsRef.current.set(clip.src, aud);
        }
        const track = project.tracks.find(t => t.id === clip.trackId);
        const isTrackMuted = track?.isMuted ?? false;
        aud.muted = isTrackMuted || clip.isMuted;
        aud.volume = Math.max(0, Math.min(1, (clip.volume ?? 1) * (track?.volume ?? 1)));

        const isActive = currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration;
        if (isActive) {
          const targetTime = Math.max(0, (currentTime - clip.startTime) * clip.speed + clip.trimStart);
          if (Math.abs(aud.currentTime - targetTime) > 0.15) {
            aud.currentTime = targetTime;
          }
          if (isPlaying && aud.paused) {
            aud.play().catch(() => {});
          } else if (!isPlaying && !aud.paused) {
            aud.pause();
          }
        } else {
          if (!aud.paused) {
            aud.pause();
          }
        }
      }
    });

    if (!isPlaying) {
      audioElementsRef.current.forEach(aud => {
        if (!aud.paused) aud.pause();
      });
    }
  }, [currentTime, isPlaying, project.clips, project.tracks]);

  // Playhead Tick Loop & Web Audio Synchronization
  useEffect(() => {
    if (isPlaying) {
      // Start backing beat audio ONLY if no custom audio clip is present on tr_beat
      const beatTrack = project.tracks.find(t => t.id === 'tr_beat');
      const hasCustomAudio = project.clips.some(c => c.trackId === 'tr_beat' && c.type === 'audio' && c.src);

      if (!hasCustomAudio && project.backingBeat && (!beatTrack || !beatTrack.isMuted)) {
        beatSynthesizer.start(project.backingBeat.synthStyle, project.bpm);
        beatSynthesizer.setVolume((beatTrack?.volume ?? 1) * 0.85);
      }

      const stepMs = 40; // 25fps clock
      playheadIntervalRef.current = window.setInterval(() => {
        setCurrentTime(t => {
          const next = t + stepMs / 1000;
          if (next >= project.duration) {
            return 0; // loop seamlessly
          }
          return next;
        });
      }, stepMs);
    } else {
      beatSynthesizer.stop();
      audioElementsRef.current.forEach(aud => aud.pause());
      if (playheadIntervalRef.current) {
        clearInterval(playheadIntervalRef.current);
        playheadIntervalRef.current = null;
      }
    }

    return () => {
      beatSynthesizer.stop();
      audioElementsRef.current.forEach(aud => aud.pause());
      if (playheadIntervalRef.current) {
        clearInterval(playheadIntervalRef.current);
        playheadIntervalRef.current = null;
      }
    };
  }, [isPlaying, project.duration, project.backingBeat, project.bpm, project.tracks, project.clips]);

  // Update a single clip
  const handleUpdateClip = (clipId: string, patch: Partial<MediaClip>) => {
    const updatedClips = project.clips.map(c => {
      if (c.id === clipId) {
        return { ...c, ...patch };
      }
      return c;
    });

    pushHistory({
      ...project,
      clips: updatedClips
    });
  };

  // Split Clip at Playhead
  const handleSplitClip = () => {
    if (!selectedClip) {
      showToast('Select a clip first to split');
      return;
    }

    const clipStart = selectedClip.startTime;
    const clipEnd = selectedClip.startTime + selectedClip.duration;

    if (currentTime <= clipStart + 0.2 || currentTime >= clipEnd - 0.2) {
      showToast('Position playhead inside clip to split');
      return;
    }

    const firstDuration = currentTime - clipStart;
    const secondDuration = selectedClip.duration - firstDuration;

    const clip1: MediaClip = {
      ...selectedClip,
      duration: firstDuration,
      trimEnd: selectedClip.trimStart + firstDuration
    };

    const clip2: MediaClip = {
      ...selectedClip,
      id: 'clip_' + Date.now(),
      startTime: currentTime,
      duration: secondDuration,
      trimStart: selectedClip.trimStart + firstDuration,
      trimEnd: selectedClip.trimEnd,
      name: selectedClip.name + ' (Cut)'
    };

    const updatedClips = project.clips.map(c => (c.id === selectedClip.id ? clip1 : c));
    updatedClips.push(clip2);

    pushHistory({
      ...project,
      clips: updatedClips
    });

    setSelectedClipId(clip2.id);
    showToast('Clip split at playhead');
  };

  // Duplicate Clip
  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    const duplicated: MediaClip = {
      ...selectedClip,
      id: 'clip_' + Date.now(),
      name: selectedClip.name + ' (Copy)',
      startTime: Math.min(project.duration - 1, selectedClip.startTime + selectedClip.duration + 0.2)
    };

    const updatedClips = [...project.clips, duplicated];
    pushHistory({
      ...project,
      clips: updatedClips,
      duration: Math.max(project.duration, duplicated.startTime + duplicated.duration)
    });

    setSelectedClipId(duplicated.id);
    showToast('Clip duplicated');
  };

  // Delete Clip
  const handleDeleteClip = () => {
    if (!selectedClip) return;
    const remaining = project.clips.filter(c => c.id !== selectedClip.id);
    pushHistory({
      ...project,
      clips: remaining
    });
    setSelectedClipId(remaining[0]?.id || null);
    showToast('Clip deleted');
  };

  // Add Lyric / Title Clip
  const handleAddTitleClip = () => {
    const titleClip: MediaClip = {
      id: 'clip_title_' + Date.now(),
      trackId: 'tr_titles',
      name: 'Title Overlay FX',
      type: 'text',
      src: '',
      textContent: 'DROP THE BASS ⚡',
      textStyle: {
        fontSize: 36,
        color: '#f0abfc',
        strokeColor: '#3b0764',
        fontFamily: 'Plus Jakarta Sans',
        letterSpacing: '0.05em'
      },
      startTime: currentTime,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      volume: 1,
      speed: 1,
      isMuted: false,
      transform: { x: 0, y: -20, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    };

    pushHistory({
      ...project,
      clips: [...project.clips, titleClip]
    });
    setSelectedClipId(titleClip.id);
    showToast('Title Card added to timeline');
  };

  // Add Media Clip (e.g. stage background)
  const handleAddMediaClip = (src: string, name: string, type: 'image' | 'video') => {
    const newClip: MediaClip = {
      id: 'clip_media_' + Date.now(),
      trackId: 'tr_bg',
      name,
      type,
      src,
      startTime: currentTime,
      duration: Math.min(15, project.duration - currentTime || 5),
      trimStart: 0,
      trimEnd: Math.min(15, project.duration - currentTime || 5),
      volume: 1,
      speed: 1,
      isMuted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    };

    pushHistory({
      ...project,
      clips: [...project.clips, newClip]
    });
    setSelectedClipId(newClip.id);
    showToast(`${name} added to timeline`);
  };

  // Change Project Aspect Ratio
  const handleChangeAspectRatio = (aspectRatio: AspectRatio) => {
    pushHistory({
      ...project,
      aspectRatio
    });
    showToast(`Aspect ratio: ${aspectRatio}`);
  };

  // Change Backing Beat
  const handleChangeBackingBeat = (beatId: string) => {
    const beat = PRESET_BEATS.find(b => b.id === beatId);
    if (!beat) return;
    pushHistory({
      ...project,
      backingBeat: beat,
      bpm: beat.bpm
    });
    showToast(`Backing beat set: ${beat.title}`);
  };

  // Change Project Length
  const handleChangeProjectDuration = (duration: number) => {
    pushHistory({
      ...project,
      duration
    });
    showToast(`Project duration set to ${duration}s`);
  };

  // Rename Project Title
  const handleRenameProject = (newTitle: string) => {
    pushHistory({
      ...project,
      title: newTitle
    });
    showToast('Project title updated');
  };

  // Track Mute & Lock Toggles
  const handleToggleTrackMute = (trackId: string) => {
    const updated = project.tracks.map(t => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t));
    pushHistory({ ...project, tracks: updated });
  };

  const handleToggleTrackLock = (trackId: string) => {
    const updated = project.tracks.map(t => (t.id === trackId ? { ...t, isLocked: !t.isLocked } : t));
    pushHistory({ ...project, tracks: updated });
  };

  // Eyedropper Color Picked Callback
  const handlePickColor = (hex: string) => {
    if (selectedClip) {
      const prevChroma = selectedClip.chromaKey || {
        ...DEFAULT_CHROMA_SETTINGS,
        enabled: true
      };
      handleUpdateClip(selectedClip.id, {
        chromaKey: {
          ...prevChroma,
          enabled: true,
          keyColor: hex
        }
      });
      showToast(`Chroma key set to ${hex.toUpperCase()}`);
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col bg-[#07090e] text-slate-100 select-none overflow-hidden relative">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* A. Top Toolbar */}
      <EditorTopBar
        project={project}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenExport={onOpenExport}
        onNavigateBack={() => onNavigateTab?.('home')}
        onRenameProject={handleRenameProject}
        onChangeAspectRatio={handleChangeAspectRatio}
        isSaved={isSaved}
      />

      {/* B. Video Preview Monitor */}
      <VideoPreviewMonitor
        project={project}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onSeek={setCurrentTime}
        selectedClip={selectedClip}
        onPickColor={handlePickColor}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
        onChangeAspectRatio={handleChangeAspectRatio}
      />

      {/* C. Timeline Workspace */}
      <TimelineWorkspace
        project={project}
        currentTime={currentTime}
        zoom={timelineZoom}
        onChangeZoom={setTimelineZoom}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={setCurrentTime}
        onUpdateClip={handleUpdateClip}
        onSplitClip={handleSplitClip}
        onDuplicateClip={handleDuplicateClip}
        onDeleteClip={handleDeleteClip}
        onAddTitleClip={handleAddTitleClip}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackLock={handleToggleTrackLock}
      />

      {/* D. Contextual Toolbar */}
      <ContextualToolbar
        project={project}
        selectedClip={selectedClip}
        onUpdateClip={handleUpdateClip}
        onSplitClip={handleSplitClip}
        onDuplicateClip={handleDuplicateClip}
        onDeleteClip={handleDeleteClip}
        onDeselectClip={() => setSelectedClipId(null)}
        onAddTitleClip={handleAddTitleClip}
        onAddMediaClip={handleAddMediaClip}
        onChangeBackingBeat={handleChangeBackingBeat}
        onChangeAspectRatio={handleChangeAspectRatio}
        onChangeProjectDuration={handleChangeProjectDuration}
        isEyedropperActive={isEyedropperActive}
        onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
      />
    </div>
  );
};
