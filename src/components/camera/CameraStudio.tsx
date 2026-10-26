import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Play,
  Square,
  Pause,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Pipette,
  Check,
  Music,
  Maximize2,
  Minimize2,
  Layers,
  ChevronRight,
  Sun,
  RotateCcw
} from 'lucide-react';
import { ChromaKeySettings, ProjectTake, BackingBeat, StudioTab } from '../../types';
import {
  DEFAULT_CHROMA_SETTINGS,
  CHROMA_COLOR_PRESETS,
  STUDIO_BACKGROUNDS,
  ARTIST_FILTERS,
  PRESET_BEATS
} from '../../constants/presets';
import { ChromaKeyEngine } from '../../services/chromaKeyEngine';
import { beatSynthesizer } from '../../services/beatSynthesizer';

interface CameraStudioProps {
  onTakeRecorded: (take: ProjectTake) => void;
  onNavigateTab: (tab: StudioTab) => void;
  initialBeat?: BackingBeat;
}

export const CameraStudio: React.FC<CameraStudioProps> = ({
  onTakeRecorded,
  onNavigateTab,
  initialBeat = PRESET_BEATS[0]
}) => {
  // Camera & Stream State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [recordedTakes, setRecordedTakes] = useState<ProjectTake[]>([]);
  const [activeTakePreview, setActiveTakePreview] = useState<ProjectTake | null>(null);

  // Chroma Key Settings
  const [chromaSettings, setChromaSettings] = useState<ChromaKeySettings>(DEFAULT_CHROMA_SETTINGS);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [showChromaPanel, setShowChromaPanel] = useState<boolean>(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [showAudioPanel, setShowAudioPanel] = useState<boolean>(false);

  // Filter State
  const [activeFilterId, setActiveFilterId] = useState<string>('normal');
  const [filterIntensity, setFilterIntensity] = useState<number>(0.75);

  // Backing Track State
  const [selectedBeat, setSelectedBeat] = useState<BackingBeat>(initialBeat);
  const [isBeatPlaying, setIsBeatPlaying] = useState<boolean>(false);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(0);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulatedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ChromaKeyEngine | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simAnimFrameRef = useRef<number | null>(null);

  // Initialize WebGL Chroma Engine
  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new ChromaKeyEngine(canvasRef.current);
      if (chromaSettings.backgroundSrc) {
        engineRef.current.setBackground(chromaSettings.backgroundSrc);
      }
    }
  }, []);

  // Update background when chromaSettings changes
  useEffect(() => {
    if (engineRef.current && chromaSettings.backgroundSrc) {
      engineRef.current.setBackground(chromaSettings.backgroundSrc);
    }
  }, [chromaSettings.backgroundSrc]);

  // Start Hardware Camera Stream or Fallback Simulation
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      setPermissionError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsSimulatedCamera(false);
    } catch (err: unknown) {
      console.warn('Physical camera unavailable, enabling high-res simulated studio feed:', err);
      setIsSimulatedCamera(true);
      setPermissionError('Hardware camera unavailable or permission denied. Simulated green-screen studio feed active.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      beatSynthesizer.stop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (simAnimFrameRef.current) cancelAnimationFrame(simAnimFrameRef.current);
    };
  }, [facingMode, startCamera]);

  // Simulated Camera Canvas Animation (Generates real dynamic green-screen performer)
  useEffect(() => {
    if (!isSimulatedCamera) return;

    const simCanvas = simulatedCanvasRef.current;
    if (!simCanvas) return;
    const ctx = simCanvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const renderSim = () => {
      time += 0.04;
      const w = simCanvas.width;
      const h = simCanvas.height;

      // 1. Draw solid key color (Green screen studio background by default or selected color)
      ctx.fillStyle = chromaSettings.keyColor || '#00ff00';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw animated artist / singer performing in front of green screen
      const centerX = w / 2 + Math.sin(time * 0.8) * 15;
      const baseY = h * 0.72 + Math.cos(time * 1.6) * 8;

      ctx.save();
      // Body / Jacket (Dark silhouette with neon rims)
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(centerX, baseY + 90, 130, 210, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#c2410c'; // Skin tone
      ctx.beginPath();
      ctx.arc(centerX, baseY - 90, 65, 0, Math.PI * 2);
      ctx.fill();

      // Cap / Headphones
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, baseY - 110, 70, Math.PI, Math.PI * 2);
      ctx.fill();

      // Studio Microphone in hand
      const micX = centerX + Math.sin(time * 1.5) * 35 - 30;
      const micY = baseY - 60;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(micX - 8, micY, 16, 80);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(micX, micY - 5, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      simAnimFrameRef.current = requestAnimationFrame(renderSim);
    };

    simAnimFrameRef.current = requestAnimationFrame(renderSim);
    return () => {
      if (simAnimFrameRef.current) cancelAnimationFrame(simAnimFrameRef.current);
    };
  }, [isSimulatedCamera, chromaSettings.keyColor]);

  // Main Render Loop: Feeds Video or Simulated Canvas into WebGL Chroma Key Pipeline
  useEffect(() => {
    const loop = () => {
      const source = isSimulatedCamera ? simulatedCanvasRef.current : videoRef.current;
      if (source && canvasRef.current && engineRef.current) {
        if (source instanceof HTMLVideoElement) {
          if (source.readyState >= 2) {
            engineRef.current.render(source, chromaSettings, activeFilterId, filterIntensity);
          }
        } else if (source instanceof HTMLCanvasElement) {
          engineRef.current.render(source, chromaSettings, activeFilterId, filterIntensity);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chromaSettings, activeFilterId, filterIntensity, isSimulatedCamera]);

  // Toggle Camera Front / Back
  const handleToggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Zoom Control
  const handleZoom = (lvl: number) => {
    setZoomLevel(lvl);
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as { zoom?: { min: number; max: number } }) || {};
        if (capabilities.zoom) {
          videoTrack.applyConstraints({
            advanced: [{ zoom: lvl } as unknown as MediaTrackConstraintSet]
          }).catch(() => {});
        }
      }
    }
  };

  // Torch / Flash
  const handleToggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet]
          });
          setTorchOn(!torchOn);
        } catch {
          // torch unsupported on this device
        }
      }
    }
  };

  // Eyedropper click on canvas to pick chroma color
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !engineRef.current) return;
    const hex = engineRef.current.pickColorAt(e.clientX, e.clientY);
    setChromaSettings(prev => ({ ...prev, keyColor: hex, enabled: true }));
    setIsEyedropperActive(false);
  };

  // Custom Background Upload
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setChromaSettings(prev => ({
        ...prev,
        enabled: true,
        backgroundType: 'image',
        backgroundSrc: url,
        backgroundName: file.name
      }));
    }
  };

  // Trigger Recording with 3-2-1 Countdown & Backing Beat Sync
  const handleStartCountdown = () => {
    if (isRecording) return;
    setCountdown(3);
    const countTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countTimer);
          startActualRecording();
          return null;
        }
        return prev - 1;
      });
    }, 900);
  };

  const startActualRecording = () => {
    if (!canvasRef.current) return;

    // Start backing beat in sync
    beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
    setIsBeatPlaying(true);

    // Stream from composited canvas + audio destination
    const canvasStream = canvasRef.current.captureStream(30);
    const audioDest = beatSynthesizer.getStreamDestination();
    const tracks = [...canvasStream.getVideoTracks()];

    // Add mic audio track if available
    if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
      tracks.push(streamRef.current.getAudioTracks()[0]);
    } else if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      tracks.push(audioDest.stream.getAudioTracks()[0]);
    }

    const recordStream = new MediaStream(tracks);
    recordedChunksRef.current = [];

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
    }

    try {
      const recorder = mimeType ? new MediaRecorder(recordStream, { mimeType }) : new MediaRecorder(recordStream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const takeNum = recordedTakes.length + 1;
        const newTake: ProjectTake = {
          id: 'take_' + Date.now(),
          takeNumber: takeNum,
          title: `Take ${takeNum} (${selectedBeat.title})`,
          createdAt: Date.now(),
          videoUrl,
          duration: recordSeconds,
          beatId: selectedBeat.id,
          beatName: selectedBeat.title,
          latencyOffsetMs,
          chromaSettings: { ...chromaSettings },
          filterId: activeFilterId
        };

        setRecordedTakes(prev => [newTake, ...prev]);
        setActiveTakePreview(newTake);
        onTakeRecorded(newTake);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordSeconds(0);

      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    beatSynthesizer.stop();
    setIsBeatPlaying(false);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-black overflow-hidden flex flex-col select-none">
      {/* Hidden raw video & fallback simulated canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />
      <canvas
        ref={simulatedCanvasRef}
        width={720}
        height={1280}
        className="hidden"
      />

      {/* Main Viewfinder Canvas (WebGL Composited Stream) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          onClick={handleCanvasClick}
          className={`max-h-full max-w-full aspect-[9/16] object-contain shadow-2xl transition-transform ${
            isEyedropperActive ? 'cursor-crosshair ring-2 ring-cyan-400' : ''
          }`}
          style={{
            transform: `scale(${zoomLevel})`
          }}
        />

        {/* Eyedropper indicator tooltip */}
        {isEyedropperActive && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-bounce z-30">
            <Pipette className="w-4 h-4 text-cyan-400" />
            <span>Tap anywhere on video to sample key color</span>
          </div>
        )}

        {/* 3-2-1 Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-pulse">
            <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 via-pink-400 to-cyan-300 drop-shadow-[0_0_40px_rgba(168,85,247,0.8)]">
              {countdown}
            </span>
          </div>
        )}

        {/* Top Viewfinder Floating HUD */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          {/* Status info */}
          <div className="pointer-events-auto flex items-center gap-2">
            {isRecording ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold tracking-wider shadow-lg shadow-red-600/30">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>REC {formatTimer(recordSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs font-medium backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>STANDBY · 1080p 30fps</span>
              </div>
            )}

            {isSimulatedCamera && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] backdrop-blur-md">
                <span>Studio Sim Feed</span>
              </div>
            )}
          </div>

          {/* Quick controls on top right */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Flash / Torch */}
            <button
              onClick={handleToggleTorch}
              className={`min-h-[44px] min-w-[44px] rounded-full p-2.5 backdrop-blur-md border transition-all cursor-pointer ${
                torchOn ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:text-white'
              }`}
              title="Torch / Flash"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* Flip camera */}
            <button
              onClick={handleToggleCamera}
              className="min-h-[44px] min-w-[44px] rounded-full p-2.5 bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white backdrop-blur-md transition-all active:rotate-180 cursor-pointer"
              title="Switch Front/Rear Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Action Rail (Snapchat-style floating tools) */}
        <div className="absolute right-4 top-20 bottom-36 flex flex-col items-center justify-center gap-3 z-20">
          {/* Chroma Key Panel Toggle */}
          <button
            onClick={() => {
              setShowChromaPanel(!showChromaPanel);
              setShowFiltersPanel(false);
              setShowAudioPanel(false);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-3 flex flex-col items-center justify-center gap-1 backdrop-blur-md border transition-all cursor-pointer ${
              chromaSettings.enabled || showChromaPanel
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Chroma Key Studio"
          >
            <Layers className="w-5 h-5" />
            <span className="text-[9px] font-semibold">Key</span>
          </button>

          {/* Live Filters Toggle */}
          <button
            onClick={() => {
              setShowFiltersPanel(!showFiltersPanel);
              setShowChromaPanel(false);
              setShowAudioPanel(false);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-3 flex flex-col items-center justify-center gap-1 backdrop-blur-md border transition-all cursor-pointer ${
              activeFilterId !== 'normal' || showFiltersPanel
                ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/40'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Artist Visual Filters"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-semibold">FX</span>
          </button>

          {/* Karaoke Beat Toggle */}
          <button
            onClick={() => {
              setShowAudioPanel(!showAudioPanel);
              setShowChromaPanel(false);
              setShowFiltersPanel(false);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-3 flex flex-col items-center justify-center gap-1 backdrop-blur-md border transition-all cursor-pointer ${
              isBeatPlaying || showAudioPanel
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/40'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Backing Beat & Karaoke"
          >
            <Music className="w-5 h-5" />
            <span className="text-[9px] font-semibold">Beat</span>
          </button>

          {/* Zoom Selector */}
          <div className="flex flex-col gap-1 p-1 bg-slate-900/80 border border-slate-700/60 rounded-full backdrop-blur-md">
            {[1, 2].map((z) => (
              <button
                key={z}
                onClick={() => handleZoom(z)}
                className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  zoomLevel === z ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        {/* Sliding Contextual Panel: Real-time Chroma Key Studio */}
        {showChromaPanel && (
          <div className="absolute left-4 right-4 bottom-28 md:left-auto md:right-20 md:w-96 bg-slate-950/95 border border-purple-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Chroma Key Studio</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={chromaSettings.enabled}
                  onChange={(e) => setChromaSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-4 pt-3 text-xs">
              {/* Color Selection & Eyedropper */}
              <div>
                <label className="text-slate-400 font-medium block mb-1.5">Key Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CHROMA_COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setChromaSettings(prev => ({ ...prev, keyColor: color.hex, enabled: true }))}
                      className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                        chromaSettings.keyColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-purple-400 bg-purple-950/50 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                    </button>
                  ))}

                  {/* Eyedropper tool */}
                  <button
                    onClick={() => {
                      setIsEyedropperActive(!isEyedropperActive);
                      setShowChromaPanel(false);
                    }}
                    className={`h-7 px-3 rounded-lg border flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer ${
                      isEyedropperActive
                        ? 'bg-cyan-500 text-black border-cyan-400'
                        : 'bg-slate-900 border-cyan-500/50 text-cyan-300 hover:bg-cyan-950'
                    }`}
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    <span>Eyedropper</span>
                  </button>
                </div>
              </div>

              {/* Sliders: Tolerance, Softness, Spill */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Color Tolerance</span>
                  <span className="font-mono text-purple-300">{Math.round(chromaSettings.tolerance * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.02"
                  value={chromaSettings.tolerance}
                  onChange={(e) => setChromaSettings(prev => ({ ...prev, tolerance: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Edge Softness</span>
                  <span className="font-mono text-purple-300">{Math.round(chromaSettings.softness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.4"
                  step="0.01"
                  value={chromaSettings.softness}
                  onChange={(e) => setChromaSettings(prev => ({ ...prev, softness: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Spill Suppression</span>
                  <span className="font-mono text-purple-300">{Math.round(chromaSettings.spillReduction * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={chromaSettings.spillReduction}
                  onChange={(e) => setChromaSettings(prev => ({ ...prev, spillReduction: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Background Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400 font-medium">Virtual Stage Background</label>
                  <label className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer">
                    + Upload Custom
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_BACKGROUNDS.map((bg) => {
                    const isSelected = chromaSettings.backgroundSrc === bg.src;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => setChromaSettings(prev => ({
                          ...prev,
                          enabled: true,
                          backgroundType: 'preset',
                          backgroundSrc: bg.src,
                          backgroundName: bg.name
                        }))}
                        className={`group relative h-20 rounded-xl overflow-hidden border text-left cursor-pointer transition-all ${
                          isSelected ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={bg.src}
                          alt={bg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 flex flex-col justify-end">
                          <span className="text-[11px] font-bold text-white truncate">{bg.name}</span>
                          <span className="text-[9px] text-slate-300 truncate">{bg.genre}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sliding Contextual Panel: Live Artist Filters */}
        {showFiltersPanel && (
          <div className="absolute left-4 right-4 bottom-28 md:left-auto md:right-20 md:w-88 bg-slate-950/95 border border-pink-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-semibold text-white">Artist Visual Filters</h3>
              </div>
              <button
                onClick={() => setActiveFilterId('normal')}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-4 pt-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Effect Intensity</span>
                  <span className="font-mono text-pink-300">{Math.round(filterIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={filterIntensity}
                  onChange={(e) => setFilterIntensity(parseFloat(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ARTIST_FILTERS.map((f) => {
                  const isSelected = activeFilterId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilterId(f.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-pink-500 bg-pink-950/40 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.accentColor }} />
                        <span className="text-xs font-bold truncate">{f.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {f.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sliding Contextual Panel: Karaoke Beat & Audio Settings */}
        {showAudioPanel && (
          <div className="absolute left-4 right-4 bottom-28 md:left-auto md:right-20 md:w-88 bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Backing Beat & Sync</h3>
              </div>
              <button
                onClick={() => {
                  if (isBeatPlaying) {
                    beatSynthesizer.stop();
                    setIsBeatPlaying(false);
                  } else {
                    beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
                    setIsBeatPlaying(true);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  isBeatPlaying ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {isBeatPlaying ? 'Stop Beat' : 'Preview Beat'}
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <label className="text-slate-400 font-medium block">Select Studio Backing Track</label>
              <div className="space-y-1.5">
                {PRESET_BEATS.map((beat) => (
                  <button
                    key={beat.id}
                    onClick={() => {
                      setSelectedBeat(beat);
                      if (isBeatPlaying) {
                        beatSynthesizer.start(beat.synthStyle, beat.bpm);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      selectedBeat.id === beat.id
                        ? 'border-cyan-400 bg-cyan-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-white">{beat.title}</div>
                      <div className="text-[10px] text-slate-400">{beat.genre} · {beat.bpm} BPM · {beat.key}</div>
                    </div>
                    {selectedBeat.id === beat.id && (
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">READY</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Latency Sync Offset */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Vocal Latency Compensation</span>
                  <span className="font-mono text-cyan-300">{latencyOffsetMs} ms</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="5"
                  value={latencyOffsetMs}
                  onChange={(e) => setLatencyOffsetMs(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tip: Wear wired or low-latency headphones to prevent audio feedback bleed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Recording Controls Deck */}
      <div className="h-28 bg-[#0a0a12]/95 border-t border-slate-800/80 px-6 flex items-center justify-between shrink-0 z-20 pb-safe">
        {/* Left: Takes preview thumbnail */}
        <div className="w-20">
          {recordedTakes.length > 0 ? (
            <button
              onClick={() => setActiveTakePreview(recordedTakes[0])}
              className="relative w-12 h-16 rounded-lg overflow-hidden border border-purple-500/60 group cursor-pointer shadow-lg"
            >
              <video
                src={recordedTakes[0].videoUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                <span className="text-[10px] font-bold text-white bg-black/60 px-1 rounded">
                  {recordedTakes.length}
                </span>
              </div>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium">0 Takes</div>
          )}
        </div>

        {/* Center: Tactile Shutter Recording Button */}
        <div className="flex items-center gap-4">
          {isRecording && (
            <button
              onClick={handlePauseResume}
              className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-all cursor-pointer"
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              {isPaused ? <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-5 h-5 text-amber-400 fill-amber-400" />}
            </button>
          )}

          <button
            onClick={isRecording ? handleStopRecording : handleStartCountdown}
            className={`relative min-h-[72px] min-w-[72px] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 ring-8 ring-red-600/30 scale-105'
                : 'bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 hover:scale-105 ring-4 ring-purple-500/20 active:scale-95'
            }`}
          >
            {isRecording ? (
              <Square className="w-7 h-7 text-white fill-white" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white shadow-inner" />
            )}
          </button>
        </div>

        {/* Right: Quick jump to Multitrack Editor */}
        <div className="w-20 flex justify-end">
          <button
            onClick={() => onNavigateTab('editor')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-medium whitespace-nowrap">Open Editor</span>
          </button>
        </div>
      </div>

      {/* Recorded Take Preview Modal */}
      {activeTakePreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h4 className="text-base font-bold text-white mb-2">{activeTakePreview.title}</h4>
            <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-inner mb-4 relative">
              <video
                src={activeTakePreview.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setActiveTakePreview(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Keep & Retake
              </button>
              <button
                onClick={() => {
                  setActiveTakePreview(null);
                  onNavigateTab('editor');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Edit in Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
