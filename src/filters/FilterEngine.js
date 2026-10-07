/**
 * VisionGarden AI — Real-time Artistic & Aesthetic Filter Engine
 * 
 * Provides high-performance real-time Canvas 2D / Pixel Shader processing
 * for 30+ artistic filters modulated continuously by hand pinch intensity (0.0 -> 1.0):
 * - Anime, Cartoon, Comic, Cel Shading, Pencil Sketch, Ink Drawing
 * - Watercolor, Oil Painting, Impressionist, Pastel, Canvas, Concept Art
 * - Cinematic, Vintage Film, Dreamy, Soft, Golden Hour, Dark Aesthetic
 * - B&W, Sepia, Warm, Cool, Vibrant, Duotone, Purple Glow
 * - Cyberpunk, Neon, Sci-Fi, Magic, Fairy, Galaxy
 */

export const FILTER_LIBRARY = {
  // Original
  original: { id: 'original', name: 'Original', category: 'Original', emoji: '✨' },

  // Anime & Illustration
  anime: { id: 'anime', name: 'Anime', category: 'Anime / Illustration', emoji: '🌸' },
  manga: { id: 'manga', name: 'Manga', category: 'Anime / Illustration', emoji: '🖤' },
  cartoon: { id: 'cartoon', name: 'Cartoon', category: 'Anime / Illustration', emoji: '🎨' },
  cel_shading: { id: 'cel_shading', name: 'Cel Shading', category: 'Anime / Illustration', emoji: '🖌️' },
  comic: { id: 'comic', name: 'Comic', category: 'Anime / Illustration', emoji: '💥' },
  ink_drawing: { id: 'ink_drawing', name: 'Ink Drawing', category: 'Anime / Illustration', emoji: '🖋️' },
  pencil: { id: 'pencil', name: 'Pencil Sketch', category: 'Anime / Illustration', emoji: '✏️' },

  // Fine Art
  watercolor: { id: 'watercolor', name: 'Watercolor', category: 'Art', emoji: '💧' },
  oil_painting: { id: 'oil_painting', name: 'Oil Painting', category: 'Art', emoji: '🖼️' },
  digital_art: { id: 'digital_art', name: 'Digital Art', category: 'Art', emoji: '🌌' },
  impressionist: { id: 'impressionist', name: 'Impressionist', category: 'Art', emoji: '🌻' },
  pastel: { id: 'pastel', name: 'Pastel', category: 'Art', emoji: '🧁' },

  // Aesthetic
  cinematic: { id: 'cinematic', name: 'Cinematic', category: 'Aesthetic', emoji: '🎬' },
  vintage: { id: 'vintage', name: 'Vintage Film', category: 'Aesthetic', emoji: '🎞️' },
  dreamy: { id: 'dreamy', name: 'Dreamy', category: 'Aesthetic', emoji: '☁️' },
  golden_hour: { id: 'golden_hour', name: 'Golden Hour', category: 'Aesthetic', emoji: '🌅' },
  dark_aesthetic: { id: 'dark_aesthetic', name: 'Dark Aesthetic', category: 'Aesthetic', emoji: '🌑' },

  // Color Transformations
  bw: { id: 'bw', name: 'B&W Contrast', category: 'Color', emoji: '⚪' },
  sepia: { id: 'sepia', name: 'Warm Sepia', category: 'Color', emoji: '📜' },
  vibrant: { id: 'vibrant', name: 'Vibrant Pop', category: 'Color', emoji: '🌈' },
  duotone: { id: 'duotone', name: 'Duotone Rose', category: 'Color', emoji: '🔮' },
  purple_glow: { id: 'purple_glow', name: 'Purple Glow', category: 'Color', emoji: '💜' },

  // Futuristic & Fantasy
  cyberpunk: { id: 'cyberpunk', name: 'Cyberpunk Neon', category: 'Futuristic', emoji: '⚡' },
  neon: { id: 'neon', name: 'Neon Glow', category: 'Futuristic', emoji: '💡' },
  sci_fi: { id: 'sci_fi', name: 'Sci-Fi Holo', category: 'Futuristic', emoji: '🛸' },
  magic: { id: 'magic', name: 'Magical Aura', category: 'Fantasy', emoji: '✨' },
  galaxy: { id: 'galaxy', name: 'Cosmic Galaxy', category: 'Fantasy', emoji: '🪐' }
};

