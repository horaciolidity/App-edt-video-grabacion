import React from 'react';
import {
  Camera,
  Mic2,
  Layers,
  Sparkles,
  Play,
  Film,
  Plus,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Sliders,
  CheckCircle2,
  FolderHeart
} from 'lucide-react';
import { Project, StudioTab } from '../../types';
import { STUDIO_BACKGROUNDS, PRESET_BEATS } from '../../constants/presets';

interface StudioHomeProps {
  project: Project;
  onNavigateTab: (tab: StudioTab) => void;
  onOpenExport: () => void;
}

export const StudioHome: React.FC<StudioHomeProps> = ({
  project,
  onNavigateTab,
  onOpenExport
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8 min-h-[calc(100vh-3.5rem)] pb-safe">
      {/* Hero Studio Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-br from-[#120f24] via-[#090b14] to-[#04121a] p-6 md:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Mobile Music Video Studio Engine</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Create Pro Music Videos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              Directly From Your Phone.
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 mt-4 leading-relaxed max-w-xl">
            Real-time GPU chroma keying, backing track karaoke sync, artist visual filters,
            and a professional multitrack editor built for rap, trap, rock, and reggaeton creators.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <button
              onClick={() => onNavigateTab('camera')}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Camera Studio</span>
            </button>

            <button
              onClick={() => onNavigateTab('editor')}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Open Multitrack Editor</span>
            </button>

            <button
              onClick={() => onNavigateTab('karaoke')}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <Mic2 className="w-4 h-4 text-cyan-400" />
              <span>Karaoke Deck</span>
            </button>
          </div>
        </div>

        {/* Ambient Stage Lights Visual Backdrop */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 lg:opacity-40 pointer-events-none overflow-hidden">
          <img
            src={STUDIO_BACKGROUNDS[0].src}
            alt=""
            className="w-full h-full object-cover object-center filter blur-sm scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#120f24] via-[#090b14]/70 to-transparent" />
        </div>
      </div>

      {/* 3 Core Production Suites */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Camera & Real-Time Chroma Key */}
        <div
          onClick={() => onNavigateTab('camera')}
          className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/60 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
              Live Camera & Chroma Key
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Record with front/rear cameras, sample screen color with the eyedropper,
              remove green screen live on GPU, and perform in virtual concert stages.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mt-6">
            <span>Enter Studio Viewfinder</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Backing Beats & Karaoke */}
        <div
          onClick={() => onNavigateTab('karaoke')}
          className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mic2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
              Karaoke & Vocal Recording
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Synthesized 808 trap, drill, and dembow beats in real time. Record separate vocal takes
              with teleprompter lyrics and latency compensation.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mt-6">
            <span>Open Vocal Booth</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Multitrack Video Editor */}
        <div
          onClick={() => onNavigateTab('editor')}
          className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-pink-500/60 hover:bg-slate-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-pink-600/20 border border-pink-500/40 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
              Multitrack Video Editor
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Timeline ruler, split cut, slip trim, position/scale transforms, slow motion,
              audio fade faders, and custom animated title overlays.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-400 mt-6">
            <span>Launch Timeline</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Active Project Quick Strip */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black border border-slate-700 shrink-0">
            <img
              src={project.thumbnailUrl || STUDIO_BACKGROUNDS[0].src}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[11px] text-purple-400 font-mono uppercase font-semibold">CURRENT WORKING PROJECT</span>
            <h4 className="text-base font-bold text-white mt-0.5">{project.title}</h4>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span>{project.genre}</span>
              <span>·</span>
              <span>{project.clips.length} Timeline Clips</span>
              <span>·</span>
              <span>{project.takes.length} Recorded Takes</span>
              <span>·</span>
              <span>{project.duration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigateTab('camera')}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
          >
            Record Next Take
          </button>
          <button
            onClick={onOpenExport}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Export Video
          </button>
        </div>
      </div>

      {/* Architecture & Engineering Specifications */}
      <div className="p-6 rounded-3xl bg-black/40 border border-slate-800/80 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>Architecture & Hardware Integration Specification</span>
        </div>
        <p className="leading-relaxed">
          <strong className="text-slate-300">Environment Inspection & Hardware Pipeline:</strong> Running on high-performance WebGL 2.0 / Web Audio multitrack pipeline with zero external CDN audio latency. Real camera stream captured via <code className="text-purple-300">navigator.mediaDevices.getUserMedia</code> with front/rear camera flip and simulated green-screen studio performer fallback for environments without physical webcams.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-purple-400 block font-bold">Chroma Key Shader</span>
            <span>GLSL Euclidean YUV with spill suppression & feathering</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400 block font-bold">Audio Engine</span>
            <span>Web Audio 48kHz Synthesizer with latency sync</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-pink-400 block font-bold">Compositor</span>
            <span>Non-destructive multitrack canvas & VP9/VP8 exporter</span>
          </div>
        </div>
      </div>
    </div>
  );
};
