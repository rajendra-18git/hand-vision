/**
 * Stage 8: Realistic Photorealistic Floral Engine with Transparent PNG Sprites
 * Uses high-resolution photographic daisy assets with alpha blending,
 * Catmull-Rom spline smoothing, natural anti-crowding spacing, 
 * velocity-responsive scaling/rotation, live blossoming animations, 
 * and drifting breeze petals.
 */

import { PALETTES } from '../render/palette.js';

// Natural easing for organic blossoming
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

// Catmull-Rom Spline point interpolation
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
    this.brushScale = 1.15;

    // Active strokes being drawn per trackId
    this.activeStrokes = new Map();

    // Completed strokes that are still actively blooming before being baked
    this.bloomingStrokes = new Set();

    // Floating particles (petals & golden pollen dust)
    this.particles = [];
    this.maxParticles = 350;

    // Load High-Quality Transparent PNG Photographic Assets
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
      // Fallback if relative path differs
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

  // --- Stroke Lifecycle with Spline Smoothing ---

  startStroke(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const now = performance.now();
    const stroke = {
      trackId,
      points: [point],
      rawPoints: [point],
      smoothPoints: [{ x: point.x, y: point.y, width: 4.2 * this.brushScale }],
      startTime: now,
      palette: this.palette,
      mode: this.mode,
      lastSpawnDist: 0,
      totalDistance: 0,
      flowers: [],
      leaves: [],
      tendrils: [],
      buds: [],
      isFinished: false
    };

    this.activeStrokes.set(trackId, stroke);

    if (this.mode === 'flower') {
      // Spawn initial anchor flower and flanking leaves with natural spacing
      this.spawnLeaf(stroke, point, velocity, -1, now);
      this.spawnLeaf(stroke, point, velocity, 1, now + 30);
      this.spawnFlower(stroke, point, velocity, 1.2, now);
      this.spawnTendril(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
    }
  }

  addStrokePoint(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    const prevRaw = stroke.rawPoints[stroke.rawPoints.length - 1];
    const segmentDist = Math.hypot(point.x - prevRaw.x, point.y - prevRaw.y);

    // Filter micro-movements to avoid jitter
    if (segmentDist < 2.0) return;

    stroke.rawPoints.push(point);
    stroke.points.push(point);
    const now = performance.now();
    const speed = Math.min(velocity.speed || 0, 1500);

    // Dynamic stem width based on speed
    const targetWidth = Math.max(2.4, Math.min(5.5, 4.8 - speed * 0.0025)) * this.brushScale;

    // Spline Interpolation for fluid continuous movement
    const pts = stroke.rawPoints;
    const len = pts.length;

    if (len >= 3) {
      const p0 = len >= 4 ? pts[len - 4] : pts[len - 3];
      const p1 = pts[len - 3];
      const p2 = pts[len - 2];
      const p3 = pts[len - 1];

      // Smooth step along spline
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

          // Tangent angle along spline curve
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
      // Natural spacing: prevents clutter and unnatural overlapping
      // Slower strokes allow rich hero blooms, faster strokes space out dynamically
      const spawnInterval = Math.max(34, Math.min(70, 32 + speed * 0.04)) * this.brushScale;

      if (stroke.lastSpawnDist >= spawnInterval) {
        stroke.lastSpawnDist = 0;

        // 1. Check distance to nearest existing flower on this stroke to guarantee natural placement
        let tooClose = false;
        const minFlowerDist = 38 * this.brushScale;
        for (let i = stroke.flowers.length - 1; i >= Math.max(0, stroke.flowers.length - 3); i--) {
          const fl = stroke.flowers[i];
          if (Math.hypot(point.x - fl.x, point.y - fl.y) < minFlowerDist) {
            tooClose = true;
            break;
          }
        }

        const side = Math.random() > 0.5 ? 1 : -1;

        // 2. Spawn foliage leaf flanking the stem
        this.spawnLeaf(stroke, point, velocity, side, now);
        if (Math.random() < 0.45) {
          this.spawnTendril(stroke, point, velocity, -side, now);
        }

        // 3. Spawn Daisy or Young Bud
        if (!tooClose) {
          const isBud = Math.random() < Math.min(0.3, speed / 800);
          if (isBud) {
            this.spawnBud(stroke, point, velocity, now);
          } else {
            this.spawnFlower(stroke, point, velocity, 1.0, now);
          }
        } else {
          // If flowers are close, spawn a delicate bud or accent leaf instead
          this.spawnBud(stroke, point, velocity, now);
        }

        // 4. Ambient drifting white petals & golden pollen
        if (Math.random() < 0.4) {
          this.spawnFloatingPetal(point, velocity);
        }
        if (Math.random() < 0.3) {
          this.spawnPollenDust(point, velocity);
        }
      }
    } else if (this.mode === 'vine') {
      if (stroke.lastSpawnDist >= 26 * this.brushScale) {
        stroke.lastSpawnDist = 0;
        this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
        if (Math.random() < 0.4) {
          this.spawnTendril(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
        }
      }
    }
  }

  endStroke(trackId) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return null;

    stroke.isFinished = true;
    this.activeStrokes.delete(trackId);
    this.bloomingStrokes.add(stroke);
    return stroke;
  }

  // --- Spawning Photorealistic Daisy Elements ---

  spawnFlower(stroke, point, velocity, sizeMultiplier = 1.0, now = performance.now()) {
    const speed = velocity.speed || 0;
    // Slower hand motion = larger blooming daisy; fast motion = smaller accent blossom
    const baseSize = Math.max(36, 72 - speed * 0.038) * this.brushScale * sizeMultiplier * (0.92 + Math.random() * 0.18);
    
    // Select between photographic daisy variants for natural diversity
    const variant = Math.random() > 0.5 ? 'daisy1' : 'daisy2';
    
    // Natural angle: tangent direction plus subtle organic tilt
    const baseAngle = (velocity.direction || 0) + (Math.random() - 0.5) * 0.6;
    const randomSpin = Math.random() * Math.PI * 2; // Daisies are radially symmetrical with natural variation

    stroke.flowers.push({
      x: point.x,
      y: point.y,
      baseSize,
      variant,
      rotation: randomSpin,
      birthTime: now,
      bloomDuration: 340 + Math.random() * 90 // Smooth 340ms blossoming
    });
  }

  spawnBud(stroke, point, velocity, now = performance.now()) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const angle = (velocity.direction || 0) + side * (0.7 + Math.random() * 0.45);
    const dist = (14 + Math.random() * 18) * this.brushScale;
    const budX = point.x + Math.cos(angle) * dist;
    const budY = point.y + Math.sin(angle) * dist;

    stroke.buds.push({
      x: budX,
      y: budY,
      stemFrom: { x: point.x, y: point.y },
      baseSize: (18 + Math.random() * 12) * this.brushScale,
      angle: angle + Math.PI / 2,
      birthTime: now,
      bloomDuration: 280 + Math.random() * 70
    });
  }

  spawnLeaf(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const leafAngle = dir + sideDirection * (0.65 + Math.random() * 0.5);
    const size = (24 + Math.random() * 26) * this.brushScale;

    stroke.leaves.push({
      x: point.x,
      y: point.y,
      angle: leafAngle - Math.PI / 2,
      size,
      sideDirection,
      birthTime: now,
      bloomDuration: 280 + Math.random() * 80
    });
  }

  spawnTendril(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const tendrilAngle = dir + sideDirection * (0.8 + Math.random() * 0.6);
    const length = (20 + Math.random() * 26) * this.brushScale;

    stroke.tendrils.push({
      x: point.x,
      y: point.y,
      angle: tendrilAngle,
      length,
      sideDirection,
      coils: 1.4 + Math.random() * 1.2,
      birthTime: now,
      bloomDuration: 320 + Math.random() * 80
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
        // Pollen floating turbulence
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

  // --- Main Rendering Pipeline ---

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
        // Bake stroke permanently into crisp buffer
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

  drawStroke(ctx, stroke, now = performance.now()) {
    if (stroke.smoothPoints.length === 0) return;

    if (stroke.mode === 'plain') {
      this.drawPlainLine(ctx, stroke);
      return;
    }

    ctx.save();

    // 1. Organic Backbone Vine Stem
    this.drawStem(ctx, stroke);

    // 2. Curling Tendrils
    this.drawTendrils(ctx, stroke, now);

    // 3. Leaves with Transparent PNG Asset & Shading
    this.drawLeaves(ctx, stroke, now);

    // 4. Daisy Buds
    this.drawBuds(ctx, stroke, now);

    // 5. Photorealistic White Daisies with Alpha Blending & Drop Shadows
    this.drawPhotorealisticDaisies(ctx, stroke, now);

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

  drawStem(ctx, stroke) {
    const pts = stroke.smoothPoints;
    if (pts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = stroke.palette.stemColor || 'rgba(46, 125, 50, 0.9)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(10, 35, 18, 0.35)';
    ctx.shadowBlur = 5;

    // Smooth tapered curve rendering
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      ctx.beginPath();
      ctx.lineWidth = p1.width;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTendrils(ctx, stroke, now) {
    if (!stroke.tendrils) return;

    ctx.save();
    ctx.strokeStyle = stroke.palette.stemColor || 'rgba(46, 125, 50, 0.9)';
    ctx.lineCap = 'round';

    for (const t of stroke.tendrils) {
      const elapsed = now - t.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / t.bloomDuration));
      const bloom = easeOutCubic(progress);
      if (bloom <= 0.05) continue;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);

      ctx.lineWidth = Math.max(0.8, 1.6 * this.brushScale * (1 - bloom * 0.3));
      ctx.beginPath();
      ctx.moveTo(0, 0);

      // Spiraling curly tendril
      const totalLen = t.length * bloom;
      const steps = 18;
      for (let s = 1; s <= steps; s++) {
        const u = s / steps;
        const currentR = totalLen * u;
        const spiralAngle = u * Math.PI * t.coils * t.sideDirection;
        const tx = currentR * Math.cos(spiralAngle * 0.4);
        const ty = currentR * Math.sin(spiralAngle * 0.4) * (0.6 + u * 0.4);
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.restore();
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

      // Soft contact shadow behind foliage
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 5 * bloom;
      ctx.shadowOffsetY = 2 * bloom;

      if (leafImg && leafImg.loaded) {
        // High-Quality Photographic Daisy Leaf PNG
        ctx.drawImage(leafImg, -currentSize * 0.45, -currentSize * 0.85, currentSize, currentSize);
      } else {
        // Procedural organic leaf fallback
        ctx.fillStyle = stroke.palette.leafColor || 'rgba(56, 142, 60, 0.92)';
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
      // Stem leading to bud
      if (bud.stemFrom) {
        ctx.strokeStyle = stroke.palette.stemColor || 'rgba(46, 125, 50, 0.9)';
        ctx.lineWidth = 2.0 * this.brushScale;
        ctx.beginPath();
        ctx.moveTo(bud.stemFrom.x, bud.stemFrom.y);
        ctx.lineTo(bud.x, bud.y);
        ctx.stroke();
      }

      ctx.translate(bud.x, bud.y);
      ctx.rotate(bud.angle);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 4 * bloom;

      if (budImg && budImg.loaded) {
        ctx.drawImage(budImg, -currentSize * 0.5, -currentSize * 0.5, currentSize, currentSize);
      } else {
        // Procedural bud fallback
        ctx.fillStyle = stroke.palette.leafColor || 'rgba(56, 142, 60, 0.92)';
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentSize * 0.2, 0, currentSize * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawPhotorealisticDaisies(ctx, stroke, now) {
    for (const fl of stroke.flowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      const currentSize = fl.baseSize * bloom;
      const img = (fl.variant === 'daisy2' ? this.images.daisy2 : this.images.daisy1);

      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.rotate(fl.rotation + (1 - Math.min(1, progress)) * 0.25);

      // Realistic soft botanical drop shadow under bloom
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8 * bloom;
      ctx.shadowOffsetY = 3 * bloom;

      if (img && img.loaded) {
        // Alpha Blending of High-Resolution Photographic Daisy PNG
        ctx.globalAlpha = Math.min(1.0, progress * 1.5);
        ctx.drawImage(img, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
      } else {
        // Fallback procedural daisy if image is still fetching
        this.drawProceduralDaisyFallback(ctx, currentSize, bloom);
      }

      ctx.restore();
    }
  }

  drawProceduralDaisyFallback(ctx, size, bloom) {
    const r = size * 0.45;
    const centerR = r * 0.35;
    const petals = 24;

    // Petals
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < petals; i++) {
      const a = (i * Math.PI * 2) / petals;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(r * 0.65, 0, r * 0.35, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Golden Eye
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
        // 3D aerodynamic flip flutter
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
        // Golden pollen speck
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
