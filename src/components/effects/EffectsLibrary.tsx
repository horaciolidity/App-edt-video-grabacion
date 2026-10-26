import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Check,
  Video,
  Layers,
  ChevronRight,
  Flame,
  Radio,
  Tv,
  Zap,
  Moon,
  Sun
} from 'lucide-react';
import { ARTIST_FILTERS, STUDIO_BACKGROUNDS } from '../../constants/presets';
import { ArtistFilter, StudioTab } from '../../types';

interface EffectsLibraryProps {
  onApplyFilter: (filterId: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
}

export const EffectsLibrary: React.FC<EffectsLibraryProps> = ({
  onApplyFilter,
  onNavigateTab
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ArtistFilter>(ARTIST_FILTERS[1]); // Trap Neon
  const [intensity, setIntensity] = useState<number>(0.8);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewBgIndex, setPreviewBgIndex] = useState<number>(0);

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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-3.5rem)] pb-safe">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400" />
          <h2 className="text-xl font-black text-white">Artist Effects & Filter Matrix</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Non-destructive GPU visual shaders crafted specifically for hip-hop, trap, rock, and pop artists
        </p>
      </div>

      {/* Category Segmented Bar */}
      <div className="flex items-center gap-1.5 py-4 overflow-x-auto">
        {categories.map(cat => (
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

      {/* Showcase Grid + Live Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* Left: Filter Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredList.map(filter => {
            const isSelected = selectedFilter.id === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => setSelectedFilter(filter)}
                className={`p-4 rounded-3xl border bg-slate-900/60 flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-pink-500 bg-pink-950/20 ring-1 ring-pink-500/50 shadow-xl shadow-pink-900/20'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold" style={{ color: filter.accentColor }}>
                      {filter.category}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white">{filter.name}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {filter.description}
                  </p>
                </div>

                <div className="pt-4 mt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500">Live Preview</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyFilter(filter.id);
                      onNavigateTab('camera');
                    }}
                    className="text-pink-400 font-semibold hover:text-pink-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Use in Camera</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Real-time Live Sandbox Monitor */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Live Shader Simulator</h3>
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
            <div className="relative aspect-[9/16] max-h-[380px] w-full mx-auto rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
              <img
                src={STUDIO_BACKGROUNDS[previewBgIndex].src}
                alt=""
                className="w-full h-full object-cover transition-all"
                style={{
                  filter: selectedFilter.cssFilter(intensity)
                }}
              />
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-black/60 text-white font-mono text-[10px] backdrop-blur-md">
                    {selectedFilter.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/80 text-white font-mono text-[10px]">
                    {Math.round(intensity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Intensity Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Filter Intensity</span>
                <span className="font-mono text-pink-400">{Math.round(intensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full accent-pink-500"
              />
            </div>

            {/* Apply button */}
            <button
              onClick={() => {
                onApplyFilter(selectedFilter.id);
                onNavigateTab('camera');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Record with {selectedFilter.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