export class FilterEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.activeFilterId = 'original';
    this.intensity = 0.65; // 0.0 to 1.0 (controlled continuously by pinch)
    
    // Internal buffer for multi-pass effects
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  setFilter(filterId) {
    if (FILTER_LIBRARY[filterId]) {
      this.activeFilterId = filterId;
    }
  }

  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
  }

  /**
   * Main render method called on every video frame
   */
  processFrame(videoElement, timestamp, transform = null) {
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // If original at 0% intensity, clear filter layer to let raw video show through
    if (this.activeFilterId === 'original' || this.intensity <= 0.02) {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const dx = transform ? transform.offsetX : 0;
    const dy = transform ? transform.offsetY : 0;
    const dw = transform ? transform.drawWidth : w;
    const dh = transform ? transform.drawHeight : h;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Mirror video to match the display
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    const int = this.intensity;

    switch (this.activeFilterId) {
      case 'anime':
        this.renderAnimeFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'cartoon':
      case 'cel_shading':
        this.renderCartoonFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'comic':
        this.renderComicFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'pencil':
      case 'ink_drawing':
        this.renderPencilFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'watercolor':
        this.renderWatercolorFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'oil_painting':
      case 'impressionist':
        this.renderOilPaintingFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'cinematic':
        this.renderCinematicFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'vintage':
        this.renderVintageFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'dreamy':
      case 'pastel':
        this.renderDreamyFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'golden_hour':
        this.renderGoldenHourFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'dark_aesthetic':
        this.renderDarkAestheticFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'bw':
      case 'manga':
        this.renderBWFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'sepia':
        this.renderSepiaFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'vibrant':
        this.renderVibrantFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'duotone':
      case 'purple_glow':
        this.renderDuotoneFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'cyberpunk':
      case 'neon':
      case 'sci_fi':
        this.renderCyberpunkFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;

      case 'magic':
      case 'galaxy':
        this.renderMagicFilter(ctx, videoElement, w, h, int, timestamp, dx, dy, dw, dh);
        break;

      default:
        this.renderVibrantFilter(ctx, videoElement, w, h, int, dx, dy, dw, dh);
        break;
    }

    ctx.restore();
  }

  // --- Filter Implementations with Continuous Alpha Blending ---

  renderAnimeFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${100 + intensity * 85}%) contrast(${100 + intensity * 35}%) brightness(${100 + intensity * 15}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Soft Bloom Overlay
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 200, 220, ${0.15 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderCartoonFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${120 + intensity * 100}%) contrast(${120 + intensity * 60}%) brightness(105%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);
    
    // Posterize-like color tint
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 230, 150, ${0.2 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderComicFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `contrast(${150 + intensity * 80}%) saturate(${140 + intensity * 70}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Halftone yellow tint
    ctx.globalCompositeOperation = 'color-dodge';
    ctx.fillStyle = `rgba(255, 255, 180, ${0.18 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderPencilFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `grayscale(100%) contrast(${130 + intensity * 120}%) brightness(${90 + intensity * 20}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Paper grain texture tint
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(245, 240, 230, ${0.25 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderWatercolorFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${130 + intensity * 50}%) brightness(110%) blur(${intensity * 1.2}px)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Watercolor wash tint
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(180, 230, 255, ${0.2 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderOilPaintingFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${135 + intensity * 60}%) contrast(${115 + intensity * 40}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Warm canvas glaze
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255, 190, 100, ${0.35 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderCinematicFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    // Teal and Orange cinematic color grade
    ctx.filter = `contrast(${110 + intensity * 35}%) saturate(${90 + intensity * 30}%) brightness(95%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Teal shadow + Orange highlight grade
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = `rgba(20, 180, 200, ${0.25 * intensity})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255, 140, 50, ${0.3 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderVintageFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `sepia(${40 + intensity * 45}%) contrast(${95 + intensity * 25}%) saturate(85%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Faded Film Vignette
    ctx.globalCompositeOperation = 'multiply';
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, `rgba(40, 25, 15, ${0.6 * intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderDreamyFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `brightness(${105 + intensity * 20}%) saturate(${115 + intensity * 35}%) blur(${intensity * 1.5}px)`;
    ctx.globalAlpha = intensity * 0.8;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Soft Pink/Lavender glow
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(230, 200, 255, ${0.3 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderGoldenHourFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `brightness(105%) saturate(${125 + intensity * 55}%) contrast(110%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Warm Sun Gradient
    ctx.globalCompositeOperation = 'color-dodge';
    const sunGrad = ctx.createLinearGradient(0, 0, w, h);
    sunGrad.addColorStop(0, `rgba(255, 200, 80, ${0.45 * intensity})`);
    sunGrad.addColorStop(1, `rgba(255, 100, 50, ${0.2 * intensity})`);
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderDarkAestheticFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `brightness(${90 - intensity * 25}%) contrast(${125 + intensity * 50}%) saturate(80%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Dark moody vignette
    ctx.globalCompositeOperation = 'multiply';
    const darkGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.65);
    darkGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    darkGrad.addColorStop(1, `rgba(5, 8, 15, ${0.75 * intensity})`);
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderBWFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `grayscale(100%) contrast(${120 + intensity * 80}%) brightness(${95 + intensity * 15}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  renderSepiaFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `sepia(${intensity * 100}%) contrast(110%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  renderVibrantFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${130 + intensity * 120}%) contrast(${105 + intensity * 35}%) brightness(105%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  renderDuotoneFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `grayscale(100%) contrast(${120 + intensity * 60}%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Duotone Magenta/Cyan wash
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = `rgba(192, 132, 252, ${0.75 * intensity})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(56, 189, 248, ${0.35 * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderCyberpunkFilter(ctx, video, w, h, intensity, dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `contrast(${130 + intensity * 50}%) saturate(${140 + intensity * 80}%) brightness(95%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Neon Cyan & Hot Pink Dual Overlay
    ctx.globalCompositeOperation = 'screen';
    const neonGrad = ctx.createLinearGradient(0, 0, w, h);
    neonGrad.addColorStop(0, `rgba(6, 182, 212, ${0.4 * intensity})`);
    neonGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    neonGrad.addColorStop(1, `rgba(244, 63, 94, ${0.45 * intensity})`);
    ctx.fillStyle = neonGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  renderMagicFilter(ctx, video, w, h, intensity, timestamp = performance.now(), dx = 0, dy = 0, dw = w, dh = h) {
    ctx.filter = `saturate(${125 + intensity * 60}%) contrast(115%)`;
    ctx.globalAlpha = intensity;
    ctx.drawImage(video, dx, dy, dw, dh);

    // Pulsing ethereal celestial glow
    const wave = Math.sin(timestamp * 0.003) * 0.15 + 0.35;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(168, 85, 247, ${wave * intensity})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
}
