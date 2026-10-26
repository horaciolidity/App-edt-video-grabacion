import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Plus,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Film,
  Music,
  Type,
  Layers,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { Project, MediaClip, Track } from '../../types';

interface TimelineWorkspaceProps {
  project: Project;
  currentTime: number;
  zoom: number; // pixels per second (25 - 120)
  onChangeZoom: (newZoom: number) => void;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onUpdateClip: (clipId: string, patch: Partial<MediaClip>) => void;
  onSplitClip: () => void;
  onDuplicateClip: () => void;
  onDeleteClip: () => void;
  onAddTitleClip: () => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
}

type DragMode = 'move' | 'trim-left' | 'trim-right' | 'scrub-playhead' | null;

interface DragState {
  mode: DragMode;
  clipId?: string;
  startClientX: number;
  initialStartTime: number;
  initialDuration: number;
  initialTrimStart: number;
  initialTrimEnd: number;
  currentDeltaSec: number;
}

export const TimelineWorkspace: React.FC<TimelineWorkspaceProps> = ({
  project,
  currentTime,
  zoom,
  onChangeZoom,
  selectedClipId,
  onSelectClip,
  onSeek,
  onUpdateClip,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onAddTitleClip,
  onToggleTrackMute,
  onToggleTrackLock
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const selectedClip = project.clips.find(c => c.id === selectedClipId) || null;

  // Total project duration in pixels
  const totalTimelineWidthPx = Math.max(600, project.duration * zoom + 300);

  // Keep playhead in view when scrubbing
  useEffect(() => {
    if (dragState?.mode === 'scrub-playhead' && containerRef.current) {
      const container = containerRef.current;
      const playheadX = currentTime * zoom;
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;

      if (playheadX > scrollLeft + clientWidth - 60) {
        container.scrollLeft = playheadX - clientWidth + 120;
      } else if (playheadX < scrollLeft + 60) {
        container.scrollLeft = Math.max(0, playheadX - 60);
      }
    }
  }, [currentTime, zoom, dragState?.mode]);

  // Global Pointer Move & Up listeners for Dragging / Trimming / Scrubbing
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragState.startClientX;
      const deltaSec = deltaX / zoom;

      if (dragState.mode === 'scrub-playhead') {
        if (rulerRef.current && containerRef.current) {
          const rect = rulerRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
          const newTime = Math.max(0, Math.min(project.duration, clickX / zoom));
          onSeek(newTime);
        }
      } else {
        setDragState(prev => (prev ? { ...prev, currentDeltaSec: deltaSec } : null));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragState) return;

      const deltaX = e.clientX - dragState.startClientX;
      const deltaSec = deltaX / zoom;

      if (dragState.clipId) {
        const clip = project.clips.find(c => c.id === dragState.clipId);
        if (clip) {
          if (dragState.mode === 'move') {
            const rawNewStart = dragState.initialStartTime + deltaSec;
            // Snap to nearest 0.25s
            const snappedStart = Math.round(rawNewStart * 4) / 4;
            const finalStart = Math.max(0, Math.min(project.duration - clip.duration, snappedStart));
            onUpdateClip(clip.id, { startTime: finalStart });
          } else if (dragState.mode === 'trim-left') {
            // Adjust start time and trim start
            const requestedChange = deltaSec;
            const maxDelta = dragState.initialDuration - 0.5; // minimum 0.5s duration
            const clampedDelta = Math.max(-dragState.initialStartTime, Math.min(maxDelta, requestedChange));

            const newStartTime = Math.max(0, dragState.initialStartTime + clampedDelta);
            const newDuration = Math.max(0.5, dragState.initialDuration - clampedDelta);
            const newTrimStart = Math.max(0, dragState.initialTrimStart + clampedDelta);

            onUpdateClip(clip.id, {
              startTime: newStartTime,
              duration: newDuration,
              trimStart: newTrimStart
            });
          } else if (dragState.mode === 'trim-right') {
            // Adjust duration and trim end
            const newDuration = Math.max(0.5, dragState.initialDuration + deltaSec);
            const newTrimEnd = dragState.initialTrimStart + newDuration;
            onUpdateClip(clip.id, {
              duration: newDuration,
              trimEnd: newTrimEnd
            });
          }
        }
      }

      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, zoom, project.clips, project.duration, onSeek, onUpdateClip]);

  // Handle pointer down on ruler for playhead scrubbing
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(project.duration, clickX / zoom));
    onSeek(newTime);

    setDragState({
      mode: 'scrub-playhead',
      startClientX: e.clientX,
      initialStartTime: 0,
      initialDuration: 0,
      initialTrimStart: 0,
      initialTrimEnd: 0,
      currentDeltaSec: 0
    });
  };

  // Track Type Icon Helper
  const getTrackIcon = (track: Track) => {
    if (track.id === 'tr_titles' || track.type === 'overlay') return <Type className="w-3.5 h-3.5 text-cyan-400" />;
    if (track.id === 'tr_artist') return <Film className="w-3.5 h-3.5 text-purple-400" />;
    if (track.id === 'tr_bg') return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
    return <Music className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] border-t border-slate-800/80 overflow-hidden select-none">
      {/* 1. Quick Editing Action Bar */}
      <div className="h-10 bg-[#0a0d14] border-b border-slate-800/80 px-3 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={onSplitClip}
            disabled={!selectedClip}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer shrink-0"
            title="Split selected clip at current playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split</span>
          </button>

          <button
            onClick={onDuplicateClip}
            disabled={!selectedClip}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer shrink-0"
            title="Duplicate selected clip"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>Duplicate</span>
          </button>

          <button
            onClick={onDeleteClip}
            disabled={!selectedClip}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950/60 disabled:opacity-35 text-slate-200 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 hover:border-red-800 transition-colors cursor-pointer shrink-0"
            title="Delete selected clip"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1 shrink-0" />

          <button
            onClick={onAddTitleClip}
            className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Add stylish lyric/title card"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>+ Title Card</span>
          </button>
        </div>

        {/* Timeline Zoom Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onChangeZoom(Math.max(25, zoom - 15))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="25"
            max="120"
            value={zoom}
            onChange={(e) => onChangeZoom(parseInt(e.target.value))}
            className="w-16 sm:w-24 accent-purple-500 cursor-pointer"
            title="Timeline Zoom"
          />

          <button
            onClick={() => onChangeZoom(Math.min(120, zoom + 15))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Multitrack Grid: Left Headers + Right Scrollable Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sticky Track Headers Column */}
        <div className="w-28 sm:w-44 bg-[#0a0d14] border-r border-slate-800/90 flex flex-col shrink-0 z-20 shadow-lg">
          {/* Top Ruler Header Spacer */}
          <div className="h-7 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between px-2 text-[10px] text-slate-400 font-mono font-semibold">
            <span>TRACKS</span>
            <span className="hidden sm:inline text-slate-500 text-[9px]">{project.tracks.length} LANES</span>
          </div>

          {/* Track Headers List */}
          <div className="flex-1 overflow-y-hidden">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 px-2 sm:px-3 border-b border-slate-800/70 flex items-center justify-between text-xs group bg-[#090b12]"
              >
                <div className="truncate pr-1">
                  <div className="flex items-center gap-1.5">
                    {getTrackIcon(track)}
                    <span className="font-semibold text-slate-200 text-[11px] truncate">{track.name}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase font-mono mt-0.5 hidden sm:block">
                    {track.type}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onToggleTrackMute(track.id)}
                    className={`p-1 rounded hover:bg-slate-800 cursor-pointer transition-colors ${
                      track.isMuted ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onToggleTrackLock(track.id)}
                    className={`p-1 rounded hover:bg-slate-800 cursor-pointer transition-colors ${
                      track.isLocked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {track.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Workspace */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#07090e] cursor-default"
          style={{ touchAction: 'pan-x' }}
          onClick={(e) => {
            // Tap empty timeline background to deselect clip
            if (e.target === e.currentTarget) {
              onSelectClip(null);
            }
          }}
        >
          {/* A. Time Ruler (Interactive Playhead Scrubbing) */}
          <div
            ref={rulerRef}
            onPointerDown={handleRulerPointerDown}
            className="h-7 border-b border-slate-800 bg-[#07090f] flex items-center relative font-mono text-[10px] text-slate-400 select-none cursor-pointer shrink-0 hover:bg-slate-900/50"
            style={{ width: `${totalTimelineWidthPx}px` }}
          >
            {/* Generate second ticks and sub-ticks */}
            {Array.from({ length: Math.ceil(project.duration) + 4 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute flex flex-col items-center pointer-events-none"
                style={{ left: `${sec * zoom}px` }}
              >
                <div className="h-2.5 w-[1px] bg-slate-700" />
                <span className="text-[9px] mt-0.5 text-slate-400 font-mono">{sec}s</span>

                {/* Sub-second half tick */}
                {zoom >= 40 && (
                  <div
                    className="absolute top-0 h-1.5 w-[1px] bg-slate-800"
                    style={{ left: `${zoom / 2}px` }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* B. Master Playhead Line (Synced Red Laser Indicator) */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_#ef4444]"
            style={{
              left: `${currentTime * zoom}px`,
              transition: dragState?.mode === 'scrub-playhead' ? 'none' : 'left 0.05s linear'
            }}
          >
            {/* Playhead Top Thumb Handle */}
            <div className="w-3.5 h-3.5 bg-red-500 -ml-[6px] rotate-45 rounded-[2px] shadow-md shadow-red-500/50" />
          </div>

          {/* C. Tracks Canvas Area */}
          <div
            className="relative"
            style={{ width: `${totalTimelineWidthPx}px` }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelectClip(null);
            }}
          >
            {project.tracks.map((track) => {
              const trackClips = project.clips.filter(c => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  className="h-14 border-b border-slate-800/70 relative bg-slate-950/20"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) onSelectClip(null);
                  }}
                >
                  {trackClips.map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    const isBeingDragged = dragState?.clipId === clip.id;

                    // Dynamic coordinates during drag/trim
                    let effectiveStart = clip.startTime;
                    let effectiveDuration = clip.duration;

                    if (isBeingDragged) {
                      if (dragState.mode === 'move') {
                        effectiveStart = Math.max(
                          0,
                          Math.min(project.duration - clip.duration, dragState.initialStartTime + dragState.currentDeltaSec)
                        );
                      } else if (dragState.mode === 'trim-left') {
                        const delta = dragState.currentDeltaSec;
                        effectiveStart = Math.max(0, dragState.initialStartTime + delta);
                        effectiveDuration = Math.max(0.5, dragState.initialDuration - delta);
                      } else if (dragState.mode === 'trim-right') {
                        effectiveDuration = Math.max(0.5, dragState.initialDuration + dragState.currentDeltaSec);
                      }
                    }

                    const leftPx = effectiveStart * zoom;
                    const widthPx = Math.max(28, effectiveDuration * zoom);

                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);

                          if (track.isLocked) return;

                          // Only start move if target is not a trim handle
                          if ((e.target as HTMLElement).dataset.handle) return;

                          setDragState({
                            mode: 'move',
                            clipId: clip.id,
                            startClientX: e.clientX,
                            initialStartTime: clip.startTime,
                            initialDuration: clip.duration,
                            initialTrimStart: clip.trimStart,
                            initialTrimEnd: clip.trimEnd,
                            currentDeltaSec: 0
                          });
                        }}
                        className={`absolute top-1 bottom-1 rounded-xl flex items-center justify-between text-xs select-none transition-shadow ${
                          isSelected
                            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-black z-20 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                            : 'hover:brightness-110 z-10 opacity-95'
                        } ${
                          clip.type === 'video'
                            ? 'bg-gradient-to-r from-purple-900/90 via-purple-950/80 to-purple-900/90 border border-purple-500/60 text-purple-100'
                            : clip.type === 'text'
                            ? 'bg-gradient-to-r from-cyan-900/90 via-cyan-950/80 to-cyan-900/90 border border-cyan-500/60 text-cyan-100'
                            : clip.type === 'audio'
                            ? 'bg-gradient-to-r from-emerald-900/90 via-emerald-950/80 to-emerald-900/90 border border-emerald-500/60 text-emerald-100'
                            : 'bg-gradient-to-r from-indigo-900/90 via-indigo-950/80 to-indigo-900/90 border border-indigo-500/60 text-indigo-100'
                        } ${isBeingDragged ? 'cursor-grabbing opacity-90' : 'cursor-grab'}`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                          touchAction: 'none'
                        }}
                      >
                        {/* Left Trim Handle (Visible when selected) */}
                        {isSelected && !track.isLocked && (
                          <div
                            data-handle="left"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                mode: 'trim-left',
                                clipId: clip.id,
                                startClientX: e.clientX,
                                initialStartTime: clip.startTime,
                                initialDuration: clip.duration,
                                initialTrimStart: clip.trimStart,
                                initialTrimEnd: clip.trimEnd,
                                currentDeltaSec: 0
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-4 bg-purple-400 hover:bg-white text-black rounded-l-xl flex items-center justify-center cursor-ew-resize z-30 touch-none shadow-sm"
                            title="Drag to trim start"
                          >
                            <div className="w-1 h-3 bg-purple-950 rounded-full" />
                          </div>
                        )}

                        {/* Clip Content & Waveform / Thumbnail Graphic */}
                        <div className="flex-1 h-full px-3 flex items-center justify-between overflow-hidden pointer-events-none">
                          <div className="flex items-center gap-1.5 truncate">
                            {clip.chromaKey?.enabled && (
                              <span
                                className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#10b981]"
                                title="Chroma Key Enabled"
                              />
                            )}

                            {clip.type === 'audio' ? (
                              /* Simulated Audio Waveform Peaks */
                              <div className="flex items-center gap-0.5 opacity-60">
                                {[4, 8, 14, 6, 12, 16, 9, 5, 11, 15, 7, 10, 14, 8, 4].map((h, i) => (
                                  <div
                                    key={i}
                                    className="w-1 bg-emerald-300 rounded-full"
                                    style={{ height: `${h}px` }}
                                  />
                                ))}
                              </div>
                            ) : null}

                            <span className="truncate font-semibold text-[11px] tracking-tight">{clip.name}</span>
                          </div>

                          <div className="font-mono text-[9px] opacity-75 ml-1 shrink-0 bg-black/40 px-1 py-0.5 rounded">
                            {effectiveDuration.toFixed(1)}s
                          </div>
                        </div>

                        {/* Right Trim Handle (Visible when selected) */}
                        {isSelected && !track.isLocked && (
                          <div
                            data-handle="right"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                mode: 'trim-right',
                                clipId: clip.id,
                                startClientX: e.clientX,
                                initialStartTime: clip.startTime,
                                initialDuration: clip.duration,
                                initialTrimStart: clip.trimStart,
                                initialTrimEnd: clip.trimEnd,
                                currentDeltaSec: 0
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-4 bg-purple-400 hover:bg-white text-black rounded-r-xl flex items-center justify-center cursor-ew-resize z-30 touch-none shadow-sm"
                            title="Drag to trim duration"
                          >
                            <div className="w-1 h-3 bg-purple-950 rounded-full" />
                          </div>
                        )}

                        {/* Dragging Tooltip Feedback */}
                        {isBeingDragged && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-purple-900 border border-purple-400 text-white font-mono text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-40">
                            {dragState.mode === 'move'
                              ? `Start: ${effectiveStart.toFixed(2)}s`
                              : `Duration: ${effectiveDuration.toFixed(2)}s`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
