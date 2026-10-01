/**
 * Stage 8: Photorealistic Daisy Flower Engine with Transparent PNG Sprites
 * Dense, flower-dominant floral arrangement (85-90% daisies, 10-15% subtle accent foliage).
 * Features multi-bloom clustering, subtle background stems, natural overlapping,
 * organic rotation/size variations, and 60fps real-time blossoming.
 */

import { PALETTES } from '../render/palette.js';

// Smooth easing for natural organic blossoming
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

// Catmull-Rom Spline point interpolation for smooth tracking
function getCatmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const v0 = (p2.x - p0.x) * 0.5;
  const v1 = (p3.x - p1.x) * 0.5;
  const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 +
            (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 +
            v0 * t + p1.x;

  const w0 = (p2.y - p0.y) * 0.5;
  const w1 = (p3.y - p1.y) * 0.5;
  const y = (2 * p1.y - 2 * p2.y + w0 + w1) * t3 +
            (-3 * p1.y + 3 * p2.y - 2 * w0 - w1) * t2 +
            w0 * t + p1.y;

  return { x, y };
}

export class FlowerRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Offscreen buffer for permanent baked strokes
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCtx = this.bufferCanvas.getContext('2d', { alpha: true });

    // Default to the reference White Daisy palette
    this.palette = PALETTES.whiteDaisy || PALETTES.petuniaGarland;
    this.mode = 'flower'; // 'flower' | 'plain' | 'vine'
    this.brushScale = 1.25;

    // Active strokes being drawn per trackId
    this.activeStrokes = new Map();

    // Completed strokes that are still actively blooming before being baked
    this.bloomingStrokes = new Set();

    // Floating particles (petals & golden pollen dust)
    this.particles = [];
    this.maxParticles = 350;

    // High-Resolution Transparent PNG Photographic Assets
    this.images = {
      daisy1: this.loadImage('./assets/flowers/daisy_1.png'),
      daisy2: this.loadImage('./assets/flowers/daisy_2.png'),
      leaf: this.loadImage('./assets/flowers/daisy_leaf.png'),
      bud: this.loadImage('./assets/flowers/daisy_bud.png'),
      petal: this.loadImage('./assets/flowers/daisy_petal.png')
    };

    this.initCanvasSize();
  }

  loadImage(src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => {
      img.loaded = true;
    };
    img.onerror = () => {
      if (!src.startsWith('/')) {
        img.src = '/' + src.replace(/^\.\//, '');
      }
    };
    return img;
  }

  initCanvasSize() {
    const width = this.canvas.width || window.innerWidth;
    const height = this.canvas.height || window.innerHeight;
    this.bufferCanvas.width = width;
    this.bufferCanvas.height = height;
  }

  resize(width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.bufferCanvas.width;
    tempCanvas.height = this.bufferCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.bufferCanvas, 0, 0);

    this.canvas.width = width;
    this.canvas.height = height;
    this.bufferCanvas.width = width;
    this.bufferCanvas.height = height;

    this.bufferCtx.drawImage(tempCanvas, 0, 0, width, height);
  }

  setPalette(paletteId) {
    if (PALETTES[paletteId]) {
      this.palette = PALETTES[paletteId];
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  setBrushScale(scale) {
    this.brushScale = Math.max(0.5, Math.min(3.0, scale));
  }

  // --- Stroke Lifecycle with Continuous Spline Smoothing ---

  startStroke(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const now = performance.now();
    const stroke = {
      trackId,
      points: [point],
      rawPoints: [point],
      smoothPoints: [{ x: point.x, y: point.y, width: 2.2 * this.brushScale }],
      startTime: now,
      palette: this.palette,
      mode: this.mode,
      lastSpawnDist: 0,
      totalDistance: 0,
      flowers: [],
      leaves: [],
      buds: [],
      isFinished: false
    };

    this.activeStrokes.set(trackId, stroke);

    if (this.mode === 'flower') {
      // Spawn a rich initial cluster of daisies right at stroke start
      this.spawnDaisyCluster(stroke, point, velocity, now, true);
    }
  }

  addStrokePoint(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    const prevRaw = stroke.rawPoints[stroke.rawPoints.length - 1];
    const segmentDist = Math.hypot(point.x - prevRaw.x, point.y - prevRaw.y);

    // Micro jitter filter
    if (segmentDist < 2.0) return;

    stroke.rawPoints.push(point);
    stroke.points.push(point);
    const now = performance.now();
    const speed = Math.min(velocity.speed || 0, 1500);

    // Subtle thin background stem width
    const targetWidth = Math.max(1.6, Math.min(3.2, 2.6 - speed * 0.001)) * this.brushScale;

    // Spline Interpolation for butter-smooth continuous curvature
    const pts = stroke.rawPoints;
    const len = pts.length;

    if (len >= 3) {
      const p0 = len >= 4 ? pts[len - 4] : pts[len - 3];
      const p1 = pts[len - 3];
      const p2 = pts[len - 2];
      const p3 = pts[len - 1];

      const steps = Math.max(3, Math.min(10, Math.floor(segmentDist / 4)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const interp = getCatmullRomPoint(p0, p1, p2, p3, t);
        const lastSmooth = stroke.smoothPoints[stroke.smoothPoints.length - 1];
        const stepDist = Math.hypot(interp.x - lastSmooth.x, interp.y - lastSmooth.y);

        if (stepDist >= 2.0) {
          const w = lastSmooth.width * 0.7 + targetWidth * 0.3;
          stroke.smoothPoints.push({ x: interp.x, y: interp.y, width: w });
          stroke.totalDistance += stepDist;
          stroke.lastSpawnDist += stepDist;

          const tangentAngle = Math.atan2(interp.y - lastSmooth.y, interp.x - lastSmooth.x);
          const currentVel = { speed, direction: tangentAngle };

          this.processElementSpawning(stroke, interp, currentVel, now);
        }
      }
    } else {
      stroke.smoothPoints.push({ x: point.x, y: point.y, width: targetWidth });
      stroke.totalDistance += segmentDist;
      stroke.lastSpawnDist += segmentDist;
      this.processElementSpawning(stroke, point, velocity, now);
    }
  }

  processElementSpawning(stroke, point, velocity, now) {
    if (this.mode === 'flower') {
      const speed = velocity.speed || 0;
      
      // Tight spawn interval to guarantee a continuous, dense floral arrangement (no gaps)
      const spawnInterval = Math.max(16, Math.min(32, 14 + speed * 0.015)) * this.brushScale;

      if (stroke.lastSpawnDist >= spawnInterval) {
        stroke.lastSpawnDist = 0;
        this.spawnDaisyCluster(stroke, point, velocity, now, false);
      }
    } else if (this.mode === 'vine') {
      if (stroke.lastSpawnDist >= 24 * this.brushScale) {
        stroke.lastSpawnDist = 0;
        this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
      }
    }
  }

  /**
   * Spawns a dense, layered daisy cluster:
   * 85-90% prominent white daisies, 10-15% subtle small leaves in the background.
   */
  spawnDaisyCluster(stroke, point, velocity, now, isInitial = false) {
    const speed = velocity.speed || 0;
    const dir = velocity.direction || 0;
    const perpAngle = dir + Math.PI / 2;

    // 1. Hero Daisy Size: large, prominent, prominent blooming (55px - 95px)
    const heroSize = Math.max(50, 92 - speed * 0.035) * this.brushScale * (0.92 + Math.random() * 0.2);
    
    // Main Hero Daisy (centered on stroke)
    stroke.flowers.push({
      x: point.x + (Math.random() - 0.5) * 6,
      y: point.y + (Math.random() - 0.5) * 6,
      size: heroSize,
      variant: Math.random() > 0.45 ? 'daisy1' : 'daisy2',
      rotation: Math.random() * Math.PI * 2,
      birthTime: now,
      bloomDuration: 320 + Math.random() * 70,
      layer: 2 // Foreground
    });

    // 2. Companion Daisy: 65% chance (or 100% on initial start) to create natural overlapping clusters
    if (isInitial || Math.random() < 0.70) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = (14 + Math.random() * 24) * this.brushScale;
      const offsetAngle = perpAngle + (Math.random() - 0.5) * 0.8;
      const compSize = heroSize * (0.75 + Math.random() * 0.22);

      stroke.flowers.push({
        x: point.x + Math.cos(offsetAngle) * offsetDist * side,
        y: point.y + Math.sin(offsetAngle) * offsetDist * side,
        size: compSize,
        variant: Math.random() > 0.5 ? 'daisy2' : 'daisy1',
        rotation: Math.random() * Math.PI * 2,
        birthTime: now + 30,
        bloomDuration: 300 + Math.random() * 60,
        layer: 1 // Slight under-overlap
      });
    }

    // 3. Accent Mini Blossom or Daisy Bud: 30% chance on the opposite flank
    if (Math.random() < 0.30) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = (18 + Math.random() * 26) * this.brushScale;
      const offsetAngle = perpAngle + Math.PI + (Math.random() - 0.5) * 0.8;
      
      if (Math.random() < 0.65) {
        // Small companion daisy
        stroke.flowers.push({
          x: point.x + Math.cos(offsetAngle) * offsetDist * side,
          y: point.y + Math.sin(offsetAngle) * offsetDist * side,
          size: heroSize * (0.62 + Math.random() * 0.18),
          variant: 'daisy1',
          rotation: Math.random() * Math.PI * 2,
          birthTime: now + 50,
          bloomDuration: 280 + Math.random() * 60,
          layer: 1
        });
      } else {
        // Young Daisy Bud
        this.spawnBud(stroke, point, velocity, now);
      }
    }

    // 4. Subtle Background Leaf: ONLY 12-18% chance (never every flower, strictly behind blooms)
    if (Math.random() < 0.15) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.spawnLeaf(stroke, point, velocity, side, now);
    }

    // 5. Ambient drifting white petals & golden pollen
    if (Math.random() < 0.35) {
      this.spawnFloatingPetal(point, velocity);
    }
    if (Math.random() < 0.30) {
      this.spawnPollenDust(point, velocity);
    }
  }

  spawnBud(stroke, point, velocity, now = performance.now()) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const angle = (velocity.direction || 0) + side * (0.75 + Math.random() * 0.5);
    const dist = (22 + Math.random() * 20) * this.brushScale;
    const budX = point.x + Math.cos(angle) * dist;
    const budY = point.y + Math.sin(angle) * dist;

    stroke.buds.push({
      x: budX,
      y: budY,
      stemFrom: { x: point.x, y: point.y },
      baseSize: (16 + Math.random() * 10) * this.brushScale,
      angle: angle + Math.PI / 2,
      birthTime: now,
      bloomDuration: 260 + Math.random() * 60
    });
  }

  spawnLeaf(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const leafAngle = dir + sideDirection * (0.7 + Math.random() * 0.5);
    const size = (22 + Math.random() * 18) * this.brushScale; // Small subtle accent leaf

    stroke.leaves.push({
      x: point.x,
      y: point.y,
      angle: leafAngle - Math.PI / 2,
      size,
      birthTime: now,
      bloomDuration: 260 + Math.random() * 60
    });
  }

  spawnFloatingPetal(point, velocity) {
    if (this.particles.length >= this.maxParticles) return;

    const speed = Math.min(velocity.speed || 60, 450);
    const driftAngle = (velocity.direction || 0) + (Math.random() - 0.5) * 1.6;

    this.particles.push({
      type: 'petal',
      x: point.x + (Math.random() - 0.5) * 16,
      y: point.y + (Math.random() - 0.5) * 16,
      vx: Math.cos(driftAngle) * (speed * 0.08 + 1.2) + (Math.random() - 0.5) * 1.2,
      vy: Math.sin(driftAngle) * (speed * 0.08) + Math.random() * 1.4 + 0.6,
      size: (12 + Math.random() * 14) * this.brushScale,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.08,
      flip: Math.random() * Math.PI,
      vFlip: 0.04 + Math.random() * 0.05,
      opacity: 0.98,
      life: 1.0,
      decay: 0.005 + Math.random() * 0.006
    });
  }

  spawnPollenDust(point, velocity) {
    if (this.particles.length >= this.maxParticles) return;

    const speed = Math.min(velocity.speed || 40, 300);
    const angle = Math.random() * Math.PI * 2;

    this.particles.push({
      type: 'pollen',
      x: point.x + (Math.random() - 0.5) * 24,
      y: point.y + (Math.random() - 0.5) * 24,
      vx: Math.cos(angle) * (speed * 0.04 + 0.8),
      vy: Math.sin(angle) * (speed * 0.04 + 0.8) - 0.4,
      size: (1.5 + Math.random() * 2.5) * this.brushScale,
      opacity: 1.0,
      color: 'rgba(254, 240, 138, 0.95)',
      life: 1.0,
      decay: 0.01 + Math.random() * 0.015
    });
  }

  endStroke(trackId) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return null;

    stroke.isFinished = true;
    this.activeStrokes.delete(trackId);
    this.bloomingStrokes.add(stroke);
    return stroke;
  }

  // --- Physics Particle Simulation ---

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'petal') {
        p.angle += p.vAngle;
        p.flip += p.vFlip;
        p.vx *= 0.965;
        p.vy = p.vy * 0.965 + 0.045; // Gentle gravity
        p.vAngle *= 0.985;
      } else {
        p.vx += (Math.random() - 0.5) * 0.15;
        p.vy -= 0.015;
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      p.life -= p.decay;
      p.opacity = Math.max(0, p.life);

      if (p.life <= 0 || p.y > this.canvas.height + 60 || p.x < -60 || p.x > this.canvas.width + 60) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Main Rendering Loop ---

  render() {
    const now = performance.now();
    this.updateParticles();

    // Check finished blooming strokes to bake onto permanent buffer
    for (const stroke of this.bloomingStrokes) {
      let allBloomed = true;
      for (const fl of stroke.flowers) {
        if (now - fl.birthTime < fl.bloomDuration) {
          allBloomed = false;
          break;
        }
      }
      if (allBloomed) {
        for (const lf of stroke.leaves) {
          if (now - lf.birthTime < lf.bloomDuration) {
            allBloomed = false;
            break;
          }
        }
      }

      if (allBloomed) {
        this.renderStrokeToBuffer(stroke, now);
        this.bloomingStrokes.delete(stroke);
      }
    }

    // 1. Clear drawing canvas and draw permanent buffer
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bufferCanvas, 0, 0);

    // 2. Render completed strokes still in blooming transition
    for (const stroke of this.bloomingStrokes) {
      this.drawStroke(this.ctx, stroke, now);
    }

    // 3. Render active live drawing strokes
    for (const stroke of this.activeStrokes.values()) {
      this.drawStroke(this.ctx, stroke, now);
    }

    // 4. Render floating physics particles (daisy petals & golden pollen)
    this.renderParticles(this.ctx);
  }

  renderStrokeToBuffer(stroke, now) {
    this.drawStroke(this.bufferCtx, stroke, now);
  }

  /**
   * Strictly Enforced Rendering Layer Order:
   * Layer 1: Subtle thin background stem (underneath everything)
   * Layer 2: Occasional small green leaves & buds (tucked strictly behind flowers)
   * Layer 3: Dense white daisy arrangement with soft natural drop shadows (dominates 85-90% of visual area)
   */
  drawStroke(ctx, stroke, now = performance.now()) {
    if (stroke.smoothPoints.length === 0) return;

    if (stroke.mode === 'plain') {
      this.drawPlainLine(ctx, stroke);
      return;
    }

    ctx.save();

    // 1. LAYER 1: Subtle thin background green stem (Never obscures flowers)
    this.drawSubtleStem(ctx, stroke);

    // 2. LAYER 2: Daisy Buds (behind flowers)
    this.drawBuds(ctx, stroke, now);

    // 3. LAYER 3: Small background accent leaves (strictly behind flowers)
    this.drawLeaves(ctx, stroke, now);

    // 4. LAYER 4: Dominant White Daisy Arrangement (Front & Center)
    this.drawDaisies(ctx, stroke, now);

    ctx.restore();
  }

  drawPlainLine(ctx, stroke) {
    const pts = stroke.smoothPoints;
    if (pts.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.0 * this.brushScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 8;

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSubtleStem(ctx, stroke) {
    const pts = stroke.smoothPoints;
    if (pts.length < 2) return;

    ctx.save();
    // Soft, translucent green spine that connects the blooms gracefully without dominating
    ctx.strokeStyle = 'rgba(46, 125, 50, 0.55)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      ctx.beginPath();
      ctx.lineWidth = Math.min(2.5, p1.width * 0.6);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLeaves(ctx, stroke, now) {
    const leafImg = this.images.leaf;

    for (const leaf of stroke.leaves) {
      const elapsed = now - leaf.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / leaf.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      const currentSize = leaf.size * bloom;

      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.angle);

      // Subtle shadow behind leaf
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 4 * bloom;

      if (leafImg && leafImg.loaded) {
        ctx.globalAlpha = Math.min(0.9, progress * 1.2);
        ctx.drawImage(leafImg, -currentSize * 0.45, -currentSize * 0.85, currentSize, currentSize);
      } else {
        ctx.fillStyle = 'rgba(56, 142, 60, 0.85)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(currentSize * 0.3, -currentSize * 0.4, currentSize * 0.7, -currentSize * 0.3, currentSize, 0);
        ctx.bezierCurveTo(currentSize * 0.7, currentSize * 0.3, currentSize * 0.3, currentSize * 0.4, 0, 0);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawBuds(ctx, stroke, now) {
    const budImg = this.images.bud;

    for (const bud of stroke.buds) {
      const elapsed = now - bud.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / bud.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.05) continue;

      const currentSize = bud.baseSize * bloom;

      ctx.save();
      if (bud.stemFrom) {
        ctx.strokeStyle = 'rgba(46, 125, 50, 0.5)';
        ctx.lineWidth = 1.5 * this.brushScale;
        ctx.beginPath();
        ctx.moveTo(bud.stemFrom.x, bud.stemFrom.y);
        ctx.lineTo(bud.x, bud.y);
        ctx.stroke();
      }

      ctx.translate(bud.x, bud.y);
      ctx.rotate(bud.angle);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4 * bloom;

      if (budImg && budImg.loaded) {
        ctx.globalAlpha = Math.min(0.95, progress * 1.4);
        ctx.drawImage(budImg, -currentSize * 0.5, -currentSize * 0.5, currentSize, currentSize);
      }

      ctx.restore();
    }
  }

  drawDaisies(ctx, stroke, now) {
    // Sort flowers so background cluster layers render before foreground hero daisies
    const sortedFlowers = [...stroke.flowers].sort((a, b) => (a.layer || 1) - (b.layer || 1));

    for (const fl of sortedFlowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      const currentSize = fl.size * bloom;
      const img = (fl.variant === 'daisy2' ? this.images.daisy2 : this.images.daisy1);

      ctx.save();
      ctx.translate(fl.x, fl.y);
      // Subtle organic rotational spin during unfurling
      ctx.rotate(fl.rotation + (1 - Math.min(1, progress)) * 0.2);

      // Soft botanical drop shadow under each white daisy head
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 7 * bloom;
      ctx.shadowOffsetY = 2.5 * bloom;

      if (img && img.loaded) {
        // High-Resolution Photographic Daisy PNG with smooth alpha blending
        ctx.globalAlpha = Math.min(1.0, progress * 1.6);
        ctx.drawImage(img, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
      } else {
        // Fallback procedural daisy
        this.drawProceduralDaisyFallback(ctx, currentSize);
      }

      ctx.restore();
    }
  }

  drawProceduralDaisyFallback(ctx, size) {
    const r = size * 0.45;
    const centerR = r * 0.35;
    const petals = 26;

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < petals; i++) {
      const a = (i * Math.PI * 2) / petals;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(r * 0.65, 0, r * 0.35, r * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const grad = ctx.createRadialGradient(0, 0, centerR * 0.1, 0, 0, centerR);
    grad.addColorStop(0, '#fde047');
    grad.addColorStop(0.7, '#f59e0b');
    grad.addColorStop(1.0, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();
  }

  renderParticles(ctx) {
    const petalImg = this.images.petal;

    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.opacity;

      if (p.type === 'petal') {
        ctx.scale(Math.cos(p.flip), 1.0);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 4;

        if (petalImg && petalImg.loaded) {
          ctx.drawImage(petalImg, -p.size * 0.4, -p.size * 0.8, p.size * 0.8, p.size * 1.6);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.3, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'pollen') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = 'rgba(254, 240, 138, 0.8)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Clear canvas
  clear() {
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.activeStrokes.clear();
    this.bloomingStrokes.clear();
    this.particles = [];
  }

  // Restore history snapshot
  restoreStrokes(strokes) {
    this.clear();
    const now = performance.now();
    for (const stroke of strokes) {
      this.renderStrokeToBuffer(stroke, now + 10000);
    }
    this.render();
  }
}
