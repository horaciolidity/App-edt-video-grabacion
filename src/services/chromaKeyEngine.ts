import { ChromaKeySettings } from '../types';

/**
 * WebGL GPU-accelerated Real-time Chroma Keying & Compositing Pipeline.
 * Features:
 * - GLSL fragment shader with YUV/Euclidean key distance
 * - Edge softness & feathering
 * - Real-time green/blue spill suppression
 * - Eyedropper pixel sampling
 * - Canvas 2D fallback for maximum compatibility
 */

export class ChromaKeyEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private fgTexture: WebGLTexture | null = null;
  private bgTexture: WebGLTexture | null = null;
  private isWebGLSupported = false;

  // Cached uniform locations
  private uKeyColorLoc: WebGLUniformLocation | null = null;
  private uToleranceLoc: WebGLUniformLocation | null = null;
  private uSoftnessLoc: WebGLUniformLocation | null = null;
  private uSpillLoc: WebGLUniformLocation | null = null;
  private uHasBgLoc: WebGLUniformLocation | null = null;
  private uFilterIdLoc: WebGLUniformLocation | null = null;
  private uFilterIntensityLoc: WebGLUniformLocation | null = null;
  private uFlipXLoc: WebGLUniformLocation | null = null;
  private uFgLoc: WebGLUniformLocation | null = null;
  private uBgLoc: WebGLUniformLocation | null = null;

  // Background image element
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;
  private lastBgSrc: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initWebGL();
  }

  private initWebGL() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        alpha: true
      });

      if (!this.gl) {
        console.warn('WebGL not supported, falling back to Canvas 2D engine');
        this.isWebGLSupported = false;
        return;
      }

      this.isWebGLSupported = true;
      this.setupShaders();
      this.setupBuffers();
      this.setupTextures();
    } catch (e) {
      console.warn('Error initializing WebGL:', e);
      this.isWebGLSupported = false;
    }
  }

  private setupShaders() {
    const gl = this.gl!;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_foreground;
      uniform sampler2D u_background;
      uniform vec3 u_keyColor;
      uniform float u_tolerance;
      uniform float u_softness;
      uniform float u_spill;
      uniform bool u_hasBg;
      uniform int u_filterId;
      uniform float u_filterIntensity;
      uniform bool u_flipX;
      varying vec2 v_texCoord;

      void main() {
        vec2 uv = v_texCoord;
        if (u_flipX) {
          uv.x = 1.0 - uv.x;
        }
        vec4 fg = texture2D(u_foreground, uv);
        vec4 bg = u_hasBg ? texture2D(u_background, uv) : vec4(0.0, 0.0, 0.0, 1.0);

        // Calculate color distance in normalized RGB space
        float d = distance(fg.rgb, u_keyColor);

        // Smoothstep key mask
        float edgeLow = max(0.0, u_tolerance - u_softness);
        float edgeHigh = min(1.0, u_tolerance + u_softness);
        float mask = smoothstep(edgeLow, edgeHigh, d);

        // Spill suppression
        vec3 cleanFg = fg.rgb;
        if (u_spill > 0.0) {
          // If green key
          if (u_keyColor.g > u_keyColor.r && u_keyColor.g > u_keyColor.b) {
            float maxOther = max(cleanFg.r, cleanFg.b);
            cleanFg.g = mix(cleanFg.g, min(cleanFg.g, maxOther), u_spill);
          }
          // If blue key
          else if (u_keyColor.b > u_keyColor.r && u_keyColor.b > u_keyColor.g) {
            float maxOther = max(cleanFg.r, cleanFg.g);
            cleanFg.b = mix(cleanFg.b, min(cleanFg.b, maxOther), u_spill);
          }
        }

        // Composite foreground over background
        vec3 compositeColor = mix(bg.rgb, cleanFg, mask);

        // Optional Live Artist Shader Enhancements
        if (u_filterId == 1) {
          // Trap Cyber Neon
          compositeColor = mix(compositeColor, vec3(compositeColor.r * 1.2, compositeColor.g * 0.8, compositeColor.b * 1.4), u_filterIntensity);
        } else if (u_filterId == 2) {
          // VHS Retro
          compositeColor = mix(compositeColor, vec3(compositeColor.r * 1.1, compositeColor.g * 1.0, compositeColor.b * 0.7), u_filterIntensity * 0.6);
        } else if (u_filterId == 3) {
          // Noir B&W
          float gray = dot(compositeColor, vec3(0.299, 0.587, 0.114));
          compositeColor = mix(compositeColor, vec3(gray * 1.15), u_filterIntensity);
        }

        gl_FragColor = vec4(compositeColor, 1.0);
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    if (!vs || !fs) return;

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    this.uKeyColorLoc = gl.getUniformLocation(this.program, 'u_keyColor');
    this.uToleranceLoc = gl.getUniformLocation(this.program, 'u_tolerance');
    this.uSoftnessLoc = gl.getUniformLocation(this.program, 'u_softness');
    this.uSpillLoc = gl.getUniformLocation(this.program, 'u_spill');
    this.uHasBgLoc = gl.getUniformLocation(this.program, 'u_hasBg');
    this.uFilterIdLoc = gl.getUniformLocation(this.program, 'u_filterId');
    this.uFilterIntensityLoc = gl.getUniformLocation(this.program, 'u_filterIntensity');
    this.uFlipXLoc = gl.getUniformLocation(this.program, 'u_flipX');
    this.uFgLoc = gl.getUniformLocation(this.program, 'u_foreground');
    this.uBgLoc = gl.getUniformLocation(this.program, 'u_background');
    if (this.uFgLoc) gl.uniform1i(this.uFgLoc, 0);
    if (this.uBgLoc) gl.uniform1i(this.uBgLoc, 1);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private setupBuffers() {
    const gl = this.gl!;
    // Quad coordinates: 2 triangles
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program!, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // UV coordinates (flipped Y for canvas / video orientation)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const aTex = gl.getAttribLocation(this.program!, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
  }

  private setupTextures() {
    const gl = this.gl!;
    this.fgTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fgTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.bgTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public setBackground(src: string) {
    if (this.lastBgSrc === src && this.bgLoaded) return;
    this.lastBgSrc = src;
    this.bgLoaded = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.bgImage = img;
      this.bgLoaded = true;
      if (this.gl && this.bgTexture) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bgTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load chroma background image:', src);
      this.bgLoaded = false;
    };
    img.src = src;
  }

  public render(
    sourceElement: HTMLVideoElement | HTMLCanvasElement,
    settings: ChromaKeySettings,
    filterId: string = 'normal',
    filterIntensity: number = 0.5,
    flipHorizontal: boolean = false
  ) {
    if (this.isWebGLSupported && this.gl && this.program) {
      this.renderWebGL(sourceElement, settings, filterId, filterIntensity, flipHorizontal);
    } else {
      this.renderCanvas2DFallback(sourceElement, settings, flipHorizontal);
    }
  }

  private renderWebGL(
    video: HTMLVideoElement | HTMLCanvasElement,
    settings: ChromaKeySettings,
    filterId: string,
    filterIntensity: number,
    flipHorizontal: boolean
  ) {
    const gl = this.gl!;

    // Ensure background texture is up to date
    if (settings.enabled && settings.backgroundSrc && this.lastBgSrc !== settings.backgroundSrc) {
      this.setBackground(settings.backgroundSrc);
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);

    // Upload foreground video frame to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fgTexture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch {
      return;
    }

    // Upload background image to texture unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);

    // Uniform values
    const rgb = hexToRgbNormalized(settings.keyColor);
    gl.uniform3f(this.uKeyColorLoc, rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(this.uToleranceLoc, settings.enabled ? settings.tolerance : 0.0);
    gl.uniform1f(this.uSoftnessLoc, settings.enabled ? settings.softness : 0.0);
    gl.uniform1f(this.uSpillLoc, settings.enabled ? settings.spillReduction : 0.0);
    gl.uniform1i(this.uHasBgLoc, settings.enabled && this.bgLoaded ? 1 : 0);
    gl.uniform1i(this.uFlipXLoc, flipHorizontal ? 1 : 0);

    // Filter uniform
    let fId = 0;
    if (filterId === 'trap_cyber') fId = 1;
    else if (filterId === 'vhs_retro') fId = 2;
    else if (filterId === 'noir_cinema') fId = 3;
    gl.uniform1i(this.uFilterIdLoc, fId);
    gl.uniform1f(this.uFilterIntensityLoc, filterIntensity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private renderCanvas2DFallback(
    video: HTMLVideoElement | HTMLCanvasElement,
    settings: ChromaKeySettings,
    flipHorizontal: boolean = false
  ) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw background if keying enabled
    if (settings.enabled && this.bgImage && this.bgLoaded) {
      ctx.drawImage(this.bgImage, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, w, h);
    }

    if (!settings.enabled) {
      if (flipHorizontal) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, w, h);
      }
      return;
    }

    // Fallback: draw foreground with 2D chroma key pixel test
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(video, 0, 0, w, h);
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const [targetR, targetG, targetB] = hexToRgb(settings.keyColor);
    const tol = settings.tolerance * 255;
    const soft = settings.softness * 255;

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
          d[i + 3] = 0; // Completely transparent
        } else {
          // Feathered edge
          const alpha = (diff - (tol - soft)) / Math.max(1, soft);
          d[i + 3] = Math.round(alpha * 255);
        }
      }
    }

    tempCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Eyedropper tool: sample exact color from current canvas position
   */
  public pickColorAt(x: number, y: number): string {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const px = Math.floor((x - rect.left) * scaleX);
    const py = Math.floor((y - rect.top) * scaleY);

    if (this.gl) {
      const pixel = new Uint8Array(4);
      // Read pixel from WebGL buffer (note WebGL Y is inverted)
      const glY = this.canvas.height - py;
      this.gl.readPixels(px, glY, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    } else {
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return '#00ff00';
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      return rgbToHex(pixel[0], pixel[1], pixel[2]);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

// Helpers
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function hexToRgbNormalized(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255.0, g / 255.0, b / 255.0];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
