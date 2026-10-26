import React, { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Check,
  ChevronRight,
  Sliders,
  RotateCcw,
  Camera,
  Layers,
  Palette
} from 'lucide-react';
import { ARTIST_FILTERS, STUDIO_BACKGROUNDS } from '../../constants/presets';
import { ArtistFilter, StudioTab } from '../../types';

interface EffectsLibraryProps {
  onApplyFilter: (filterId: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
  activeFilterId?: string;
}

export const EffectsLibrary: React.FC<EffectsLibraryProps> = ({
  onApplyFilter,
  onNavigateTab,
  activeFilterId = 'trap_cyber'
}) => {
  // Navigation State within Add FX
  const [viewMode, setViewMode] = useState<'matrix' | 'editor'>('matrix');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Find initial filter
  const initial = ARTIST_FILTERS.find(f => f.id === activeFilterId) || ARTIST_FILTERS[1];
  const [selectedFilter, setSelectedFilter] = useState<ArtistFilter>(initial);
  const [intensity, setIntensity] = useState<number>(0.75);
  const [previewBgIndex, setPreviewBgIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Styles' },
    { id: 'trap', label: 'Trap & 808' },
    { id: 'hiphop', label: 'Hip-Hop 90s' },
    { id: 'glitch', label: 'Glitch / Cyber' },
    { id: 'retro', label: 'Retro VHS' },
    { id: 'cinematic', label: 'Cinematic Noir' },
    { id: 'reggaeton', label: 'Reggaeton' },
    { id: 'pop', label: 'Pop & Bloom' },
    { id: 'rock', label: 'Rock Grunge' }
  ];

  const filteredList = activeCategory === 'all'
    ? ARTIST_FILTERS
    : ARTIST_FILTERS.filter(f => f.category === activeCategory);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2400);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 min-h-[calc(100vh-3.5rem)] pb-safe flex flex-col select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-pink-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP-LEFT RETURN HEADER BAR */}
      <div className="pb-4 border-b border-slate-800/90 flex items-center justify-between gap-3">
        {/* Top-left Back button */}
        <div className="flex items-center gap-3">
          {viewMode === 'editor' ? (
            <button
              onClick={() => setViewMode('matrix')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Return to Effects Matrix"
            >
              <ArrowLeft className="w-4 h-4 text-pink-400" />
              <span>Back to FX Matrix</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('camera')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Return to Camera Studio"
            >
              <ArrowLeft className="w-4 h-4 text-purple-400" />
              <span>Back to Camera</span>
            </button>
          )}

          <div className="hidden sm:block">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>
                {viewMode === 'editor'
                  ? `Fine-Tuning: ${selectedFilter.name}`
                  : 'Artist Effects & Visual Shaders'}
              </span>
            </h2>
          </div>
        </div>

        {/* Action button in top-right */}
        <button
          onClick={() => {
            onApplyFilter(selectedFilter.id);
            onNavigateTab('camera');
          }}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Launch Camera</span>
        </button>
      </div>

      {/* VIEW 1: EFFECTS MATRIX (BROWSE CATEGORIES & PRESETS) */}
      {viewMode === 'matrix' && (
        <div className="flex-1 flex flex-col pt-3">
          {/* Category Segmented Scroller */}
          <div className="flex items-center gap-1.5 pb-3 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* Left: Filter Cards Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredList.map((filter) => {
                const isSelected = selectedFilter.id === filter.id;
                return (
                  <div
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilter(filter);
                    }}
                    className={`p-3.5 rounded-2xl border bg-slate-900/60 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-950/20 ring-1 ring-pink-500/50 shadow-lg shadow-pink-900/20'
                        : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-[10px] uppercase font-mono tracking-wider font-semibold"
                          style={{ color: filter.accentColor }}
                        >
                          {filter.category}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-white">{filter.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {filter.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 flex items-center justify-between border-t border-slate-800/80 text-xs">
                      {/* Secondary Screen Navigation Button with Preserved State */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFilter(filter);
                          setViewMode('editor');
                        }}
                        className="text-slate-300 hover:text-pink-300 font-medium flex items-center gap-1 cursor-pointer"
                        title="Fine-tune parameters for this effect"
                      >
                        <Sliders className="w-3.5 h-3.5 text-pink-400" />
                        <span>Customize FX</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFilter(filter);
                          onApplyFilter(filter.id);
                          onNavigateTab('camera');
                        }}
                        className="text-pink-400 font-semibold hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Select & Shoot</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Real-time Live Sandbox Monitor */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                      Live Shader Preview
                    </span>
                  </div>

                  {/* Stage Backdrop Switcher */}
                  <div className="flex items-center gap-1">
                    {STUDIO_BACKGROUNDS.map((bg, idx) => (
                      <button
                        key={bg.id}
                        onClick={() => setPreviewBgIndex(idx)}
                        className={`w-6 h-6 rounded-md overflow-hidden border cursor-pointer ${
                          previewBgIndex === idx ? 'border-pink-400 ring-1 ring-pink-400' : 'border-slate-700'
                        }`}
                        title={bg.name}
                      >
                        <img src={bg.src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Live Frame with Shader Filter Applied */}
                <div className="relative aspect-[9/16] max-h-[340px] w-full mx-auto rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                  <img
                    src={STUDIO_BACKGROUNDS[previewBgIndex].src}
                    alt=""
                    className="w-full h-full object-cover transition-all"
                    style={{
                      filter: selectedFilter.cssFilter(intensity)
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] backdrop-blur-md">
                        {selectedFilter.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-pink-500/90 text-white font-mono text-[10px]">
                        {Math.round(intensity * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Intensity Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Intensity</span>
                    <span className="font-mono text-pink-400">{Math.round(intensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setViewMode('editor')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-pink-400" />
                    <span>Fine-Tune FX</span>
                  </button>

                  <button
                    onClick={() => {
                      onApplyFilter(selectedFilter.id);
                      onNavigateTab('camera');
                    }}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply & Record</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED EFFECT CUSTOMIZER SCREEN (WITH CLEAR TOP-LEFT BACK BUTTON) */}
      {viewMode === 'editor' && (
        <div className="flex-1 flex flex-col pt-3 max-w-4xl mx-auto w-full">
          {/* Submenu Navigation Breadcrumb & Back Action */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
            <button
              onClick={() => setViewMode('matrix')}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-pink-400" />
              <span>Back to FX List</span>
            </button>

            <span className="text-xs font-mono text-slate-400">
              Category: <strong className="text-white uppercase">{selectedFilter.category}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Interactive Viewport */}
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[9/16] max-h-[420px] w-full mx-auto rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                <img
                  src={STUDIO_BACKGROUNDS[previewBgIndex].src}
                  alt={selectedFilter.name}
                  className="w-full h-full object-cover"
                  style={{
                    filter: selectedFilter.cssFilter(intensity)
                  }}
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[11px] font-mono border border-slate-800">
                  {selectedFilter.name} · {Math.round(intensity * 100)}%
                </div>
              </div>

              {/* Stage Chooser */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-slate-400">Preview Backdrop:</span>
                <div className="flex items-center gap-1.5">
                  {STUDIO_BACKGROUNDS.map((bg, idx) => (
                    <button
                      key={bg.id}
                      onClick={() => setPreviewBgIndex(idx)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono border cursor-pointer ${
                        previewBgIndex === idx
                          ? 'border-pink-400 bg-pink-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {bg.genre.split('/')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Parameter Adjustment Controls */}
            <div className="flex flex-col justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-pink-400">
                    Shader Properties
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">{selectedFilter.name}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {selectedFilter.description}
                  </p>
                </div>

                {/* Intensity Slider */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-200 mb-2 font-medium">
                    <span>Filter Intensity / Gain</span>
                    <span className="font-mono text-pink-400 font-bold">
                      {Math.round(intensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>Subtle (10%)</span>
                    <span>Default (75%)</span>
                    <span>Extreme (100%)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-slate-400 text-xs font-medium block mb-1.5">
                    Shader Preset Levels
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[0.3, 0.75, 1.0].map((val) => (
                      <button
                        key={val}
                        onClick={() => setIntensity(val)}
                        className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                          intensity === val
                            ? 'border-pink-500 bg-pink-950 text-white font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {val === 0.3 ? 'Subtle' : val === 0.75 ? 'Optimal' : 'Maximum'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Submenu */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    onApplyFilter(selectedFilter.id);
                    onNavigateTab('camera');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Apply & Open Camera</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIntensity(0.75);
                      showToast('Reset to default intensity');
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    onClick={() => {
                      showToast(`Saved settings for ${selectedFilter.name}`);
                      setViewMode('matrix');
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Keep & Return</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
