import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Film,
  Smartphone,
  Monitor,
  Square as SquareIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Project, AspectRatio, Resolution } from '../../types';
import { multitrackExportEngine, ExportProgress } from '../../services/exportService';

interface ExportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio || '9:16');
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportedUrl(null);
    setProgress({
      progress: 0,
      currentTime: 0,
      totalDuration: project.duration,
      status: 'rendering'
    });

    try {
      const url = await multitrackExportEngine.exportProject(
        project,
        { aspectRatio, resolution, fps },
        (prog) => setProgress(prog)
      );

      setExportedUrl(url);
      setIsExporting(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    } catch (err: unknown) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    multitrackExportEngine.cancel();
    setIsExporting(false);
  };

  const handleDownloadFile = () => {
    if (!exportedUrl) return;
    const a = document.createElement('a');
    a.href = exportedUrl;
    a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_export.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0e111a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Music Video</h3>
              <p className="text-xs text-slate-400">Multitrack rendering with full audio mixdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Completed Screen */}
        {exportedUrl ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-black text-white">Music Video Ready!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Composited with {resolution} · {fps}fps · Chroma Key & Master Audio
              </p>
            </div>

            {/* Video preview */}
            <div className="w-full max-w-xs aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <video src={exportedUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={handleDownloadFile}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save to Device Gallery</span>
              </button>

              <button
                onClick={() => setExportedUrl(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : isExporting ? (
          /* Live Rendering Progress Screen */
          <div className="py-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center ring-8 ring-purple-600/10 animate-spin">
              <Film className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Rendering Multitrack Composition...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Processing video layers, chroma key shaders, and audio mixing
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{progress?.currentTime?.toFixed(1) || '0.0'}s / {project.duration.toFixed(1)}s</span>
                <span className="text-purple-300 font-bold">{Math.round((progress?.progress ?? 0) * 100)}%</span>
              </div>
            </div>

            <button
              onClick={handleCancelExport}
              className="py-2 px-5 rounded-xl border border-red-500/50 hover:bg-red-950/40 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel Render
            </button>
          </div>
        ) : (
          /* Options & Settings Form */
          <div className="space-y-5 py-4 text-xs">
            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-slate-400 block mb-2 font-medium">Aspect Ratio & Target Format</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: '9:16' as AspectRatio, label: '9:16 Vertical', sub: 'TikTok / Reels / Shorts', icon: Smartphone },
                  { id: '16:9' as AspectRatio, label: '16:9 Cinema', sub: 'YouTube / Widescreen', icon: Monitor },
                  { id: '1:1' as AspectRatio, label: '1:1 Square', sub: 'Instagram Feed / Post', icon: SquareIcon },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = aspectRatio === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAspectRatio(item.id)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-400 bg-purple-950/40 text-white ring-1 ring-purple-400/50'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs text-white">{item.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution Selector */}
            <div>
              <label className="text-slate-400 block mb-2 font-medium">Resolution Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1080p' as Resolution, label: '1080p Full HD', desc: 'Highest clarity' },
                  { id: '720p' as Resolution, label: '720p HD', desc: 'Fast render' },
                  { id: '480p' as Resolution, label: '480p SD', desc: 'Compact size' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setResolution(r.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      resolution === r.id
                        ? 'border-purple-400 bg-purple-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{r.label}</div>
                    <div className="text-[10px] text-slate-400">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate */}
            <div>
              <label className="text-slate-400 block mb-2 font-medium">Frame Rate</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { fps: 30, label: '30 FPS', note: 'Standard smooth' },
                  { fps: 60, label: '60 FPS', note: 'Ultra fluid motion' },
                ].map(f => (
                  <button
                    key={f.fps}
                    onClick={() => setFps(f.fps)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      fps === f.fps
                        ? 'border-purple-400 bg-purple-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{f.label}</div>
                    <div className="text-[10px] text-slate-400">{f.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary specs */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Total Video Duration:</span>
                <span className="font-mono text-slate-200">{project.duration.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span>Active Layers:</span>
                <span className="font-mono text-slate-200">{project.clips.length} clips across {project.tracks.length} tracks</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Engine:</span>
                <span className="font-mono text-slate-200">Stereo 48kHz Web Audio</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handleStartExport}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Multitrack Render</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
