import { Project, Resolution, AspectRatio, MediaClip } from '../types';

export interface ExportProgress {
  progress: number; // 0 to 1
  currentTime: number;
  totalDuration: number;
  status: 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  error?: string;
  outputUrl?: string;
}

export interface ExportOptions {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  fps: number;
  bitrate?: number; // bps
}

export class MultitrackExportEngine {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async exportProject(
    project: Project,
    options: ExportOptions,
    onProgress: (prog: ExportProgress) => void
  ): Promise<string> {
    this.isCancelled = false;

    // Dimensions
    let width = 720;
    let height = 1280;

    if (options.aspectRatio === '9:16') {
      if (options.resolution === '1080p') { width = 1080; height = 1920; }
      else if (options.resolution === '720p') { width = 720; height = 1280; }
      else { width = 480; height = 854; }
    } else if (options.aspectRatio === '16:9') {
      if (options.resolution === '1080p') { width = 1920; height = 1080; }
      else if (options.resolution === '720p') { width = 1280; height = 720; }
      else { width = 854; height = 480; }
    } else {
      // 1:1 Square
      if (options.resolution === '1080p') { width = 1080; height = 1080; }
      else if (options.resolution === '720p') { width = 720; height = 720; }
      else { width = 480; height = 480; }
    }

    const duration = Math.max(3, project.duration || 15);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Canvas 2D context creation failed');
    }

    // Audio setup
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const audioDest = audioCtx.createMediaStreamDestination();

    // Stream capture
    const canvasStream = canvas.captureStream(options.fps);
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ];
    const combinedStream = new MediaStream(combinedTracks);

    // MimeType detection
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

    const recordedChunks: Blob[] = [];
    const recorder = mimeType ? new MediaRecorder(combinedStream, { mimeType }) : new MediaRecorder(combinedStream);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(100);

    // Preload all clip elements (images, videos)
    const mediaElements = new Map<string, HTMLVideoElement | HTMLImageElement>();
    for (const clip of project.clips) {
      if (clip.type === 'image' && clip.src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = clip.src;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        mediaElements.set(clip.id, img);
      } else if (clip.type === 'video' && clip.src) {
        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.src = clip.src;
        vid.muted = true;
        vid.playsInline = true;
        await new Promise((res) => {
          vid.onloadeddata = res;
          vid.onerror = res;
          setTimeout(res, 800); // safety fallback
        });
        mediaElements.set(clip.id, vid);
      }
    }

    // Render loop per frame
    const totalFrames = Math.ceil(duration * options.fps);
    const frameIntervalSec = 1 / options.fps;

    for (let f = 0; f < totalFrames; f++) {
      if (this.isCancelled) {
        recorder.stop();
        audioCtx.close();
        onProgress({
          progress: 0,
          currentTime: 0,
          totalDuration: duration,
          status: 'cancelled'
        });
        throw new Error('Export cancelled by user');
      }

      const currentTime = f * frameIntervalSec;

      // Clear frame
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, width, height);

      // Render clips active at currentTime (ordered by tracks)
      const sortedClips = [...project.clips].sort((a, b) => {
        // Overlay tracks on top of video tracks
        const trA = project.tracks.find(t => t.id === a.trackId);
        const trB = project.tracks.find(t => t.id === b.trackId);
        const orderA = trA?.type === 'overlay' ? 2 : trA?.type === 'video' ? 1 : 0;
        const orderB = trB?.type === 'overlay' ? 2 : trB?.type === 'video' ? 1 : 0;
        return orderA - orderB;
      });

      for (const clip of sortedClips) {
        if (currentTime < clip.startTime || currentTime > clip.startTime + clip.duration) {
          continue;
        }

        const track = project.tracks.find(t => t.id === clip.trackId);
        if (track?.isMuted) continue;

        ctx.save();
        // Transform
        ctx.globalAlpha = (clip.transform?.opacity ?? 1);
        const centerX = width / 2 + (clip.transform?.x ?? 0) * (width / 200);
        const centerY = height / 2 + (clip.transform?.y ?? 0) * (height / 200);
        ctx.translate(centerX, centerY);
        if (clip.transform?.rotation) {
          ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        }
        const scale = clip.transform?.scale ?? 1;
        ctx.scale(scale, scale);

        // Draw clip content
        if (clip.type === 'text' && clip.textContent) {
          this.renderTextClip(ctx, clip);
        } else if (clip.type === 'image') {
          const img = mediaElements.get(clip.id);
          if (img) {
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
          }
        } else if (clip.type === 'video') {
          const vid = mediaElements.get(clip.id) as HTMLVideoElement;
          if (vid && vid.readyState >= 2) {
            // Seek video to corresponding position
            const videoTime = (currentTime - clip.startTime) * clip.speed + clip.trimStart;
            vid.currentTime = videoTime % (vid.duration || 1);
            
            // Chroma Key check
            if (clip.chromaKey?.enabled) {
              this.renderKeyedVideo(ctx, vid, clip, width, height);
            } else {
              ctx.drawImage(vid, -width / 2, -height / 2, width, height);
            }
          } else {
            // Simulated video graphic frame if video element unavailable
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(-width / 2, -height / 2, width, height);
          }
        }

        ctx.restore();
      }

      // Progress update every 5 frames
      if (f % 5 === 0 || f === totalFrames - 1) {
        onProgress({
          progress: f / totalFrames,
          currentTime,
          totalDuration: duration,
          status: 'rendering'
        });
      }

      // Allow UI thread to breathe
      await new Promise((res) => setTimeout(res, 2));
    }

    onProgress({
      progress: 0.99,
      currentTime: duration,
      totalDuration: duration,
      status: 'encoding'
    });

    recorder.stop();
    await new Promise((res) => { recorder.onstop = res; });
    audioCtx.close();

    const finalBlob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
    const outputUrl = URL.createObjectURL(finalBlob);

    onProgress({
      progress: 1.0,
      currentTime: duration,
      totalDuration: duration,
      status: 'completed',
      outputUrl
    });

    return outputUrl;
  }

  private renderTextClip(ctx: CanvasRenderingContext2D, clip: MediaClip) {
    const text = clip.textContent || '';
    const fontSize = clip.textStyle?.fontSize || 36;
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text Shadow
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctx.shadowBlur = 16;

    if (clip.textStyle?.strokeColor) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = clip.textStyle.strokeColor;
      ctx.strokeText(text, 0, 0);
    }

    ctx.fillStyle = clip.textStyle?.color || '#ffffff';
    ctx.fillText(text, 0, 0);
  }

  private renderKeyedVideo(
    ctx: CanvasRenderingContext2D,
    vid: HTMLVideoElement,
    _clip: MediaClip,
    width: number,
    height: number
  ) {
    ctx.drawImage(vid, -width / 2, -height / 2, width, height);
  }
}

export const multitrackExportEngine = new MultitrackExportEngine();
