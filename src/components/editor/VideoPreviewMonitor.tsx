import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Pipette,
  Maximize2,
  Film,
  Sparkles
} from 'lucide-react';
import { Project, MediaClip, AspectRatio, ChromaKeySettings } from '../../types';
import { ARTIST_FILTERS } from '../../constants/presets';

interface VideoPreviewMonitorProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedClip: MediaClip | null;
  onPickColor?: (colorHex: string) => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
}

export const VideoPreviewMonitor: React.FC<VideoPreviewMonitorProps> = ({
  project,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedClip,
  onPickColor,
  isEyedropperActive = false,
  onToggleEyedropper,
  onChangeAspectRatio
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cached media elements
  const imagesCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const videosCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [copiedColorHint, setCopiedColorHint] = useState<string | null>(null);

  // Aspect ratio dimensions
  const aspectRatio = project.aspectRatio || '9:16';
  const canvasWidth = aspectRatio === '9:16' ? 720 : aspectRatio === '16:9' ? 1280 : 720;
  const canvasHeight = aspectRatio === '9:16' ? 1280 : aspectRatio === '16:9' ? 720 : 720;

  // Initialize offscreen canvas for chroma keying
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Preload and cache media elements when clips change
  useEffect(() => {
    let isCancelled = false;

    project.clips.forEach(clip => {
      if (clip.type === 'image' && clip.src && !imagesCacheRef.current.has(clip.src)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = clip.src;
        imagesCacheRef.current.set(clip.src, img);
      } else if (clip.type === 'video' && clip.src && !videosCacheRef.current.has(clip.src)) {
        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.src = clip.src;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'auto';
        videosCacheRef.current.set(clip.src, vid);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [project.clips]);

  // Synchronize cached videos with current playback time
  useEffect(() => {
    project.clips.forEach(clip => {
      if (clip.type === 'video' && clip.src) {
        const vid = videosCacheRef.current.get(clip.src);
        if (vid) {
          const isActive = currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration;
          if (isActive) {
            const targetTime = Math.max(0, (currentTime - clip.startTime) * clip.speed + clip.trimStart);
            if (Math.abs(vid.currentTime - targetTime) > 0.15) {
              vid.currentTime = targetTime;
            }
            if (isPlaying && vid.paused) {
              vid.play().catch(() => {});
            } else if (!isPlaying && !vid.paused) {
              vid.pause();
            }
          } else {
            if (!vid.paused) {
              vid.pause();
            }
          }
        }
      }
    });
  }, [currentTime, isPlaying, project.clips]);

  // Chroma key extraction helper
  const renderKeyedFrame = useCallback((
    targetCtx: CanvasRenderingContext2D,
    sourceElement: HTMLVideoElement | HTMLImageElement,
    clip: MediaClip,
    w: number,
    h: number
  ) => {
    const chroma = clip.chromaKey;
    if (!chroma || !chroma.enabled) {
      targetCtx.drawImage(sourceElement, -w / 2, -h / 2, w, h);
      return;
    }

    const offCanvas = offscreenCanvasRef.current;
    if (!offCanvas) return;

    // Use smaller processing buffer for high-fps smooth keying
    const procW = 360;
    const procH = Math.round(360 * (h / w));
    offCanvas.width = procW;
    offCanvas.height = procH;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) {
      targetCtx.drawImage(sourceElement, -w / 2, -h / 2, w, h);
      return;
    }

    offCtx.clearRect(0, 0, procW, procH);
    offCtx.drawImage(sourceElement, 0, 0, procW, procH);

    // Apply pixel-level chroma key extraction
    const imgData = offCtx.getImageData(0, 0, procW, procH);
    const d = imgData.data;

    // Parse target key color
    let hex = chroma.keyColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const num = parseInt(hex, 16) || 0x00ff00;
    const targetR = (num >> 16) & 255;
    const targetG = (num >> 8) & 255;
    const targetB = num & 255;

    const tol = chroma.tolerance * 255;
    const soft = Math.max(1, chroma.softness * 255);
    const spill = chroma.spillReduction ?? 0.6;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      const diff = Math.sqrt(
        (r - targetR) * (r - targetR) +
        (g - targetG) * (g - targetG) +
        (b - targetB) * (b - targetB)
      );

      if (diff < tol) {
        if (diff < tol - soft) {
          d[i + 3] = 0; // Fully transparent
        } else {
          // Feathered smooth edge
          const alpha = (diff - (tol - soft)) / soft;
          d[i + 3] = Math.round(alpha * 255);
        }
      }

      // Spill suppression on fringe pixels
      if (d[i + 3] > 0 && spill > 0) {
        if (targetG > targetR && targetG > targetB) {
          // Green screen spill reduction
          const maxOther = Math.max(r, b);
          if (g > maxOther) {
            d[i + 1] = Math.round(g * (1 - spill) + maxOther * spill);
          }
        } else if (targetB > targetR && targetB > targetG) {
          // Blue screen spill reduction
          const maxOther = Math.max(r, g);
          if (b > maxOther) {
            d[i + 2] = Math.round(b * (1 - spill) + maxOther * spill);
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    // Draw transparent keyed frame to main canvas
    targetCtx.drawImage(offCanvas, -w / 2, -h / 2, w, h);
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Base background canvas fill
    ctx.save();
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Sort clips strictly by track hierarchy:
    // Background track first (tr_bg = 0) -> Artist video (tr_artist = 1) -> Overlay titles (tr_titles = 2)
    const sortedClips = [...project.clips].sort((a, b) => {
      const trA = project.tracks.find(t => t.id === a.trackId);
      const trB = project.tracks.find(t => t.id === b.trackId);
      const getOrder = (track: typeof trA) => {
        if (!track) return 1;
        if (track.id === 'tr_bg') return 0;
        if (track.id === 'tr_artist') return 1;
        if (track.id === 'tr_titles' || track.type === 'overlay') return 2;
        return 1;
      };
      return getOrder(trA) - getOrder(trB);
    });

    let renderedAnyVisual = false;

    for (const clip of sortedClips) {
      // Check if clip is active at currentTime
      if (currentTime < clip.startTime || currentTime > clip.startTime + clip.duration) {
        continue;
      }

      const track = project.tracks.find(t => t.id === clip.trackId);
      if (track?.isMuted) continue;

      ctx.save();

      // Clip Opacity
      const opacity = clip.transform?.opacity ?? 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      // Clip Transform & Center
      const centerX = w / 2 + (clip.transform?.x ?? 0) * (w / 200);
      const centerY = h / 2 + (clip.transform?.y ?? 0) * (h / 200);
      ctx.translate(centerX, centerY);

      if (clip.transform?.rotation) {
        ctx.rotate((clip.transform.rotation * Math.PI) / 180);
      }

      const scale = clip.transform?.scale ?? 1;
      ctx.scale(scale, scale);

      // Apply Artist Filter (if defined)
      if (clip.filterId && clip.filterId !== 'normal') {
        const filterDef = ARTIST_FILTERS.find(f => f.id === clip.filterId);
        if (filterDef) {
          ctx.filter = filterDef.cssFilter(clip.filterIntensity ?? 0.7);
        }
      }

      // Draw according to clip type
      if (clip.type === 'text' && clip.textContent) {
        const text = clip.textContent;
        const fontSize = clip.textStyle?.fontSize || 36;
        ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Vibrant neon glow shadow
        ctx.shadowColor = clip.textStyle?.color || 'rgba(168, 85, 247, 0.9)';
        ctx.shadowBlur = 16;

        if (clip.textStyle?.strokeColor) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = clip.textStyle.strokeColor;
          ctx.strokeText(text, 0, 0);
        }

        ctx.fillStyle = clip.textStyle?.color || '#ffffff';
        ctx.fillText(text, 0, 0);
        renderedAnyVisual = true;
      } else if (clip.type === 'image') {
        let img = imagesCacheRef.current.get(clip.src);
        if (!img && clip.src) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.src;
          imagesCacheRef.current.set(clip.src, img);
        }

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          renderedAnyVisual = true;
        } else {
          // Subtle backdrop placeholder
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }
      } else if (clip.type === 'video') {
        let vid = videosCacheRef.current.get(clip.src);
        if (!vid && clip.src) {
          vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.src = clip.src;
          vid.muted = true;
          vid.playsInline = true;
          videosCacheRef.current.set(clip.src, vid);
        }

        if (vid && vid.readyState >= 2) {
          renderKeyedFrame(ctx, vid, clip, w, h);
          renderedAnyVisual = true;
        } else {
          // If video is still loading or virtual camera take placeholder
          // Draw high-fidelity artist placeholder representation
          ctx.save();
          if (clip.chromaKey?.enabled) {
            // Simulated keyed subject with glowing outline
            ctx.fillStyle = 'rgba(147, 51, 234, 0.4)';
            ctx.beginPath();
            ctx.arc(0, -60, 90, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, 140, 140, 160, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(-w / 2, -h / 2, w, h);
          }
          ctx.restore();
          renderedAnyVisual = true;
        }
      }

      ctx.restore();
    }

    // Default aesthetic studio backdrop if nothing rendered
    if (!renderedAnyVisual) {
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#334155';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO VISUAL MEDIA AT CURRENT TIMECODE', w / 2, h / 2);
    }
  }, [currentTime, project.clips, project.tracks, renderKeyedFrame]);

  // Eyedropper click handler on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !canvasRef.current || !onPickColor) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);

    onPickColor(hex);
    setCopiedColorHint(`Picked: ${hex.toUpperCase()}`);
    setTimeout(() => setCopiedColorHint(null), 2500);

    if (onToggleEyedropper) {
      onToggleEyedropper();
    }
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-[190px] max-h-[46vh] bg-[#05060a] flex flex-col items-center justify-between p-2 select-none overflow-hidden"
    >
      {/* Aspect Ratio & Eyedropper Header Overlay */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
        {/* Aspect Ratio Badge */}
        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-slate-800 text-[11px] font-mono text-slate-300">
          <Film className="w-3 h-3 text-purple-400" />
          <span>{project.aspectRatio || '9:16'}</span>
          <span className="text-slate-500">·</span>
          <span>{project.resolution || '1080p'}</span>
        </div>

        {/* Color Hint Toast */}
        {copiedColorHint && (
          <div className="bg-purple-900/90 border border-purple-500 text-white text-[11px] font-mono px-2.5 py-1 rounded-full shadow-lg animate-fade-in">
            {copiedColorHint}
          </div>
        )}

        {/* Eyedropper & Ratio Toggle Controls */}
        <div className="flex items-center gap-1.5">
          {onToggleEyedropper && (
            <button
              onClick={onToggleEyedropper}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-1 ${
                isEyedropperActive
                  ? 'bg-purple-600 border-purple-400 text-white ring-2 ring-purple-400/50 animate-pulse'
                  : 'bg-black/70 hover:bg-slate-900 border-slate-800 text-slate-300'
              }`}
              title="Sample screen color for chroma key"
            >
              <Pipette className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">
                {isEyedropperActive ? 'Click video to sample' : 'Sample Color'}
              </span>
            </button>
          )}

          {/* Quick Aspect Ratio Switcher */}
          <button
            onClick={() => {
              const next: AspectRatio =
                project.aspectRatio === '9:16' ? '16:9' : project.aspectRatio === '16:9' ? '1:1' : '9:16';
              onChangeAspectRatio(next);
            }}
            className="p-1.5 rounded-lg bg-black/70 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
            title="Cycle Aspect Ratio"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Centered Video Canvas Viewport */}
      <div className="relative flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleCanvasClick}
          className={`max-h-full max-w-full rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-slate-800/80 object-contain transition-all ${
            aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
          } ${isEyedropperActive ? 'cursor-crosshair ring-2 ring-purple-500' : 'cursor-pointer'}`}
        />

        {/* Big Tap to Play / Pause Overlay on Click */}
        <button
          onClick={onTogglePlay}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity active:scale-95 cursor-pointer pointer-events-auto"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
        </button>
      </div>

      {/* Bottom Transport Scrubber Bar */}
      <div className="w-full max-w-xl flex items-center justify-between gap-2 px-3 py-1 bg-[#0a0d14]/90 backdrop-blur-md rounded-xl border border-slate-800/80 text-xs shrink-0 z-20">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rewind to Start (0s)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Step Back 1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-purple-600/30 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span className="text-[11px]">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                <span className="text-[11px]">Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSeek(Math.min(project.duration, currentTime + 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Step Forward 1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timecode Readout */}
        <div className="flex items-center gap-1 font-mono text-[11px] text-purple-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
          <span>{formatTimecode(currentTime)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{formatTimecode(project.duration)}</span>
        </div>
      </div>
    </div>
  );
};
