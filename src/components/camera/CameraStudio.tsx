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
  RotateCcw,
  ArrowLeft,
  Upload,
  Disc,
  Trash2,
  FileAudio,
  Clock,
  Timer,
  Settings2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ChromaKeySettings, ProjectTake, BackingBeat, StudioTab, Resolution } from '../../types';
import {
  DEFAULT_CHROMA_SETTINGS,
  CHROMA_COLOR_PRESETS,
  STUDIO_BACKGROUNDS,
  ARTIST_FILTERS,
  PRESET_BEATS
} from '../../constants/presets';
import { ChromaKeyEngine } from '../../services/chromaKeyEngine';
import { beatSynthesizer } from '../../services/beatSynthesizer';

let cachedMimeType: string | null = null;
function getSupportedMimeType(): string {
  if (cachedMimeType !== null) return cachedMimeType;
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) {
      cachedMimeType = t;
      return t;
    }
  }
  cachedMimeType = '';
  return '';
}

interface ImportedTrack {
  id: string;
  title: string;
  fileName: string;
  duration: number;
  url: string;
  addedAt: number;
}

const IMPORTED_MUSIC_STORAGE_KEY = 'vibestudio_imported_music_v1';

interface CameraStudioProps {
  onTakeRecorded: (take: ProjectTake) => void;
  onNavigateTab: (tab: StudioTab) => void;
  initialBeat?: BackingBeat;
  initialFilterId?: string;
}

