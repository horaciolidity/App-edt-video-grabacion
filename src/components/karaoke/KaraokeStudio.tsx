import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Mic2,
  Volume2,
  Sliders,
  Headphones,
  Upload,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  Music,
  Plus
} from 'lucide-react';
import { BackingBeat, ProjectTake, StudioTab } from '../../types';
import { PRESET_BEATS } from '../../constants/presets';
import { beatSynthesizer } from '../../services/beatSynthesizer';

interface KaraokeStudioProps {
  onTakeRecorded: (take: ProjectTake) => void;
  onNavigateTab: (tab: StudioTab) => void;
}

export const KaraokeStudio: React.FC<KaraokeStudioProps> = ({
  onTakeRecorded,
  onNavigateTab
}) => {
  const [selectedBeat, setSelectedBeat] = useState<BackingBeat>(PRESET_BEATS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecordingVocal, setIsRecordingVocal] = useState<boolean>(false);
  const [beatVolume, setBeatVolume] = useState<number>(0.85);
  const [vocalVolume, setVocalVolume] = useState<number>(1.0);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [recordedVocalTakes, setRecordedVocalTakes] = useState<{ id: string; url: string; duration: number }[]>([]);

  // Teleprompter / Lyrics State
  const [lyrics, setLyrics] = useState<string>(
    `[Verse 1]\nStep in the booth, bass heavy in the chest\nVibeStudio running, we never settle for less\nNeon in the lenses, green screen transparent\nIndependent hustle, the legacy is apparent\n\n[Chorus]\n808 shaking the city tonight\nAll my takes synced under neon light\nFrom the phone to the stage, no delay\nWe making classics day by day.`
  );
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const lyricsRef = useRef<HTMLTextAreaElement | null>(null);

  // Audio recording refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Waveform canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    beatSynthesizer.setOnBeat((s) => {
      setCurrentStep(s);
    });

    return () => {
      beatSynthesizer.stop();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Visualizer Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWave = () => {
      const analyser = beatSynthesizer.getAnalyser();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (canvas.width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#a855f7');
          gradient.addColorStop(1, '#06b6d4');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      } else {
        // Flat line idle state
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    animFrameRef.current = requestAnimationFrame(renderWave);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const togglePlayback = () => {
    if (isPlaying) {
      beatSynthesizer.stop();
      setIsPlaying(false);
    } else {
      beatSynthesizer.setVolume(beatVolume);
      beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
      setIsPlaying(true);
    }
  };

  const handleCustomBeatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const custom: BackingBeat = {
        id: 'custom_' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Imported Audio',
        genre: 'Custom',
        bpm: 120,
        key: 'Custom',
        duration: 180,
        synthStyle: 'trap808',
        audioUrl: url
      };
      setSelectedBeat(custom);
    }
  };

  const handleStartVocalRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      // Start beat in sync
      beatSynthesizer.start(selectedBeat.synthStyle, selectedBeat.bpm);
      setIsPlaying(true);

      recordedChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const startTime = Date.now();
      rec.onstop = () => {
        const duration = (Date.now() - startTime) / 1000;
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const vocalUrl = URL.createObjectURL(blob);

        const newTake: ProjectTake = {
          id: 'vocal_take_' + Date.now(),
          takeNumber: recordedVocalTakes.length + 1,
          title: `Vocal Take ${recordedVocalTakes.length + 1}`,
          createdAt: Date.now(),
          videoUrl: '', // Pure vocal audio take
          vocalAudioUrl: vocalUrl,
          duration,
          beatId: selectedBeat.id,
          beatName: selectedBeat.title,
          latencyOffsetMs: latencyMs
        };

        setRecordedVocalTakes(prev => [{ id: newTake.id, url: vocalUrl, duration }, ...prev]);
        onTakeRecorded(newTake);
      };

      rec.start(100);
      recorderRef.current = rec;
      setIsRecordingVocal(true);
      setIsAutoScrolling(true);
    } catch (err) {
      alert('Microphone access required to record vocal tracks.');
    }
  };

  const handleStopVocalRecord = () => {
    if (recorderRef.current && isRecordingVocal) {
      recorderRef.current.stop();
      setIsRecordingVocal(false);
      setIsAutoScrolling(false);
    }
    beatSynthesizer.stop();
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-3.5rem)] pb-safe">
      {/* Left Column: Beat Machine, Waveform & Mixer */}
      <div className="w-full lg:w-3/5 flex flex-col gap-5">
        {/* Header Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/40 border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-purple-400 tracking-wider">KARAOKE & PERFORMANCE DECK</span>
              <h2 className="text-2xl font-black text-white mt-0.5">{selectedBeat.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>{selectedBeat.genre}</span>
                <span>·</span>
                <span>{selectedBeat.bpm} BPM</span>
                <span>·</span>
                <span>{selectedBeat.key}</span>
              </div>
            </div>

            {/* Play/Stop Large Trigger */}
            <button
              onClick={togglePlayback}
              className={`min-h-[56px] min-w-[56px] rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isPlaying
                  ? 'bg-red-600 text-white shadow-red-600/40'
                  : 'bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-purple-600/40 hover:scale-105'
              }`}
            >
              {isPlaying ? <Square className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </button>
          </div>

          {/* Real-time Frequency Waveform Visualizer */}
          <div className="w-full h-24 bg-black/50 rounded-2xl p-2 border border-slate-800/80 overflow-hidden mb-4 relative">
            <canvas ref={canvasRef} width={600} height={96} className="w-full h-full" />
            {/* Step Lights Bar (16-step sequencer indicators) */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentStep === i && isPlaying
                      ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_#06b6d4]'
                      : i % 4 === 0
                      ? 'bg-purple-900'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Headphone Advice Banner */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300">
            <Headphones className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Connect wired headphones to record clean vocal takes without audio bleed.</span>
          </div>
        </div>

        {/* Studio Mixer: Beat & Vocal Gain + Latency Offset */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Dual Track Studio Mixer</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real-time Audio Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instrumental Beat Fader */}
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/60">
              <div className="flex justify-between text-xs text-slate-300 mb-2">
                <span>Instrumental Track</span>
                <span className="font-mono text-purple-400">{Math.round(beatVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={beatVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBeatVolume(val);
                  beatSynthesizer.setVolume(val);
                }}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Vocal Microphone Fader */}
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/60">
              <div className="flex justify-between text-xs text-slate-300 mb-2">
                <span>Vocal Microphone Gain</span>
                <span className="font-mono text-cyan-400">{Math.round(vocalVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={vocalVolume}
                onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Latency Sync Offset */}
          <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/60">
            <div className="flex justify-between text-xs text-slate-300 mb-2">
              <span>Bluetooth & Hardware Latency Alignment</span>
              <span className="font-mono text-cyan-300">{latencyMs} ms</span>
            </div>
            <input
              type="range"
              min="-150"
              max="150"
              step="5"
              value={latencyMs}
              onChange={(e) => setLatencyMs(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Record Vocal Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={isRecordingVocal ? handleStopVocalRecord : handleStartVocalRecord}
              className={`flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer shadow-lg ${
                isRecordingVocal
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30'
              }`}
            >
              <Mic2 className="w-4 h-4" />
              <span>{isRecordingVocal ? 'Stop Vocal Recording' : 'Record Vocal Take Over Beat'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('camera')}
              className="px-5 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Record with Video</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Backing Beat Library Selection */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Backing Beats Catalog</h3>
            <label className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Audio File</span>
              <input type="file" accept="audio/*" onChange={handleCustomBeatUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_BEATS.map((beat) => {
              const isSelected = selectedBeat.id === beat.id;
              return (
                <button
                  key={beat.id}
                  onClick={() => {
                    setSelectedBeat(beat);
                    if (isPlaying) {
                      beatSynthesizer.start(beat.synthStyle, beat.bpm);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500/60'
                      : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="font-semibold text-xs text-white truncate">{beat.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <span>{beat.genre}</span>
                    <span>·</span>
                    <span>{beat.bpm} BPM</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Teleprompter / Lyrics & Vocal Takes Drawer */}
      <div className="w-full lg:w-2/5 flex flex-col gap-5">
        {/* Teleprompter / Lyrics Workspace */}
        <div className="flex-1 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-bold text-white">Teleprompter & Lyrics</h3>
            <span className="text-[11px] text-slate-400">Freestyle & Vocal Guide</span>
          </div>

          <textarea
            ref={lyricsRef}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Type or paste your lyrics here..."
            className="flex-1 w-full min-h-[240px] bg-black/40 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-600 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-none"
          />
        </div>

        {/* Vocal Takes History */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Recorded Takes Shelf</h3>
            <span className="text-xs text-slate-400 font-mono">{recordedVocalTakes.length} recorded</span>
          </div>

          {recordedVocalTakes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No vocal takes recorded yet. Press the record button above while listening to the beat!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recordedVocalTakes.map((take, idx) => (
                <div
                  key={take.id}
                  className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">Vocal Take {recordedVocalTakes.length - idx}</div>
                    <div className="text-[10px] text-slate-400">{take.duration.toFixed(1)}s recorded</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio src={take.url} controls className="h-8 w-40" />
                    <button
                      onClick={() => onNavigateTab('editor')}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Mix in Editor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
