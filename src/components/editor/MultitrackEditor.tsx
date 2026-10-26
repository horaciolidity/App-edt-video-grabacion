import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Copy,
  Trash2,
  Sliders,
  Type,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  Move,
  Film,
  RotateCw,
  Plus,
  Undo2,
  Redo2,
  Pipette
} from 'lucide-react';
import { Project, MediaClip, Track, ChromaKeySettings } from '../../types';
import { ARTIST_FILTERS, STUDIO_BACKGROUNDS, CHROMA_COLOR_PRESETS } from '../../constants/presets';

interface MultitrackEditorProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenExport: () => void;
}

export const MultitrackEditor: React.FC<MultitrackEditorProps> = ({
  project,
  onUpdateProject,
  onOpenExport
}) => {
  // Timeline Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(40); // pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(project.clips[0]?.id || null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'chroma' | 'transform' | 'filters' | 'audio' | 'text' | 'speed'>('chroma');

  // History stack for Undo / Redo
  const [history, setHistory] = useState<Project[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Dragging & Trimming State
  const [isDraggingClip, setIsDraggingClip] = useState<boolean>(false);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragInitialTime, setDragInitialTime] = useState<number>(0);

  // Playback timer ref
  const playheadIntervalRef = useRef<number | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedClip = project.clips.find(c => c.id === selectedClipId) || null;

  const pushHistory = useCallback((newProject: Project) => {
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newProject);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    onUpdateProject(newProject);
  }, [history, historyIndex, onUpdateProject]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onUpdateProject(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onUpdateProject(history[historyIndex + 1]);
    }
  };

  // Playhead Tick Loop
  useEffect(() => {
    if (isPlaying) {
      const stepMs = 50;
      playheadIntervalRef.current = window.setInterval(() => {
        setCurrentTime(t => {
          const next = t + stepMs / 1000;
          if (next >= project.duration) {
            return 0; // loop
          }
          return next;
        });
      }, stepMs);
    } else {
      if (playheadIntervalRef.current) {
        clearInterval(playheadIntervalRef.current);
        playheadIntervalRef.current = null;
      }
    }
    return () => {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, [isPlaying, project.duration]);

  // Video Preview Composition Renderer on Canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, w, h);

    // Render active clips at currentTime
    const sortedClips = [...project.clips].sort((a, b) => {
      const trA = project.tracks.find(t => t.id === a.trackId);
      const trB = project.tracks.find(t => t.id === b.trackId);
      const orderA = trA?.type === 'overlay' ? 2 : trA?.type === 'video' ? 1 : 0;
      const orderB = trB?.type === 'overlay' ? 2 : trB?.type === 'video' ? 1 : 0;
      return orderA - orderB;
    });

    for (const clip of sortedClips) {
      if (currentTime < clip.startTime || currentTime > clip.startTime + clip.duration) {
        continue;
      }
      const track = project.tracks.find(t => t.id === clip.trackId);
      if (track?.isMuted) continue;

      ctx.save();
      ctx.globalAlpha = clip.transform?.opacity ?? 1;

      const centerX = w / 2 + (clip.transform?.x ?? 0) * (w / 200);
      const centerY = h / 2 + (clip.transform?.y ?? 0) * (h / 200);
      ctx.translate(centerX, centerY);

      if (clip.transform?.rotation) {
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
      }
      const scale = clip.transform?.scale ?? 1;
      ctx.scale(scale, scale);

      if (clip.type === 'text' && clip.textContent) {
        ctx.font = `bold ${clip.textStyle?.fontSize || 32}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
        ctx.shadowBlur = 12;
        if (clip.textStyle?.strokeColor) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = clip.textStyle.strokeColor;
          ctx.strokeText(clip.textContent, 0, 0);
        }
        ctx.fillStyle = clip.textStyle?.color || '#ffffff';
        ctx.fillText(clip.textContent, 0, 0);
      } else if (clip.type === 'image' || clip.type === 'video') {
        if (clip.src) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
          } else {
            // Placeholder while loading
            ctx.fillStyle = clip.type === 'video' ? '#312e81' : '#1e1b4b';
            ctx.fillRect(-w / 2, -h / 2, w, h);
          }
        }
      }

      ctx.restore();
    }
  }, [currentTime, project.clips, project.tracks]);

  // Split Clip at Playhead
  const handleSplitClip = () => {
    if (!selectedClip) return;
    if (currentTime <= selectedClip.startTime || currentTime >= selectedClip.startTime + selectedClip.duration) {
      alert('Move the playhead inside the selected clip to split it.');
      return;
    }

    const firstDuration = currentTime - selectedClip.startTime;
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
      name: selectedClip.name + ' (Split)'
    };

    const updatedClips = project.clips.map(c => (c.id === selectedClip.id ? clip1 : c));
    updatedClips.push(clip2);

    pushHistory({
      ...project,
      clips: updatedClips
    });
    setSelectedClipId(clip2.id);
  };

  // Duplicate Clip
  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    const duplicated: MediaClip = {
      ...selectedClip,
      id: 'clip_' + Date.now(),
      name: selectedClip.name + ' Copy',
      startTime: selectedClip.startTime + selectedClip.duration + 0.5
    };
    const updatedClips = [...project.clips, duplicated];
    pushHistory({
      ...project,
      clips: updatedClips,
      duration: Math.max(project.duration, duplicated.startTime + duplicated.duration)
    });
    setSelectedClipId(duplicated.id);
  };

  // Delete Clip
  const handleDeleteClip = () => {
    if (!selectedClip) return;
    const updatedClips = project.clips.filter(c => c.id !== selectedClip.id);
    pushHistory({
      ...project,
      clips: updatedClips
    });
    setSelectedClipId(updatedClips[0]?.id || null);
  };

  // Add Title Overlay Clip
  const handleAddTitleClip = () => {
    const titleClip: MediaClip = {
      id: 'clip_title_' + Date.now(),
      trackId: 'tr_titles',
      name: 'Custom Title FX',
      type: 'text',
      src: '',
      textContent: 'DROP THE BASS ⚡',
      textStyle: {
        fontSize: 36,
        color: '#38bdf8',
        strokeColor: '#0f172a',
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
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      filterIntensity: 0
    };

    pushHistory({
      ...project,
      clips: [...project.clips, titleClip]
    });
    setSelectedClipId(titleClip.id);
    setActiveInspectorTab('text');
  };

  // Update selected clip properties
  const updateSelectedClip = (patch: Partial<MediaClip>) => {
    if (!selectedClip) return;
    const updatedClips = project.clips.map(c => {
      if (c.id === selectedClip.id) {
        return { ...c, ...patch };
      }
      return c;
    });
    pushHistory({
      ...project,
      clips: updatedClips
    });
  };

  // Toggle track mute / lock
  const toggleTrackMute = (trackId: string) => {
    const updatedTracks = project.tracks.map(t => {
      if (t.id === trackId) return { ...t, isMuted: !t.isMuted };
      return t;
    });
    pushHistory({ ...project, tracks: updatedTracks });
  };

  const toggleTrackLock = (trackId: string) => {
    const updatedTracks = project.tracks.map(t => {
      if (t.id === trackId) return { ...t, isLocked: !t.isLocked };
      return t;
    });
    pushHistory({ ...project, tracks: updatedTracks });
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col bg-[#07090e] select-none overflow-hidden pb-safe">
      {/* Top Half: Video Monitor Preview (Left) + Contextual Inspector (Right) */}
      <div className="h-[46%] min-h-[260px] flex flex-col md:flex-row border-b border-slate-800/80">
        {/* Left Monitor Preview */}
        <div className="w-full md:w-1/2 lg:w-3/5 bg-black flex flex-col items-center justify-between p-3 relative">
          {/* Monitor Canvas */}
          <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={720}
              height={1280}
              className="max-h-full max-w-full aspect-[9/16] object-contain rounded-xl shadow-2xl border border-slate-800/80"
            />
          </div>

          {/* Monitor Scrub Toolbar */}
          <div className="w-full flex items-center justify-between pt-2 px-2 text-xs">
            {/* Playhead Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTime(0)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="Rewind to Start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>

            {/* Timecode Readout */}
            <div className="font-mono text-xs text-purple-300 bg-slate-900/90 px-3 py-1 rounded-md border border-slate-800">
              {formatTimecode(currentTime)} / {formatTimecode(project.duration)}
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 cursor-pointer"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Contextual Clip Inspector Tabs */}
        <div className="w-full md:w-1/2 lg:w-2/5 bg-[#0b0d14] border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Inspector Header Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/80 border-b border-slate-800 overflow-x-auto">
            {[
              { id: 'chroma', label: 'Chroma Key', icon: Layers },
              { id: 'transform', label: 'Transform', icon: Move },
              { id: 'filters', label: 'Filters', icon: Sparkles },
              { id: 'speed', label: 'Speed', icon: Film },
              { id: 'audio', label: 'Audio', icon: Volume2 },
              { id: 'text', label: 'Text FX', icon: Type },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeInspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInspectorTab(tab.id as typeof activeInspectorTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspector Content Body */}
          <div className="flex-1 p-4 overflow-y-auto text-xs space-y-4">
            {!selectedClip ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Layers className="w-8 h-8 text-slate-700 mb-2" />
                <p>Select any clip on the timeline to edit properties</p>
              </div>
            ) : (
              <>
                {/* 1. Chroma Key Inspector */}
                {activeInspectorTab === 'chroma' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <h4 className="font-bold text-white text-sm">Clip Chroma Key</h4>
                        <span className="text-[11px] text-slate-400">Green/Color Screen Removal</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClip.chromaKey?.enabled ?? false}
                          onChange={(e) => {
                            const prev = selectedClip.chromaKey || {
                              enabled: false,
                              keyColor: '#00ff00',
                              tolerance: 0.35,
                              softness: 0.15,
                              spillReduction: 0.6,
                              backgroundType: 'preset',
                              backgroundSrc: STUDIO_BACKGROUNDS[0].src,
                              backgroundName: 'Stage'
                            };
                            updateSelectedClip({
                              chromaKey: { ...prev, enabled: e.target.checked }
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {selectedClip.chromaKey?.enabled && (
                      <>
                        <div>
                          <label className="text-slate-400 block mb-1.5 font-medium">Screen Color</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {CHROMA_COLOR_PRESETS.map(c => (
                              <button
                                key={c.hex}
                                onClick={() => {
                                  updateSelectedClip({
                                    chromaKey: { ...selectedClip.chromaKey!, keyColor: c.hex }
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                                  selectedClip.chromaKey?.keyColor.toLowerCase() === c.hex.toLowerCase()
                                    ? 'border-purple-400 bg-purple-950/60 text-white'
                                    : 'border-slate-800 bg-slate-900 text-slate-300'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                                <span>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Color Tolerance</span>
                            <span className="font-mono text-purple-300">
                              {Math.round((selectedClip.chromaKey?.tolerance ?? 0.35) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.8"
                            step="0.02"
                            value={selectedClip.chromaKey?.tolerance ?? 0.35}
                            onChange={(e) => {
                              updateSelectedClip({
                                chromaKey: { ...selectedClip.chromaKey!, tolerance: parseFloat(e.target.value) }
                              });
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Edge Softness</span>
                            <span className="font-mono text-purple-300">
                              {Math.round((selectedClip.chromaKey?.softness ?? 0.15) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="0.4"
                            step="0.01"
                            value={selectedClip.chromaKey?.softness ?? 0.15}
                            onChange={(e) => {
                              updateSelectedClip({
                                chromaKey: { ...selectedClip.chromaKey!, softness: parseFloat(e.target.value) }
                              });
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Spill Suppression</span>
                            <span className="font-mono text-purple-300">
                              {Math.round((selectedClip.chromaKey?.spillReduction ?? 0.6) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.05"
                            value={selectedClip.chromaKey?.spillReduction ?? 0.6}
                            onChange={(e) => {
                              updateSelectedClip({
                                chromaKey: { ...selectedClip.chromaKey!, spillReduction: parseFloat(e.target.value) }
                              });
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2. Transform Inspector */}
                {activeInspectorTab === 'transform' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
                      Layer Transform & Placement
                    </h4>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Scale Zoom</span>
                        <span className="font-mono text-purple-300">
                          {((selectedClip.transform?.scale ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.5"
                        step="0.05"
                        value={selectedClip.transform?.scale ?? 1}
                        onChange={(e) => {
                          updateSelectedClip({
                            transform: { ...selectedClip.transform, scale: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Position X</span>
                          <span className="font-mono">{selectedClip.transform?.x ?? 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          step="2"
                          value={selectedClip.transform?.x ?? 0}
                          onChange={(e) => {
                            updateSelectedClip({
                              transform: { ...selectedClip.transform, x: parseFloat(e.target.value) }
                            });
                          }}
                          className="w-full accent-purple-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Position Y</span>
                          <span className="font-mono">{selectedClip.transform?.y ?? 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          step="2"
                          value={selectedClip.transform?.y ?? 0}
                          onChange={(e) => {
                            updateSelectedClip({
                              transform: { ...selectedClip.transform, y: parseFloat(e.target.value) }
                            });
                          }}
                          className="w-full accent-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Rotation</span>
                        <span className="font-mono text-purple-300">{selectedClip.transform?.rotation ?? 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={selectedClip.transform?.rotation ?? 0}
                        onChange={(e) => {
                          updateSelectedClip({
                            transform: { ...selectedClip.transform, rotation: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Opacity</span>
                        <span className="font-mono text-purple-300">
                          {Math.round((selectedClip.transform?.opacity ?? 1) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedClip.transform?.opacity ?? 1}
                        onChange={(e) => {
                          updateSelectedClip({
                            transform: { ...selectedClip.transform, opacity: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Filters Inspector */}
                {activeInspectorTab === 'filters' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
                      Artist Video Filters
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {ARTIST_FILTERS.map(f => {
                        const isSelected = (selectedClip.filterId || 'normal') === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => updateSelectedClip({ filterId: f.id })}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-purple-400 bg-purple-950/50 text-white'
                                : 'border-slate-800 bg-slate-900/60 text-slate-300'
                            }`}
                          >
                            <div className="font-bold truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{f.category}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Speed & Motion Inspector */}
                {activeInspectorTab === 'speed' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
                      Clip Playback Speed
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[0.5, 1.0, 1.5, 2.0].map(spd => (
                        <button
                          key={spd}
                          onClick={() => updateSelectedClip({ speed: spd })}
                          className={`py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                            selectedClip.speed === spd
                              ? 'border-purple-400 bg-purple-950 text-white'
                              : 'border-slate-800 bg-slate-900 text-slate-300'
                          }`}
                        >
                          {spd}x {spd === 0.5 ? '(Slo-mo)' : spd === 2 ? '(Fast)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Audio Inspector */}
                {activeInspectorTab === 'audio' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
                      Clip Audio Volume
                    </h4>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Volume Gain</span>
                        <span className="font-mono text-purple-300">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={selectedClip.volume ?? 1}
                        onChange={(e) => updateSelectedClip({ volume: parseFloat(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* 6. Text Inspector */}
                {activeInspectorTab === 'text' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
                      Title & Lyrics Text
                    </h4>
                    <div>
                      <label className="text-slate-400 block mb-1">Text Content</label>
                      <input
                        type="text"
                        value={selectedClip.textContent || ''}
                        onChange={(e) => updateSelectedClip({ textContent: e.target.value })}
                        placeholder="Title or Lyric line..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Font Size</span>
                        <span className="font-mono">{selectedClip.textStyle?.fontSize || 32}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="72"
                        step="2"
                        value={selectedClip.textStyle?.fontSize || 32}
                        onChange={(e) => {
                          updateSelectedClip({
                            textStyle: { ...selectedClip.textStyle!, fontSize: parseInt(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Half: Multitrack Timeline & Ruler */}
      <div className="flex-1 flex flex-col bg-[#07090e] overflow-hidden">
        {/* Timeline Action Header Bar */}
        <div className="h-10 bg-slate-950 border-b border-slate-800/80 px-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSplitClip}
              disabled={!selectedClip}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Split Cut</span>
            </button>

            <button
              onClick={handleDuplicateClip}
              disabled={!selectedClip}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-purple-400" />
              <span>Duplicate</span>
            </button>

            <button
              onClick={handleDeleteClip}
              disabled={!selectedClip}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950 disabled:opacity-40 text-slate-200 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete</span>
            </button>

            <button
              onClick={handleAddTitleClip}
              className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-600/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Title Card</span>
            </button>
          </div>

          {/* Timeline Zoom Slider */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="20"
              max="100"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseInt(e.target.value))}
              className="w-20 accent-purple-500"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Multitrack Workspace Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Fixed Track Headers */}
          <div className="w-48 bg-[#0b0d14] border-r border-slate-800 flex flex-col shrink-0">
            {/* Top Ruler Spacer */}
            <div className="h-7 border-b border-slate-800 bg-slate-950 flex items-center px-3 text-[10px] text-slate-500 font-mono">
              TRACKS
            </div>

            {/* Track Info Headers */}
            <div className="flex-1 overflow-y-hidden">
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  className="h-16 px-3 border-b border-slate-800/80 flex items-center justify-between text-xs group"
                >
                  <div className="truncate pr-1">
                    <div className="font-semibold text-slate-200 text-[11px] truncate">{track.name}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-mono">{track.type}</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackMute(track.id)}
                      className={`p-1 rounded hover:bg-slate-800 cursor-pointer ${track.isMuted ? 'text-red-400' : 'text-slate-400'}`}
                      title={track.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleTrackLock(track.id)}
                      className={`p-1 rounded hover:bg-slate-800 cursor-pointer ${track.isLocked ? 'text-amber-400' : 'text-slate-500'}`}
                      title={track.isLocked ? 'Unlock' : 'Lock'}
                    >
                      {track.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Scrollable Timeline Tracks & Ruler */}
          <div
            ref={timelineContainerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#07090e]"
            onClick={(e) => {
              // Click ruler or empty timeline space to seek playhead
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const newTime = Math.max(0, Math.min(project.duration, clickX / timelineZoom));
              setCurrentTime(newTime);
            }}
          >
            {/* Timeline Ruler */}
            <div
              className="h-7 border-b border-slate-800 bg-slate-950 flex items-center relative font-mono text-[10px] text-slate-400 select-none"
              style={{ width: `${project.duration * timelineZoom + 200}px` }}
            >
              {Array.from({ length: Math.ceil(project.duration) + 1 }).map((_, sec) => (
                <div
                  key={sec}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${sec * timelineZoom}px` }}
                >
                  <div className="h-2 w-[1px] bg-slate-700" />
                  <span className="text-[9px] mt-0.5">{sec}s</span>
                </div>
              ))}
            </div>

            {/* Red Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none shadow-[0_0_8px_#ef4444]"
              style={{ left: `${currentTime * timelineZoom}px` }}
            >
              <div className="w-3 h-3 bg-red-500 -ml-[5px] rotate-45" />
            </div>

            {/* Tracks Canvas Area */}
            <div
              className="relative"
              style={{ width: `${project.duration * timelineZoom + 200}px` }}
            >
              {project.tracks.map((track) => {
                const trackClips = project.clips.filter(c => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    className="h-16 border-b border-slate-800/80 relative bg-slate-950/30"
                  >
                    {trackClips.map((clip) => {
                      const isSelected = clip.id === selectedClipId;
                      const leftPx = clip.startTime * timelineZoom;
                      const widthPx = Math.max(20, clip.duration * timelineZoom);

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                          }}
                          className={`absolute top-1.5 bottom-1.5 rounded-lg px-2 flex items-center justify-between text-xs cursor-pointer shadow-md transition-shadow select-none ${
                            isSelected
                              ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-black z-20'
                              : 'hover:brightness-110 z-10'
                          } ${
                            clip.type === 'video'
                              ? 'bg-purple-900/80 border border-purple-500/60 text-purple-100'
                              : clip.type === 'text'
                              ? 'bg-cyan-900/80 border border-cyan-500/60 text-cyan-100'
                              : clip.type === 'audio'
                              ? 'bg-emerald-900/80 border border-emerald-500/60 text-emerald-100'
                              : 'bg-indigo-900/80 border border-indigo-500/60 text-indigo-100'
                          }`}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`
                          }}
                        >
                          <div className="truncate font-semibold text-[11px] flex items-center gap-1.5">
                            {clip.chromaKey?.enabled && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" title="Chroma Key Active" />
                            )}
                            <span className="truncate">{clip.name}</span>
                          </div>

                          <span className="text-[9px] font-mono opacity-70 ml-1 shrink-0">
                            {clip.duration.toFixed(1)}s
                          </span>
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
    </div>
  );
};
