import React, { useState } from 'react';
import {
  Scissors,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Film,
  Move,
  Type,
  Copy,
  Trash2,
  X,
  Pipette,
  Sliders,
  RotateCcw,
  Check,
  Music,
  Image as ImageIcon,
  Clock,
  Maximize2,
  Palette
} from 'lucide-react';
import { MediaClip, Project, ChromaKeySettings, AspectRatio } from '../../types';
import {
  CHROMA_COLOR_PRESETS,
  STUDIO_BACKGROUNDS,
  ARTIST_FILTERS,
  PRESET_BEATS
} from '../../constants/presets';

interface ContextualToolbarProps {
  project: Project;
  selectedClip: MediaClip | null;
  onUpdateClip: (clipId: string, patch: Partial<MediaClip>) => void;
  onSplitClip: () => void;
  onDuplicateClip: () => void;
  onDeleteClip: () => void;
  onDeselectClip: () => void;
  onAddTitleClip: () => void;
  onAddMediaClip: (src: string, name: string, type: 'image' | 'video') => void;
  onChangeBackingBeat: (beatId: string) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onChangeProjectDuration: (duration: number) => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
}

type ActiveSheet =
  | 'chroma'
  | 'filters'
  | 'transform'
  | 'speed'
  | 'audio'
  | 'text'
  | 'duration'
  | 'project-beats'
  | 'project-stage'
  | 'project-ratio'
  | null;

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({
  project,
  selectedClip,
  onUpdateClip,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onDeselectClip,
  onAddTitleClip,
  onAddMediaClip,
  onChangeBackingBeat,
  onChangeAspectRatio,
  onChangeProjectDuration,
  isEyedropperActive = false,
  onToggleEyedropper
}) => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  // Quick helper to patch selected clip
  const patchClip = (patch: Partial<MediaClip>) => {
    if (!selectedClip) return;
    onUpdateClip(selectedClip.id, patch);
  };

  // Close sheet on deselect
  const handleCloseSheet = () => {
    setActiveSheet(null);
  };

  return (
    <div className="bg-[#0a0d14] border-t border-slate-800/90 flex flex-col shrink-0 z-30 select-none pb-safe">
      {/* 1. Contextual Secondary Drawer Sheet (When Open) */}
      {activeSheet && (
        <div className="bg-[#0b0e17] border-b border-slate-800 p-3 sm:p-4 max-h-[38vh] overflow-y-auto animate-fade-in text-xs">
          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                {activeSheet === 'chroma' && 'Chroma Key & Green Screen Removal'}
                {activeSheet === 'filters' && 'Artist Visual Filter Effects'}
                {activeSheet === 'transform' && 'Layer Transform & Framing'}
                {activeSheet === 'speed' && 'Playback Speed & Motion'}
                {activeSheet === 'audio' && 'Audio Gain & Volume'}
                {activeSheet === 'text' && 'Overlay Typography & Lyrics'}
                {activeSheet === 'duration' && 'Clip Duration'}
                {activeSheet === 'project-beats' && 'Backing Instrumental Beats'}
                {activeSheet === 'project-stage' && 'Stage Backdrop Scenes'}
                {activeSheet === 'project-ratio' && 'Project Aspect Ratio'}
              </span>
            </div>

            <button
              onClick={handleCloseSheet}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sheet Body: CHROMA KEY */}
          {activeSheet === 'chroma' && selectedClip && (
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Enable Chroma Key</div>
                  <div className="text-[11px] text-slate-400">
                    Removes screen color to reveal background stage underneath
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClip.chromaKey?.enabled ?? false}
                    onChange={(e) => {
                      const prev: ChromaKeySettings = selectedClip.chromaKey || {
                        enabled: false,
                        keyColor: '#00ff00',
                        tolerance: 0.35,
                        softness: 0.15,
                        spillReduction: 0.65,
                        backgroundType: 'preset',
                        backgroundSrc: STUDIO_BACKGROUNDS[0].src,
                        backgroundName: STUDIO_BACKGROUNDS[0].name
                      };
                      patchClip({
                        chromaKey: { ...prev, enabled: e.target.checked }
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {selectedClip.chromaKey?.enabled && (
                <>
                  {/* Screen Color Presets & Eyedropper */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 font-semibold text-[11px]">Key Screen Color</span>
                      {onToggleEyedropper && (
                        <button
                          onClick={onToggleEyedropper}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors cursor-pointer ${
                            isEyedropperActive
                              ? 'bg-purple-600 border-purple-400 text-white animate-pulse'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Pipette className="w-3 h-3" />
                          <span>{isEyedropperActive ? 'Click video now' : 'Pick from Video'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CHROMA_COLOR_PRESETS.map((preset) => {
                        const isMatch =
                          (selectedClip.chromaKey?.keyColor || '#00ff00').toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.hex}
                            onClick={() => {
                              patchClip({
                                chromaKey: { ...selectedClip.chromaKey!, keyColor: preset.hex }
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                              isMatch
                                ? 'border-purple-400 bg-purple-950/70 text-white font-bold ring-1 ring-purple-400'
                                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/40"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span>{preset.name}</span>
                          </button>
                        );
                      })}

                      {/* Custom Hex Color Input */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <input
                          type="color"
                          value={selectedClip.chromaKey?.keyColor || '#00ff00'}
                          onChange={(e) => {
                            patchClip({
                              chromaKey: { ...selectedClip.chromaKey!, keyColor: e.target.value }
                            });
                          }}
                          className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                          title="Custom Color Picker"
                        />
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          {selectedClip.chromaKey?.keyColor || '#00ff00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sliders: Tolerance, Softness, Spill */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Tolerance */}
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Tolerance</span>
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
                          patchClip({
                            chromaKey: { ...selectedClip.chromaKey!, tolerance: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    {/* Edge Softness */}
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Edge Softness</span>
                        <span className="font-mono text-purple-300">
                          {Math.round((selectedClip.chromaKey?.softness ?? 0.15) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.4"
                        step="0.01"
                        value={selectedClip.chromaKey?.softness ?? 0.15}
                        onChange={(e) => {
                          patchClip({
                            chromaKey: { ...selectedClip.chromaKey!, softness: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    {/* Spill Suppression */}
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Spill Removal</span>
                        <span className="font-mono text-purple-300">
                          {Math.round((selectedClip.chromaKey?.spillReduction ?? 0.65) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={selectedClip.chromaKey?.spillReduction ?? 0.65}
                        onChange={(e) => {
                          patchClip({
                            chromaKey: { ...selectedClip.chromaKey!, spillReduction: parseFloat(e.target.value) }
                          });
                        }}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Backdrop Selector for Chroma Key */}
                  <div>
                    <span className="text-slate-300 font-semibold text-[11px] block mb-2">
                      Background Stage Layer
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STUDIO_BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => {
                            // Update chroma key background and background clip if present
                            patchClip({
                              chromaKey: {
                                ...selectedClip.chromaKey!,
                                backgroundSrc: bg.src,
                                backgroundName: bg.name
                              }
                            });
                            // Also update background track clip if exists
                            const bgClip = project.clips.find(c => c.trackId === 'tr_bg');
                            if (bgClip) {
                              onUpdateClip(bgClip.id, { src: bg.src, name: bg.name });
                            }
                          }}
                          className={`relative rounded-xl overflow-hidden border text-left p-1.5 transition-all cursor-pointer ${
                            selectedClip.chromaKey?.backgroundSrc === bg.src
                              ? 'border-purple-400 ring-2 ring-purple-500/50 shadow-md'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={bg.src}
                            alt={bg.name}
                            className="w-full h-12 object-cover rounded-lg mb-1"
                            referrerPolicy="no-referrer"
                          />
                          <div className="font-semibold text-slate-200 truncate text-[11px]">{bg.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono truncate">{bg.genre}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sheet Body: FILTERS */}
          {activeSheet === 'filters' && selectedClip && (
            <div className="space-y-3 max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-[11px]">Select Color Grade Preset</span>
                {selectedClip.filterId && selectedClip.filterId !== 'normal' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Intensity</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={selectedClip.filterIntensity ?? 0.7}
                      onChange={(e) => patchClip({ filterIntensity: parseFloat(e.target.value) })}
                      className="w-24 accent-purple-500"
                    />
                    <span className="font-mono text-purple-300 text-[10px]">
                      {Math.round((selectedClip.filterIntensity ?? 0.7) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ARTIST_FILTERS.map((f) => {
                  const isSelected = (selectedClip.filterId || 'normal') === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => patchClip({ filterId: f.id })}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-400 bg-purple-950/60 text-white ring-1 ring-purple-400'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs truncate">{f.name}</span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.accentColor }} />
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{f.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sheet Body: TRANSFORM */}
          {activeSheet === 'transform' && selectedClip && (
            <div className="space-y-3 max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-semibold text-[11px]">Layer Positioning & Scale</span>
                <button
                  onClick={() => {
                    patchClip({
                      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] flex items-center gap-1 border border-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Transform</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Scale */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Scale Zoom</span>
                    <span className="font-mono text-purple-300">
                      {Math.round((selectedClip.transform?.scale ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={selectedClip.transform?.scale ?? 1}
                    onChange={(e) => {
                      patchClip({
                        transform: { ...selectedClip.transform, scale: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Opacity */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1">
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
                      patchClip({
                        transform: { ...selectedClip.transform, opacity: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Position X */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Position X</span>
                    <span className="font-mono text-purple-300">{selectedClip.transform?.x ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={selectedClip.transform?.x ?? 0}
                    onChange={(e) => {
                      patchClip({
                        transform: { ...selectedClip.transform, x: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Position Y */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Position Y</span>
                    <span className="font-mono text-purple-300">{selectedClip.transform?.y ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={selectedClip.transform?.y ?? 0}
                    onChange={(e) => {
                      patchClip({
                        transform: { ...selectedClip.transform, y: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Rotation */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-2">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Rotation Angle</span>
                    <span className="font-mono text-purple-300">{selectedClip.transform?.rotation ?? 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={selectedClip.transform?.rotation ?? 0}
                    onChange={(e) => {
                      patchClip({
                        transform: { ...selectedClip.transform, rotation: parseFloat(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sheet Body: SPEED */}
          {activeSheet === 'speed' && selectedClip && (
            <div className="space-y-3 max-w-md mx-auto">
              <span className="text-slate-300 font-semibold text-[11px] block">Playback Speed</span>
              <div className="grid grid-cols-3 gap-2">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => patchClip({ speed: spd })}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                      selectedClip.speed === spd
                        ? 'border-purple-400 bg-purple-950 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {spd}x {spd === 0.5 ? '(Slo-Mo)' : spd === 2 ? '(Fast)' : spd === 1 ? '(Normal)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sheet Body: AUDIO */}
          {activeSheet === 'audio' && selectedClip && (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold text-[11px]">Clip Volume Gain</span>
                <button
                  onClick={() => patchClip({ isMuted: !selectedClip.isMuted })}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer ${
                    selectedClip.isMuted ? 'bg-red-950 text-red-300' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {selectedClip.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{selectedClip.isMuted ? 'Muted' : 'Audible'}</span>
                </button>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Gain Multiplier</span>
                  <span className="font-mono text-purple-300">
                    {Math.round((selectedClip.volume ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={selectedClip.volume ?? 1}
                  onChange={(e) => patchClip({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sheet Body: TEXT FX */}
          {activeSheet === 'text' && selectedClip && (
            <div className="space-y-3 max-w-lg mx-auto">
              <div>
                <label className="text-slate-300 font-semibold text-[11px] block mb-1">Text / Lyric Line</label>
                <input
                  type="text"
                  value={selectedClip.textContent || ''}
                  onChange={(e) => patchClip({ textContent: e.target.value })}
                  placeholder="Enter video title or lyrics..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Quick Preset Ideas */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['DROP THE BASS ⚡', 'FEEL THE VIBE ✨', 'NEON NIGHTS 🌙', 'ANTHEM 2026 🔥', 'CHASING STARS 💫'].map((t) => (
                  <button
                    key={t}
                    onClick={() => patchClip({ textContent: t })}
                    className="px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Font Size & Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Font Size</span>
                    <span className="font-mono text-purple-300">{selectedClip.textStyle?.fontSize || 36}px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="72"
                    step="2"
                    value={selectedClip.textStyle?.fontSize || 36}
                    onChange={(e) => {
                      patchClip({
                        textStyle: { ...selectedClip.textStyle!, fontSize: parseInt(e.target.value) }
                      });
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Color Palette</span>
                  <div className="flex items-center gap-2">
                    {['#ffffff', '#38bdf8', '#f472b6', '#facc15', '#a855f7', '#4ade80'].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          patchClip({
                            textStyle: { ...selectedClip.textStyle!, color }
                          });
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          selectedClip.textStyle?.color === color ? 'border-white scale-110 shadow' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sheet Body: PROJECT BEATS */}
          {activeSheet === 'project-beats' && (
            <div className="space-y-3 max-w-xl mx-auto">
              <span className="text-slate-300 font-semibold text-[11px] block">Backing Instrumental Beat</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_BEATS.map((beat) => {
                  const isCurrent = project.backingBeat?.id === beat.id;
                  return (
                    <button
                      key={beat.id}
                      onClick={() => onChangeBackingBeat(beat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-colors ${
                        isCurrent
                          ? 'border-purple-400 bg-purple-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs truncate">{beat.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {beat.bpm} BPM · {beat.key} · {beat.genre}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sheet Body: PROJECT STAGE BACKDROPS */}
          {activeSheet === 'project-stage' && (
            <div className="space-y-3 max-w-xl mx-auto">
              <span className="text-slate-300 font-semibold text-[11px] block">
                Add or Change Stage Backdrop
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STUDIO_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      onAddMediaClip(bg.src, bg.name, 'image');
                      handleCloseSheet();
                    }}
                    className="relative rounded-xl overflow-hidden border border-slate-800 hover:border-purple-400 text-left p-1.5 transition-all cursor-pointer group"
                  >
                    <img
                      src={bg.src}
                      alt={bg.name}
                      className="w-full h-16 object-cover rounded-lg mb-1 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="font-semibold text-slate-200 truncate text-[11px]">{bg.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono truncate">{bg.genre}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CapCut Mobile Bottom Action Bar */}
      <div className="h-14 px-3 flex items-center justify-between gap-2 overflow-x-auto">
        {selectedClip ? (
          /* Contextual Tools for Selected Clip */
          <div className="flex items-center gap-2 overflow-x-auto w-full py-1">
            {/* Split */}
            <button
              onClick={onSplitClip}
              className="flex flex-col items-center justify-center min-w-[50px] py-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-cyan-400 mb-0.5" />
              <span className="text-[10px] font-medium whitespace-nowrap">Split</span>
            </button>

            {/* Video-Specific Tools */}
            {selectedClip.type === 'video' && (
              <>
                <button
                  onClick={() => setActiveSheet(activeSheet === 'chroma' ? null : 'chroma')}
                  className={`flex flex-col items-center justify-center min-w-[54px] py-1 rounded-lg transition-colors cursor-pointer ${
                    activeSheet === 'chroma'
                      ? 'text-purple-300 bg-purple-950/60 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-400 mb-0.5" />
                  <span className="text-[10px] font-medium whitespace-nowrap">Chroma</span>
                </button>

                <button
                  onClick={() => setActiveSheet(activeSheet === 'filters' ? null : 'filters')}
                  className={`flex flex-col items-center justify-center min-w-[50px] py-1 rounded-lg transition-colors cursor-pointer ${
                    activeSheet === 'filters'
                      ? 'text-purple-300 bg-purple-950/60 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-400 mb-0.5" />
                  <span className="text-[10px] font-medium whitespace-nowrap">Filters</span>
                </button>

                <button
                  onClick={() => setActiveSheet(activeSheet === 'speed' ? null : 'speed')}
                  className={`flex flex-col items-center justify-center min-w-[50px] py-1 rounded-lg transition-colors cursor-pointer ${
                    activeSheet === 'speed'
                      ? 'text-purple-300 bg-purple-950/60 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Film className="w-4 h-4 text-amber-400 mb-0.5" />
                  <span className="text-[10px] font-medium whitespace-nowrap">Speed</span>
                </button>
              </>
            )}

            {/* Audio & Video Volume */}
            {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
              <button
                onClick={() => setActiveSheet(activeSheet === 'audio' ? null : 'audio')}
                className={`flex flex-col items-center justify-center min-w-[50px] py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSheet === 'audio'
                    ? 'text-purple-300 bg-purple-950/60 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4 text-blue-400 mb-0.5" />
                <span className="text-[10px] font-medium whitespace-nowrap">Volume</span>
              </button>
            )}

            {/* Text Clip Edit */}
            {selectedClip.type === 'text' && (
              <button
                onClick={() => setActiveSheet(activeSheet === 'text' ? null : 'text')}
                className={`flex flex-col items-center justify-center min-w-[52px] py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSheet === 'text'
                    ? 'text-purple-300 bg-purple-950/60 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4 text-cyan-400 mb-0.5" />
                <span className="text-[10px] font-medium whitespace-nowrap">Text FX</span>
              </button>
            )}

            {/* Transform (Scale / Position / Rotate) */}
            <button
              onClick={() => setActiveSheet(activeSheet === 'transform' ? null : 'transform')}
              className={`flex flex-col items-center justify-center min-w-[54px] py-1 rounded-lg transition-colors cursor-pointer ${
                activeSheet === 'transform'
                  ? 'text-purple-300 bg-purple-950/60 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Move className="w-4 h-4 text-pink-400 mb-0.5" />
              <span className="text-[10px] font-medium whitespace-nowrap">Transform</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={onDuplicateClip}
              className="flex flex-col items-center justify-center min-w-[52px] py-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-[10px] font-medium whitespace-nowrap">Duplicate</span>
            </button>

            {/* Delete */}
            <button
              onClick={onDeleteClip}
              className="flex flex-col items-center justify-center min-w-[50px] py-1 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-400 mb-0.5" />
              <span className="text-[10px] font-medium whitespace-nowrap">Delete</span>
            </button>

            {/* Deselect / Done */}
            <div className="w-[1px] h-6 bg-slate-800 mx-1 shrink-0" />
            <button
              onClick={onDeselectClip}
              className="flex flex-col items-center justify-center min-w-[50px] py-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Deselect clip"
            >
              <X className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] font-medium whitespace-nowrap">Done</span>
            </button>
          </div>
        ) : (
          /* Project-Level Tools (When No Clip Selected) */
          <div className="flex items-center gap-3 overflow-x-auto w-full py-1">
            <button
              onClick={onAddTitleClip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Title Card</span>
            </button>

            <button
              onClick={() => setActiveSheet(activeSheet === 'project-stage' ? null : 'project-stage')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Stage Scene</span>
            </button>

            <button
              onClick={() => setActiveSheet(activeSheet === 'project-beats' ? null : 'project-beats')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span>Backing Beat</span>
            </button>

            <button
              onClick={() => {
                const nextRatio: AspectRatio =
                  project.aspectRatio === '9:16' ? '16:9' : project.aspectRatio === '16:9' ? '1:1' : '9:16';
                onChangeAspectRatio(nextRatio);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Ratio: {project.aspectRatio || '9:16'}</span>
            </button>

            <button
              onClick={() => {
                const durations = [10, 15, 30, 45, 60];
                const currentIndex = durations.indexOf(project.duration);
                const nextDur = durations[(currentIndex + 1) % durations.length] || 15;
                onChangeProjectDuration(nextDur);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Length: {project.duration}s</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