export const CameraStudio: React.FC<CameraStudioProps> = ({
  onTakeRecorded,
  onNavigateTab,
  initialBeat = PRESET_BEATS[0],
  initialFilterId = 'normal'
}) => {
  // Camera & Stream State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 1. Camera Recording Quality Configuration (Target 1080p FHD)
  const [recordingQuality, setRecordingQuality] = useState<Resolution>('1080p');
  const [actualStreamResolution, setActualStreamResolution] = useState<{ width: number; height: number; fps: number }>({
    width: 1080,
    height: 1920,
    fps: 30
  });

  // Capture Mode & Responsive Zero-Latency Controls
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('video');
  const [timerSeconds, setTimerSeconds] = useState<number>(0); // 0 = Instant (Off), 3 = 3s, 10 = 10s
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);

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

  // Modals & Panels
  const [showChromaPanel, setShowChromaPanel] = useState<boolean>(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [showAudioPanel, setShowAudioPanel] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  // Filter State & In-Panel Sub-Navigation
  const [activeFilterId, setActiveFilterId] = useState<string>(initialFilterId);
  const [filterIntensity, setFilterIntensity] = useState<number>(0.75);
  const [fxCategoryFilter, setFxCategoryFilter] = useState<string>('all');
  const [fxPanelSubView, setFxPanelSubView] = useState<'list' | 'tune'>('list');

  // Backing Track & Custom Music State
  const [musicSourceType, setMusicSourceType] = useState<'beats' | 'custom'>('beats');
  const [selectedBeat, setSelectedBeat] = useState<BackingBeat>(initialBeat);
  const [importedTracks, setImportedTracks] = useState<ImportedTrack[]>([]);
  const [selectedCustomTrack, setSelectedCustomTrack] = useState<ImportedTrack | null>(null);
  const [customCueStart, setCustomCueStart] = useState<number>(0); // Starting playback position in seconds
  const [isMusicPreviewing, setIsMusicPreviewing] = useState<boolean>(false);
  const [musicPreviewCurrentTime, setMusicPreviewCurrentTime] = useState<number>(0);
  const [latencyOffsetMs, setLatencyOffsetMs] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const customAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const switchSeqRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2500);
  };

  // Sync initialFilterId when prop changes
  useEffect(() => {
    if (initialFilterId) {
      setActiveFilterId(initialFilterId);
    }
  }, [initialFilterId]);

  // Load saved custom music tracks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(IMPORTED_MUSIC_STORAGE_KEY);
      if (stored) {
        const parsed: ImportedTrack[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setImportedTracks(parsed);
        }
      }
    } catch {
      // Ignore storage read error
    }
  }, []);

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

  // Get Target Resolution Dimensions
  const getResolutionDimensions = useCallback((res: Resolution) => {
    switch (res) {
      case '1080p':
        return { width: 1080, height: 1920, bitrate: 10_000_000 };
      case '720p':
        return { width: 720, height: 1280, bitrate: 5_000_000 };
      case '480p':
      default:
        return { width: 480, height: 854, bitrate: 2_500_000 };
    }
  }, []);

  // Acquire camera video track using multi-tiered fallbacks
  const acquireCameraTrack = useCallback(async (
    targetFacing: 'user' | 'environment',
    targetRes: { width: number; height: number }
  ): Promise<MediaStreamTrack> => {
    // 5 Progressive constraint tiers ensuring universal Android & Desktop front/rear camera compatibility
    const constraintTiers: MediaTrackConstraints[] = [
      // Tier 1: Target quality resolution with ideal facingMode (no strict min limits!)
      {
        facingMode: { ideal: targetFacing },
        width: { ideal: targetRes.width },
        height: { ideal: targetRes.height },
        aspectRatio: { ideal: 9 / 16 },
        frameRate: { ideal: 30, max: 60 }
      },
      // Tier 2: Standard 720p ideal resolution
      {
        facingMode: { ideal: targetFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      // Tier 3: Ideal facingMode only
      {
        facingMode: { ideal: targetFacing }
      },
      // Tier 4: Direct facingMode constraint
      {
        facingMode: targetFacing
      },
      // Tier 5: Generic video capture (any available camera sensor)
      {}
    ];

    let lastError: unknown = null;
    for (const constraints of constraintTiers) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false
        });
        const track = stream.getVideoTracks()[0];
        if (track) {
          return track;
        }
      } catch (err) {
        lastError = err;
        // Proceed to next fallback tier
      }
    }

    throw lastError || new Error('No video track available');
  }, []);

  // Robust Camera Switcher: Seamless zero-latency video lens switch with audio preservation
  const switchCamera = useCallback(async (
    targetFacing: 'user' | 'environment',
    quality: Resolution
  ) => {
    if (isSwitchingCamera) return;
    if (isRecording) {
      showToast('Camera switch locked while recording');
      return;
    }

    const seq = ++switchSeqRef.current;
    setIsSwitchingCamera(true);

    // Front camera has no flash hardware; turn off torch
    if (targetFacing === 'user') {
      setTorchOn(false);
    }

    try {
      const targetRes = getResolutionDimensions(quality);
      const existingAudioTrack = streamRef.current?.getAudioTracks().find(t => t.readyState === 'live');

      // 1. Acquire new video track using tiered fallbacks
      const newVideoTrack = await acquireCameraTrack(targetFacing, targetRes);

      // Check if a newer switch request superseded this one
      if (seq !== switchSeqRef.current) {
        newVideoTrack.stop();
        return;
      }

      // 2. Ensure microphone audio track is available (preserve existing to avoid audio re-negotiation pause)
      let audioTrack = existingAudioTrack;
      if (!audioTrack) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 2,
              sampleRate: 48000
            }
          });
          audioTrack = audioStream.getAudioTracks()[0];
        } catch (audioErr) {
          console.warn('Microphone permission or stream note:', audioErr);
        }
      }

      // 3. Assemble new combined MediaStream
      const streamTracks: MediaStreamTrack[] = [newVideoTrack];
      if (audioTrack && audioTrack.readyState === 'live') {
        streamTracks.push(audioTrack);
      }
      const newStream = new MediaStream(streamTracks);

      // 4. Attach new stream to hidden video element & wait for decoded frame readiness
      const video = videoRef.current;
      if (video) {
        video.srcObject = newStream;
        await new Promise<void>((resolve) => {
          let resolved = false;
          const onReady = () => {
            if (!resolved) {
              resolved = true;
              video.removeEventListener('loadedmetadata', onReady);
              video.removeEventListener('canplay', onReady);
              resolve();
            }
          };

          if (video.readyState >= 2 && video.videoWidth > 0) {
            resolve();
          } else {
            video.addEventListener('loadedmetadata', onReady, { once: true });
            video.addEventListener('canplay', onReady, { once: true });
            setTimeout(onReady, 600); // 600ms safety timeout to avoid hanging
          }
        });
        await video.play().catch(() => {});
      }

      // 5. Seamless handoff: stop previous video track ONLY after new stream is active
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(oldTrack => {
          if (oldTrack !== newVideoTrack) oldTrack.stop();
        });
      }
      streamRef.current = newStream;

      // 6. Inspect real settings of the active sensor
      const settings = newVideoTrack.getSettings();
      setActualStreamResolution({
        width: settings.width || targetRes.width,
        height: settings.height || targetRes.height,
        fps: Math.round(settings.frameRate || 30)
      });

      // 7. Apply hardware enhancements where supported
      if (typeof newVideoTrack.getCapabilities === 'function') {
        const caps = (newVideoTrack.getCapabilities() as Record<string, unknown>) || {};
        const advancedConstraint: Record<string, unknown> = {};

        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          advancedConstraint.focusMode = 'continuous';
        }
        if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
          advancedConstraint.exposureMode = 'continuous';
        }
        if (Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
          advancedConstraint.whiteBalanceMode = 'continuous';
        }
        if (caps.imageStabilization) {
          advancedConstraint.imageStabilization = true;
        }

        if (Object.keys(advancedConstraint).length > 0) {
          newVideoTrack.applyConstraints({
            advanced: [advancedConstraint as MediaTrackConstraintSet]
          }).catch(() => {});
        }
      }

      setFacingMode(targetFacing);
      setIsSimulatedCamera(false);
      setPermissionError(null);
      showToast(targetFacing === 'user' ? 'Front Selfie Lens' : 'Rear Ultra Studio Lens');
    } catch (err: unknown) {
      console.warn('Physical camera unavailable or switch error:', err);
      // Fallback: If no live video stream exists at all, activate simulated studio feed
      const hasLiveStream = streamRef.current && streamRef.current.getVideoTracks().some(t => t.readyState === 'live');
      if (!hasLiveStream) {
        setIsSimulatedCamera(true);
        setPermissionError('Camera unavailable or permission denied. Simulated studio feed active.');
      } else {
        showToast('Lens switch failed. Active camera preserved.');
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  }, [acquireCameraTrack, getResolutionDimensions, isRecording, isSwitchingCamera]);

  // Initial camera startup on component mount; cleanup only on unmount
  useEffect(() => {
    switchCamera('user', recordingQuality);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      beatSynthesizer.stop();
      if (customAudioPlayerRef.current) {
        customAudioPlayerRef.current.pause();
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (simAnimFrameRef.current) cancelAnimationFrame(simAnimFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic Camera Recording Resolution Adjustment without stream recreation
  const handleChangeQuality = useCallback((quality: Resolution) => {
    setRecordingQuality(quality);
    setShowQualityMenu(false);
    showToast(`Quality set to ${quality}`);

    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      const dims = getResolutionDimensions(quality);
      videoTrack.applyConstraints({
        width: { ideal: dims.width },
        height: { ideal: dims.height }
      }).then(() => {
        const s = videoTrack.getSettings();
        setActualStreamResolution({
          width: s.width || dims.width,
          height: s.height || dims.height,
          fps: Math.round(s.frameRate || 30)
        });
      }).catch(() => {
        // If applyConstraints fails on device, cleanly refresh camera lens
        switchCamera(facingMode, quality);
      });
    }
  }, [facingMode, getResolutionDimensions, switchCamera]);

  // High-Resolution Simulated Camera Canvas Animation
  useEffect(() => {
    if (!isSimulatedCamera) return;

    const simCanvas = simulatedCanvasRef.current;
    if (!simCanvas) return;
    const ctx = simCanvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    const renderSim = () => {
      angle += 0.035;
      const w = simCanvas.width;
      const h = simCanvas.height;

      // Studio Green background
      ctx.fillStyle = chromaSettings.keyColor || '#00ff00';
      ctx.fillRect(0, 0, w, h);

      // Draw simulated performer silhouette
      ctx.save();
      const centerX = w / 2 + Math.sin(angle * 1.5) * 35;
      const centerY = h * 0.58 + Math.cos(angle * 2) * 12;

      // Body & Hoodie
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 180, 220, 320, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 140, 100, 0, Math.PI * 2);
      ctx.fill();

      // Cap
      ctx.fillStyle = '#9333ea';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 170, 108, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 130, centerY - 175, 260, 28);

      // Microphone in hand
      const micX = centerX + 110 + Math.sin(angle * 2) * 15;
      const micY = centerY - 20 + Math.cos(angle * 1.8) * 20;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(micX - 10, micY, 20, 90);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(micX, micY - 8, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      simAnimFrameRef.current = requestAnimationFrame(renderSim);
    };

    simAnimFrameRef.current = requestAnimationFrame(renderSim);
    return () => {
      if (simAnimFrameRef.current) cancelAnimationFrame(simAnimFrameRef.current);
    };
  }, [isSimulatedCamera, chromaSettings.keyColor]);

  // Main Render Loop: Feeds Video/Simulated Canvas into WebGL Chroma Key Pipeline
  useEffect(() => {
    const loop = () => {
      const source = isSimulatedCamera ? simulatedCanvasRef.current : videoRef.current;
      if (source && canvasRef.current && engineRef.current) {
        const isMirrored = facingMode === 'user' && !isSimulatedCamera;
        if (source instanceof HTMLVideoElement) {
          if (source.readyState >= 2 && source.videoWidth > 0) {
            engineRef.current.render(source, chromaSettings, activeFilterId, filterIntensity, isMirrored);
          }
        } else if (source instanceof HTMLCanvasElement) {
          engineRef.current.render(source, chromaSettings, activeFilterId, filterIntensity, false);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chromaSettings, activeFilterId, filterIntensity, isSimulatedCamera, facingMode]);

  // Toggle Camera Front / Back with race-condition protection and instant responsive state
  const handleToggleCamera = useCallback(() => {
    if (isSwitchingCamera) return;
    if (isRecording) {
      showToast('Camera switch locked while recording');
      return;
    }
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    switchCamera(nextFacing, recordingQuality);
  }, [facingMode, isRecording, isSwitchingCamera, recordingQuality, switchCamera]);

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
          showToast('Flashlight not supported on this lens');
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
    showToast(`Key color set: ${hex.toUpperCase()}`);
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
      showToast('Custom backdrop loaded');
    }
  };

  // 2. Custom Music Import Handler (MP3, WAV, M4A, AAC, OGG)
  const handleImportMusicFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate audio file
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
      showToast('Please select a valid audio file (MP3, WAV, M4A, AAC)');
      return;
    }

    try {
      const audioUrl = URL.createObjectURL(file);
      const testAudio = new Audio(audioUrl);

      testAudio.onloadedmetadata = () => {
        const duration = Math.round(testAudio.duration || 60);
        const newTrack: ImportedTrack = {
          id: 'music_' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          duration,
          url: audioUrl,
          addedAt: Date.now()
        };

        const updated = [newTrack, ...importedTracks.filter(t => t.fileName !== file.name)];
        setImportedTracks(updated);
        setSelectedCustomTrack(newTrack);
        setCustomCueStart(0);
        setMusicSourceType('custom');

        try {
          // Store track metadata in localStorage
          localStorage.setItem(IMPORTED_MUSIC_STORAGE_KEY, JSON.stringify(updated.slice(0, 10)));
        } catch {
          // Ignore storage quota
        }

        showToast(`Imported: ${newTrack.title}`);
      };

      testAudio.onerror = () => {
        showToast('Could not decode audio file. Try another format.');
      };
    } catch {
      showToast('Error reading audio file.');
    }

    // Reset input
    if (musicFileInputRef.current) {
      musicFileInputRef.current.value = '';
    }
  };

  // Music Preview Toggle
  const handleToggleMusicPreview = () => {
    if (musicSourceType === 'beats') {
      if (isMusicPreviewing) {
        beatSynthesizer.stop();
        setIsMusicPreviewing(false);
      } else {
        beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
        setIsMusicPreviewing(true);
      }
    } else if (selectedCustomTrack && customAudioPlayerRef.current) {
      const player = customAudioPlayerRef.current;
      if (isMusicPreviewing) {
        player.pause();
        setIsMusicPreviewing(false);
      } else {
        player.currentTime = customCueStart;
        player.play().catch(() => {});
        setIsMusicPreviewing(true);
      }
    }
  };

  // Remove imported custom track
  const handleRemoveCustomTrack = (trackId: string) => {
    const remaining = importedTracks.filter(t => t.id !== trackId);
    setImportedTracks(remaining);
    try {
      localStorage.setItem(IMPORTED_MUSIC_STORAGE_KEY, JSON.stringify(remaining));
    } catch {}

    if (selectedCustomTrack?.id === trackId) {
      if (remaining.length > 0) {
        setSelectedCustomTrack(remaining[0]);
      } else {
        setSelectedCustomTrack(null);
        setMusicSourceType('beats');
      }
    }
    showToast('Track removed');
  };

  // Instant Responsive Timer & Shutter Control
  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  const startWithTimerOrImmediate = (action: () => void) => {
    if (timerSeconds === 0) {
      // ZERO LATENCY: Execute immediately on current tick
      action();
      return;
    }

    cancelCountdown();
    setCountdown(timerSeconds);
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          action();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Instant Photo Capture (0ms latency, instant shutter flash animation, immediate gallery sync)
  const captureInstantPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Instant tactile feedback: 80ms screen flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 80);

    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            showToast('Capture error');
            return;
          }
          const photoUrl = URL.createObjectURL(blob);
          const takeNum = recordedTakes.length + 1;
          const isCustom = musicSourceType === 'custom' && !!selectedCustomTrack;

          const photoTake: ProjectTake = {
            id: 'photo_' + Date.now(),
            takeNumber: takeNum,
            title: `Photo ${takeNum} (${activeFilterId !== 'normal' ? 'FX' : 'Studio'})`,
            createdAt: Date.now(),
            videoUrl: photoUrl,
            thumbnailUrl: photoUrl,
            duration: 3, // Standard 3-second display duration when added to video timeline
            beatId: isCustom ? selectedCustomTrack?.id : selectedBeat.id,
            beatName: isCustom ? selectedCustomTrack?.title : selectedBeat.title,
            isCustomMusic: isCustom,
            latencyOffsetMs: 0,
            chromaSettings: { ...chromaSettings },
            filterId: activeFilterId
          };

          setRecordedTakes(prev => [photoTake, ...prev]);
          onTakeRecorded(photoTake);
          showToast('Photo captured!');
        },
        'image/jpeg',
        0.95
      );
    } catch {
      try {
        const photoUrl = canvas.toDataURL('image/jpeg', 0.95);
        const takeNum = recordedTakes.length + 1;
        const photoTake: ProjectTake = {
          id: 'photo_' + Date.now(),
          takeNumber: takeNum,
          title: `Photo ${takeNum}`,
          createdAt: Date.now(),
          videoUrl: photoUrl,
          thumbnailUrl: photoUrl,
          duration: 3,
          latencyOffsetMs: 0,
          chromaSettings: { ...chromaSettings },
          filterId: activeFilterId
        };
        setRecordedTakes(prev => [photoTake, ...prev]);
        onTakeRecorded(photoTake);
        showToast('Photo captured!');
      } catch {
        showToast('Capture error');
      }
    }
  };

  // Immediate Video Recording (0ms latency with synchronized music & hardware tracks)
  const startActualRecording = () => {
    if (!canvasRef.current || isRecording) return;

    // Trigger visual flash confirmation
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 80);

    // Synchronously update recording state immediately for instant button reaction
    setIsRecording(true);
    setIsPaused(false);
    setRecordSeconds(0);

    // Start music playback synchronously
    if (musicSourceType === 'beats') {
      beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
    } else if (selectedCustomTrack && customAudioPlayerRef.current) {
      const player = customAudioPlayerRef.current;
      player.currentTime = customCueStart;
      player.play().catch(() => {});
    }

    // Capture canvas stream at optimal framerate
    const targetFps = actualStreamResolution.fps || 30;
    const canvasStream = canvasRef.current.captureStream(targetFps);
    const tracks = [...canvasStream.getVideoTracks()];

    // Add microphone audio track from hardware stream
    if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
      tracks.push(streamRef.current.getAudioTracks()[0]);
    }

    const recordStream = new MediaStream(tracks);
    recordedChunksRef.current = [];

    // Pre-cached optimal mimeType
    const mimeType = getSupportedMimeType();
    const qualityConfig = getResolutionDimensions(recordingQuality);

    try {
      const recorder = mimeType
        ? new MediaRecorder(recordStream, {
            mimeType,
            videoBitsPerSecond: qualityConfig.bitrate,
            audioBitsPerSecond: 192_000
          })
        : new MediaRecorder(recordStream, {
            videoBitsPerSecond: qualityConfig.bitrate,
            audioBitsPerSecond: 192_000
          });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const takeNum = recordedTakes.length + 1;

        const isCustom = musicSourceType === 'custom' && !!selectedCustomTrack;
        const newTake: ProjectTake = {
          id: 'take_' + Date.now(),
          takeNumber: takeNum,
          title: `Take ${takeNum} (${isCustom ? selectedCustomTrack?.title : selectedBeat.title})`,
          createdAt: Date.now(),
          videoUrl,
          duration: recordSeconds,
          beatId: isCustom ? selectedCustomTrack?.id : selectedBeat.id,
          beatName: isCustom ? selectedCustomTrack?.title : selectedBeat.title,
          beatAudioUrl: isCustom ? selectedCustomTrack?.url : undefined,
          beatStartTime: isCustom ? customCueStart : 0,
          isCustomMusic: isCustom,
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

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      setIsRecording(false);
      showToast('Recording error. Try reducing resolution to 720p.');
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (musicSourceType === 'beats') {
        beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
      } else if (customAudioPlayerRef.current) {
        customAudioPlayerRef.current.play().catch(() => {});
      }
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      beatSynthesizer.stop();
      if (customAudioPlayerRef.current) {
        customAudioPlayerRef.current.pause();
      }
    }
  };

  // Immediate Stop (0ms UI latency)
  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    // Immediate UI feedback on current frame
    setIsRecording(false);
    setIsPaused(false);

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    beatSynthesizer.stop();
    if (customAudioPlayerRef.current) {
      customAudioPlayerRef.current.pause();
    }
    setIsMusicPreviewing(false);

    try {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.warn('Error stopping MediaRecorder:', err);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dimensions for canvas
  const canvasDims = getResolutionDimensions(recordingQuality);

  return (
    <div className="relative w-full h-full flex-1 min-h-0 bg-black overflow-hidden flex flex-col select-none">
      {/* Hidden audio player for custom music playback */}
      {selectedCustomTrack && (
        <audio
          ref={customAudioPlayerRef}
          src={selectedCustomTrack.url}
          onTimeUpdate={() => {
            if (customAudioPlayerRef.current) {
              setMusicPreviewCurrentTime(customAudioPlayerRef.current.currentTime);
            }
          }}
          onEnded={() => setIsMusicPreviewing(false)}
          className="hidden"
        />
      )}

      {/* Hidden file input for music picker */}
      <input
        ref={musicFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        onChange={handleImportMusicFile}
        className="hidden"
      />

      {/* Hidden raw video & fallback simulated canvas (off-screen layout ensures Chromium frame decoder stays active) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={simulatedCanvasRef}
        width={canvasDims.width}
        height={canvasDims.height}
        className="hidden"
      />

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewfinder Canvas (WebGL Composited Stream at Target Quality) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasDims.width}
          height={canvasDims.height}
          onClick={handleCanvasClick}
          className={`max-h-full max-w-full aspect-[9/16] object-contain shadow-2xl transition-all ${
            isEyedropperActive ? 'cursor-crosshair ring-2 ring-cyan-400' : ''
          } ${isRecording ? 'ring-2 ring-red-500 shadow-red-900/40' : ''}`}
          style={{
            transform: `scale(${zoomLevel})`
          }}
        />

        {/* Instant Shutter Flash effect (80ms tactile visual response) */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-75 z-50 ${
            isShutterFlashing ? 'opacity-70' : 'opacity-0'
          }`}
        />

        {/* Eyedropper indicator tooltip */}
        {isEyedropperActive && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-bounce z-30">
            <Pipette className="w-4 h-4 text-cyan-400" />
            <span>Tap anywhere on video to sample key color</span>
          </div>
        )}

        {/* 3-2-1 Countdown Overlay with tap-to-cancel */}
        {countdown !== null && (
          <div
            onClick={cancelCountdown}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-pulse cursor-pointer"
          >
            <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 via-pink-400 to-cyan-300 drop-shadow-[0_0_40px_rgba(168,85,247,0.8)]">
              {countdown}
            </span>
            <span className="text-xs text-slate-300 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 mt-4 shadow-lg">
              Tap anywhere to cancel timer
            </span>
          </div>
        )}

        {/* Top Viewfinder Floating HUD */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-40 pointer-events-none pt-safe">
          {/* Status info & Quality pill */}
          <div className="pointer-events-auto flex items-center gap-2">
            {isRecording ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-bold tracking-wider shadow-lg shadow-red-600/30">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>REC {formatTimer(recordSeconds)}</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 text-xs font-medium backdrop-blur-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Select Camera Recording Quality"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">{recordingQuality}</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {actualStreamResolution.fps}fps
                  </span>
                </button>

                {/* Quality Switcher Dropdown */}
                {showQualityMenu && (
                  <div className="absolute top-9 left-0 w-44 bg-slate-950/95 border border-slate-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl z-50">
                    <div className="text-[10px] text-slate-400 px-2 py-1 uppercase font-mono font-bold">
                      Capture Resolution
                    </div>
                    {(['1080p', '720p', '480p'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => handleChangeQuality(res)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          recordingQuality === res
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{res === '1080p' ? '1080p Full HD' : res === '720p' ? '720p HD' : '480p SD'}</span>
                        {recordingQuality === res && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Music Badge */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-cyan-300 text-[11px] backdrop-blur-md max-w-[150px] truncate">
              <Music className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">
                {musicSourceType === 'custom' && selectedCustomTrack
                  ? selectedCustomTrack.title
                  : selectedBeat.title}
              </span>
            </div>
          </div>

          {/* Quick controls on top right */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            {/* Self-Timer Toggle: 0s (Instant) / 3s / 10s */}
            <button
              onClick={() => {
                const next = timerSeconds === 0 ? 3 : timerSeconds === 3 ? 10 : 0;
                setTimerSeconds(next);
                showToast(next === 0 ? 'Timer: Off (Instant Capture)' : `Timer: ${next}s`);
              }}
              className={`min-h-[40px] px-2.5 rounded-full p-2 backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                timerSeconds > 0
                  ? 'bg-purple-600 text-white border-purple-400 font-bold'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:text-white'
              }`}
              title={`Timer: ${timerSeconds === 0 ? 'Off (Instant Capture)' : timerSeconds + 's'}`}
            >
              <Timer className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold">
                {timerSeconds === 0 ? 'Off' : `${timerSeconds}s`}
              </span>
            </button>

            {/* Flash / Torch */}
            <button
              onClick={handleToggleTorch}
              className={`min-h-[40px] min-w-[40px] rounded-full p-2 backdrop-blur-md border transition-all cursor-pointer flex items-center justify-center ${
                torchOn ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:text-white'
              }`}
              title="Torch / Flash"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* Flip camera with Android-style responsive feedback and active rotation */}
            <button
              onClick={handleToggleCamera}
              disabled={isSwitchingCamera || isRecording}
              className={`min-h-[40px] min-w-[40px] rounded-full p-2 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center ${
                isSwitchingCamera
                  ? 'opacity-80 text-purple-400 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'text-slate-300 hover:text-white active:scale-95'
              } ${isRecording ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={
                isRecording
                  ? 'Camera switch locked while recording'
                  : isSwitchingCamera
                  ? 'Switching camera lens...'
                  : `Switch to ${facingMode === 'user' ? 'Rear Ultra' : 'Front Selfie'} Camera`
              }
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${isSwitchingCamera ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right Action Rail (Snapchat-style floating tools) */}
        <div className="absolute right-3 top-16 bottom-32 flex flex-col items-center justify-center gap-2.5 z-20">
          {/* Chroma Key Panel Toggle */}
          <button
            onClick={() => {
              setShowChromaPanel(!showChromaPanel);
              setShowFiltersPanel(false);
              setShowAudioPanel(false);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-2.5 flex flex-col items-center justify-center gap-0.5 backdrop-blur-md border transition-all cursor-pointer ${
              chromaSettings.enabled || showChromaPanel
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40'
                : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Chroma Key Studio"
          >
            <Layers className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Key</span>
          </button>

          {/* Live Filters Toggle */}
          <button
            onClick={() => {
              setShowFiltersPanel(!showFiltersPanel);
              setShowChromaPanel(false);
              setShowAudioPanel(false);
              setFxPanelSubView('list');
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-2.5 flex flex-col items-center justify-center gap-0.5 backdrop-blur-md border transition-all cursor-pointer ${
              activeFilterId !== 'normal' || showFiltersPanel
                ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-600/40'
                : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Artist Visual Filters"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[9px] font-semibold">FX</span>
          </button>

          {/* Music / Beat Toggle */}
          <button
            onClick={() => {
              setShowAudioPanel(!showAudioPanel);
              setShowChromaPanel(false);
              setShowFiltersPanel(false);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full p-2.5 flex flex-col items-center justify-center gap-0.5 backdrop-blur-md border transition-all cursor-pointer ${
              isMusicPreviewing || showAudioPanel
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/40'
                : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white'
            }`}
            title="Backing Music & Custom Audio"
          >
            <Music className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Music</span>
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

        {/* 4. Sliding Contextual Panel: CHROMA KEY (With Clear Top-Left Back Button) */}
        {showChromaPanel && (
          <div className="absolute left-3 right-3 sm:left-auto sm:right-16 sm:w-96 top-16 sm:top-18 bottom-28 sm:bottom-32 bg-slate-950/95 border border-purple-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 flex flex-col overflow-hidden">
            {/* Header with Top-Left Back Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <button
                onClick={() => setShowChromaPanel(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                title="Return to Camera"
              >
                <ArrowLeft className="w-4 h-4 text-purple-400" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Chroma Key Studio</span>
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

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 pt-3 text-xs">
              {/* Color Selection & Eyedropper */}
              <div>
                <label className="text-slate-400 font-medium block mb-1.5">Key Screen Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CHROMA_COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setChromaSettings(prev => ({ ...prev, keyColor: color.hex, enabled: true }))}
                      className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                        chromaSettings.keyColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-purple-400 bg-purple-950/70 text-white font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                    </button>
                  ))}

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
                  className="w-full accent-purple-500 cursor-pointer"
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
                  className="w-full accent-purple-500 cursor-pointer"
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
                  className="w-full accent-purple-500 cursor-pointer"
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
                        className={`group relative h-16 rounded-xl overflow-hidden border text-left cursor-pointer transition-all ${
                          isSelected ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={bg.src}
                          alt={bg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 flex flex-col justify-end">
                          <span className="text-[10px] font-bold text-white truncate">{bg.name}</span>
                          <span className="text-[8px] text-slate-300 truncate">{bg.genre}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-purple-600 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
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

        {/* 5. Sliding Contextual Panel: LIVE ARTIST FILTERS (With Top-Left Back Navigation & Parameter Sub-View) */}
        {showFiltersPanel && (
          <div className="absolute left-3 right-3 sm:left-auto sm:right-16 sm:w-92 top-16 sm:top-18 bottom-28 sm:bottom-32 bg-slate-950/95 border border-pink-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 flex flex-col overflow-hidden">
            {/* Header with Top-Left Back Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              {fxPanelSubView === 'tune' ? (
                <button
                  onClick={() => setFxPanelSubView('list')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  title="Return to FX List"
                >
                  <ArrowLeft className="w-4 h-4 text-pink-400" />
                  <span>Back to Filters</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowFiltersPanel(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  title="Return to Camera"
                >
                  <ArrowLeft className="w-4 h-4 text-pink-400" />
                  <span>Back to Camera</span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs font-bold text-white">
                  {fxPanelSubView === 'tune' ? 'Effect Fine-Tuning' : 'Artist Visual Filters'}
                </span>
              </div>

              <button
                onClick={() => {
                  setActiveFilterId('normal');
                  showToast('Reset to Raw Studio');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {/* Sub-View: TUNE / INTENSITY PARAMETERS */}
            {fxPanelSubView === 'tune' ? (
              <div className="space-y-4 pt-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">
                      {ARTIST_FILTERS.find(f => f.id === activeFilterId)?.name || 'Custom Effect'}
                    </span>
                    <span className="font-mono text-pink-300 text-xs">
                      {Math.round(filterIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={filterIntensity}
                    onChange={(e) => setFilterIntensity(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer mt-1"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>Subtle</span>
                    <span>Standard</span>
                    <span>Max Boost</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onNavigateTab('effects');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Full FX Matrix</span>
                    <ChevronRight className="w-3.5 h-3.5 text-pink-400" />
                  </button>

                  <button
                    onClick={() => {
                      setFxPanelSubView('list');
                      setShowFiltersPanel(false);
                      showToast('Effect applied');
                    }}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Sub-View: FILTER LIST & CATEGORIES */
              <div className="space-y-3 pt-3 text-xs">
                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {['all', 'trap', 'hiphop', 'glitch', 'retro', 'cinematic', 'reggaeton', 'pop', 'rock'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFxCategoryFilter(cat)}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        fxCategoryFilter === cat
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Filter List */}
                <div className="grid grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto">
                  {ARTIST_FILTERS.filter(f => fxCategoryFilter === 'all' || f.category === fxCategoryFilter).map((f) => {
                    const isSelected = activeFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveFilterId(f.id);
                          setFxPanelSubView('tune');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-pink-500 bg-pink-950/50 text-white ring-1 ring-pink-500'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold truncate">{f.name}</span>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.accentColor }} />
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                          {f.category}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* 6. Sliding Contextual Panel: BACKING BEATS & CUSTOM MUSIC IMPORT (With Top-Left Back Navigation) */}
        {showAudioPanel && (
          <div className="absolute left-3 right-3 sm:left-auto sm:right-16 sm:w-96 top-16 sm:top-18 bottom-28 sm:bottom-32 bg-slate-950/95 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 flex flex-col overflow-hidden">
            {/* Header with Top-Left Back Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <button
                onClick={() => setShowAudioPanel(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                title="Return to Camera"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-white">Backing Track & Music</span>
              </div>

              {/* Preview Button */}
              <button
                onClick={handleToggleMusicPreview}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  isMusicPreviewing
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {isMusicPreviewing ? 'Stop' : 'Preview'}
              </button>
            </div>

            {/* Music Tabs: Built-in Beats vs My Music Import */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl my-3 text-xs font-semibold shrink-0">
              <button
                onClick={() => {
                  setMusicSourceType('beats');
                  if (isMusicPreviewing) {
                    customAudioPlayerRef.current?.pause();
                    setIsMusicPreviewing(false);
                  }
                }}
                className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                  musicSourceType === 'beats'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Beats Library ({PRESET_BEATS.length})
              </button>

              <button
                onClick={() => {
                  setMusicSourceType('custom');
                  if (isMusicPreviewing) {
                    beatSynthesizer.stop();
                    setIsMusicPreviewing(false);
                  }
                }}
                className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                  musicSourceType === 'custom'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Music ({importedTracks.length})
              </button>
            </div>

            {/* Scrollable Body: Tabs Content & Latency Offset */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              {/* TAB A: BUILT-IN BEATS */}
            {musicSourceType === 'beats' && (
              <div className="space-y-2 text-xs">
                {PRESET_BEATS.map((beat) => {
                  const isCurrent = selectedBeat.id === beat.id;
                  return (
                    <button
                      key={beat.id}
                      onClick={() => {
                        setSelectedBeat(beat);
                        if (isMusicPreviewing) {
                          beatSynthesizer.start(beat.synthStyle, beat.bpm);
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-cyan-400 bg-cyan-950/50 text-white ring-1 ring-cyan-400'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-white">{beat.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {beat.genre} · {beat.bpm} BPM · {beat.key}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          SELECTED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB B: MY MUSIC & IMPORT */}
            {musicSourceType === 'custom' && (
              <div className="space-y-3 text-xs">
                {/* System File Picker Trigger */}
                <button
                  onClick={() => musicFileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>+ Import Music (MP3, WAV, M4A, AAC)</span>
                </button>

                {/* Selected Custom Track Controls (Cue point & Seek) */}
                {selectedCustomTrack ? (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-white text-xs truncate">
                          {selectedCustomTrack.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Duration: {formatTimecode(selectedCustomTrack.duration)}
                        </div>
                      </div>
                      <span className="text-[10px] text-cyan-300 font-mono font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800 shrink-0">
                        ACTIVE
                      </span>
                    </div>

                    {/* Cue Point Starting Offset Slider */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-300">Start Recording At (Cue Drop):</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {formatTimecode(customCueStart)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, selectedCustomTrack.duration - 5)}
                        step="1"
                        value={customCueStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCustomCueStart(val);
                          if (customAudioPlayerRef.current) {
                            customAudioPlayerRef.current.currentTime = val;
                          }
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                        <span>00:00</span>
                        <span>{formatTimecode(selectedCustomTrack.duration)}</span>
                      </div>
                    </div>

                    {/* Replace / Remove */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => musicFileInputRef.current?.click()}
                        className="text-[11px] text-slate-400 hover:text-cyan-300 cursor-pointer"
                      >
                        Replace file...
                      </button>
                      <button
                        onClick={() => handleRemoveCustomTrack(selectedCustomTrack.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400">
                    <Disc className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs">No personal music tracks imported yet.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Tap the button above to import your MP3 or backing song from your device.
                    </p>
                  </div>
                )}

                {/* Recently Used Tracks List */}
                {importedTracks.length > 1 && (
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1.5">
                      Recently Imported Tracks
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {importedTracks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedCustomTrack(t);
                            setCustomCueStart(0);
                            showToast(`Selected: ${t.title}`);
                          }}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                            selectedCustomTrack?.id === t.id
                              ? 'border-cyan-400 bg-cyan-950/40 text-white'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-xs truncate">{t.title}</div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              {formatTimecode(t.duration)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomTrack(t.id);
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer shrink-0"
                            title="Delete track"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vocal Latency Compensation */}
            <div className="pt-3 mt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Vocal Latency Offset</span>
                <span className="font-mono text-cyan-300">{latencyOffsetMs} ms</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={latencyOffsetMs}
                onChange={(e) => setLatencyOffsetMs(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Tip: Plug in wired or low-latency headphones to hear the music while recording without microphone bleed.
              </p>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Recording Controls Deck */}
      <div className="bg-[#0a0a12]/95 border-t border-slate-800/80 px-4 py-2.5 flex flex-col justify-center shrink-0 z-20 pb-safe">
        {/* Mode Switcher: PHOTO vs VIDEO */}
        {!isRecording && (
          <div className="flex items-center justify-center gap-6 pb-2 select-none">
            <button
              onClick={() => {
                setCameraMode('photo');
                showToast('Photo Mode: Instant Capture');
              }}
              className={`text-xs font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-3 rounded-full ${
                cameraMode === 'photo'
                  ? 'text-yellow-400 bg-yellow-400/10 ring-1 ring-yellow-400/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => {
                setCameraMode('video');
                showToast('Video Mode: Instant Recording');
              }}
              className={`text-xs font-bold uppercase tracking-wider transition-all cursor-pointer py-1 px-3 rounded-full ${
                cameraMode === 'video'
                  ? 'text-yellow-400 bg-yellow-400/10 ring-1 ring-yellow-400/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Video
            </button>
          </div>
        )}

        {/* Shutter Deck Main Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Takes preview thumbnail */}
          <div className="w-20">
            {recordedTakes.length > 0 ? (
              <button
                onClick={() => setActiveTakePreview(recordedTakes[0])}
                className="relative w-12 h-14 rounded-lg overflow-hidden border border-purple-500/60 group cursor-pointer shadow-lg active:scale-95 transition-transform"
                title="Preview latest capture"
              >
                {recordedTakes[0].id.startsWith('photo_') ? (
                  <img
                    src={recordedTakes[0].thumbnailUrl || recordedTakes[0].videoUrl}
                    alt="Latest capture"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={recordedTakes[0].videoUrl}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white bg-black/70 px-1 rounded">
                    {recordedTakes.length}
                  </span>
                </div>
              </button>
            ) : (
              <div className="text-[11px] text-slate-500 font-medium">0 Captures</div>
            )}
          </div>

          {/* Center: Tactile Shutter Recording / Photo Button */}
          <div className="flex items-center gap-3">
            {isRecording && (
              <>
                {/* Instant Still Snapshot button while recording video */}
                <button
                  onClick={captureInstantPhoto}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-white/60 transition-all active:scale-90 cursor-pointer shadow-md"
                  title="Snap photo while recording"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>

                {/* Pause/Resume */}
                <button
                  onClick={handlePauseResume}
                  className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-600 transition-all active:scale-90 cursor-pointer"
                  title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                >
                  {isPaused ? <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-5 h-5 text-amber-400 fill-amber-400" />}
                </button>
              </>
            )}

            {cameraMode === 'photo' ? (
              /* PHOTO SHUTTER BUTTON: Instant tactile photo snap */
              <button
                onClick={() => {
                  if (countdown !== null) {
                    cancelCountdown();
                  } else {
                    startWithTimerOrImmediate(captureInstantPhoto);
                  }
                }}
                className="relative min-h-[68px] min-w-[68px] rounded-full border-4 border-white flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-90 bg-white/10 hover:bg-white/20"
                title="Take Photo Immediately"
              >
                <div className="w-13 h-13 rounded-full bg-white shadow-inner" />
              </button>
            ) : (
              /* VIDEO SHUTTER BUTTON: Instant start / stop */
              <button
                onClick={() => {
                  if (isRecording) {
                    handleStopRecording();
                  } else if (countdown !== null) {
                    cancelCountdown();
                  } else {
                    startWithTimerOrImmediate(startActualRecording);
                  }
                }}
                className={`relative min-h-[68px] min-w-[68px] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-90 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 ring-8 ring-red-600/30 scale-105'
                    : 'bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 hover:scale-105 ring-4 ring-purple-500/20'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording Immediately'}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white fill-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white shadow-inner" />
                )}
              </button>
            )}
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
      </div>

      {/* Recorded Take Preview Modal (Photos and Videos) */}
      {activeTakePreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h4 className="text-base font-bold text-white mb-2">{activeTakePreview.title}</h4>
            <div className="w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-inner mb-4 relative flex items-center justify-center">
              {activeTakePreview.id.startsWith('photo_') ? (
                <img
                  src={activeTakePreview.thumbnailUrl || activeTakePreview.videoUrl}
                  alt={activeTakePreview.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={activeTakePreview.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
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
                {activeTakePreview.id.startsWith('photo_') ? 'Add to Timeline' : 'Edit in Timeline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
