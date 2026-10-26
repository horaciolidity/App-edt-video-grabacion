/**
 * Real-time Web Audio Beat Synthesizer for backing tracks & karaoke studio.
 * Synthesizes 808 sub-bass, punchy kicks, snare snaps, hi-hat rolls, and melodic synth chords
 * completely in-browser with zero external audio assets.
 */

class BeatSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentStyle: string = 'trap808';
  private bpm: number = 140;
  private step: number = 0;
  private timerId: number | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private onBeatCallback?: (step: number) => void;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      // Create stream destination for mixing into recordings
      this.destinationNode = this.ctx.createMediaStreamDestination();

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.destinationNode);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getStreamDestination(): MediaStreamAudioDestinationNode | null {
    this.init();
    return this.destinationNode;
  }

  public getAnalyser(): AnalyserNode | null {
    this.init();
    return this.analyser;
  }

  public setVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(2, val)), this.ctx.currentTime);
    }
  }

  public setBpm(val: number) {
    this.bpm = Math.max(60, Math.min(200, val));
  }

  public setOnBeat(cb: (step: number) => void) {
    this.onBeatCallback = cb;
  }

  public start(style: string, bpm: number) {
    this.init();
    if (this.isPlaying) this.stop();

    this.currentStyle = style;
    this.bpm = bpm;
    this.isPlaying = true;
    this.step = 0;

    const intervalMs = (60 / this.bpm / 4) * 1000; // 16th note interval

    this.timerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      this.triggerStep(this.step % 16);
      if (this.onBeatCallback) {
        this.onBeatCallback(this.step % 16);
      }
      this.step++;
    }, intervalMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private triggerStep(step16: boolean | number) {
    const s = typeof step16 === 'number' ? step16 : 0;
    const now = this.ctx!.currentTime;

    switch (this.currentStyle) {
      case 'trap808':
      case 'drill':
        // Kick on 0, 7, 10
        if (s === 0 || s === 7 || s === 10) {
          this.play808Kick(now, s === 0 ? 44 : 38);
        }
        // Snare / Clap on 4, 12
        if (s === 4 || s === 12) {
          this.playSnare(now);
        }
        // Hi-hats on every 2 steps + rolls on 14, 15
        if (s % 2 === 0 || s === 14 || s === 15) {
          this.playHiHat(now, s >= 14 ? 0.03 : 0.05);
        }
        // Dark synth pad chord on 0
        if (s === 0) {
          this.playMelodicChord(now, [174.61, 207.65, 261.63], 1.8); // F minor
        }
        break;

      case 'boombap':
        // Classic 90s boom bap: Kick on 0, 10; Snare on 4, 12
        if (s === 0 || s === 10) {
          this.playPunchyKick(now);
        }
        if (s === 4 || s === 12) {
          this.playSnare(now);
        }
        // Swung hats
        if (s % 2 === 0) {
          this.playHiHat(now, 0.06);
        }
        if (s === 0) {
          this.playMelodicChord(now, [196.0, 233.08, 293.66], 2.2); // G minor rhodes
        }
        break;

      case 'reggaeton':
        // Dembow rhythm: Kick on 0, 4, 8, 12 (four on floor)
        if (s % 4 === 0) {
          this.playPunchyKick(now);
        }
        // Dembow snare syncopation: 3, 6, 11, 14
        if (s === 3 || s === 6 || s === 11 || s === 14) {
          this.playDembowSnare(now);
        }
        if (s % 2 === 0) {
          this.playHiHat(now, 0.04);
        }
        if (s === 0 || s === 8) {
          this.playMelodicChord(now, [220.0, 261.63, 329.63], 1.6); // A minor brass/pluck
        }
        break;

      case 'synthpop':
        // 80s 4-on-floor + retro bass arp
        if (s % 4 === 0) {
          this.playPunchyKick(now);
        }
        if (s === 4 || s === 12) {
          this.playSnare(now);
        }
        this.playHiHat(now, 0.04);
        // Synth bass line on 16ths
        const notes = [146.83, 174.61, 220.0, 196.0]; // D minor synth
        const note = notes[Math.floor(s / 4)];
        this.playSynthBass(now, note);
        break;

      case 'rock':
      default:
        // Driving rock beat: Kick 0, 8, 10; Snare 4, 12; eighth hats
        if (s === 0 || s === 8 || s === 10) {
          this.playPunchyKick(now);
        }
        if (s === 4 || s === 12) {
          this.playSnare(now);
        }
        if (s % 2 === 0) {
          this.playHiHat(now, 0.05);
        }
        if (s === 0) {
          this.playPowerChord(now, 82.41); // E low power chord
        }
        break;
    }
  }

  // --- Drum Voices ---
  private play808Kick(time: number, freq: number = 42) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency drop for booming 808
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.7);
  }

  private playPunchyKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.05);

    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    osc.start(time);
    noise.stop(time + 0.16);
    osc.stop(time + 0.1);
  }

  private playDembowSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.09);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playHiHat(time: number, decay: number = 0.05) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * decay;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + decay);
  }

  private playMelodicChord(time: number, freqs: number[], duration: number) {
    if (!this.ctx || !this.masterGain) return;
    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      // Low pass filter to make warm and dark
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  private playSynthBass(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playPowerChord(time: number, rootFreq: number) {
    if (!this.ctx || !this.masterGain) return;
    [rootFreq, rootFreq * 1.5].forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(time);
      osc.stop(time + 1.25);
    });
  }
}

export const beatSynthesizer = new BeatSynthesizer();
