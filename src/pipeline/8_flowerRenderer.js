/**
 * Stage 8: Procedural Generative Botanical Flower Engine
 * Renders pristine photorealistic White Daisies (matching reference design),
 * multi-tiered ray petals with longitudinal ridges, textured Fibonacci golden disc centers,
 * organic foliage, curling tendrils, real-time blossoming, and physics-driven drifting petals.
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

    this.initCanvasSize();
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
      // Spawn initial cluster with natural bloom timing
      this.spawnLeaf(stroke, point, velocity, -1, now);
      this.spawnLeaf(stroke, point, velocity, 1, now + 30);
      this.spawnFlower(stroke, point, velocity, 1.25, now);
      this.spawnTendril(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
    }
  }

  addStrokePoint(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    const prevRaw = stroke.rawPoints[stroke.rawPoints.length - 1];
    const segmentDist = Math.hypot(point.x - prevRaw.x, point.y - prevRaw.y);

    // Filter out micro-movements to avoid jitter
    if (segmentDist < 2.0) return;

    stroke.rawPoints.push(point);
    stroke.points.push(point);
    const now = performance.now();
    const speed = Math.min(velocity.speed || 0, 1500);

    // Dynamic stem width
    const targetWidth = Math.max(2.4, Math.min(5.5, 4.8 - speed * 0.0025)) * this.brushScale;

    // Spline Interpolation for smooth continuous curvature
    const pts = stroke.rawPoints;
    const len = pts.length;

    if (len >= 3) {
      const p0 = len >= 4 ? pts[len - 4] : pts[len - 3];
      const p1 = pts[len - 3];
      const p2 = pts[len - 2];
      const p3 = pts[len - 1];

      // Step along spline
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

          // Tangent angle along spline
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
      // Dynamic spacing: slower stroke = denser large daisies; faster stroke = spaced buds & flowing tendrils
      const spawnInterval = Math.max(22, Math.min(52, 20 + speed * 0.035)) * this.brushScale;

      if (stroke.lastSpawnDist >= spawnInterval) {
        stroke.lastSpawnDist = 0;

        // 1. Organic foliage & tendrils base
        const side = Math.random() > 0.5 ? 1 : -1;
        this.spawnLeaf(stroke, point, velocity, side, now);

        if (Math.random() < 0.6) {
          this.spawnLeaf(stroke, point, velocity, -side, now + 40);
        }

        if (Math.random() < 0.4) {
          this.spawnTendril(stroke, point, velocity, side, now);
        }

        // 2. Spawn Daisy or Daisy Bud
        const isBud = Math.random() < Math.min(0.35, speed / 700);
        if (isBud) {
          this.spawnBud(stroke, point, velocity, now);
        } else {
          this.spawnFlower(stroke, point, velocity, 1.0, now);
        }

        // 3. Ambient drifting petals & golden pollen
        if (Math.random() < 0.5) {
          this.spawnFloatingPetal(point, velocity, stroke.palette);
        }
        if (Math.random() < 0.35) {
          this.spawnPollenDust(point, velocity);
        }
      }
    } else if (this.mode === 'vine') {
      if (stroke.lastSpawnDist >= 22 * this.brushScale) {
        stroke.lastSpawnDist = 0;
        this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1, now);
        if (Math.random() < 0.5) {
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

  // --- Procedural Generation of Botanical Elements (White Daisy Model) ---

  spawnFlower(stroke, point, velocity, sizeMultiplier = 1.0, now = performance.now()) {
    const speed = velocity.speed || 0;
    // Slower stroke produces large, full radiant daisies
    const baseSize = Math.max(26, 54 - speed * 0.035) * this.brushScale * sizeMultiplier * (0.92 + Math.random() * 0.22);
    const flowerTheme = stroke.palette.flowers[0] || stroke.palette.flowers[Math.floor(Math.random() * stroke.palette.flowers.length)];

    // Exact White Daisy anatomy: 24 to 28 slender ray petals radiating in 2 overlapping concentric tiers
    const petalCount = 24 + Math.floor(Math.random() * 6);
    const angleOffset = Math.random() * Math.PI * 2;
    const tier1Petals = []; // Bottom tier (under-petals with slight shadow)
    const tier2Petals = []; // Top tier (overlapping surface petals)

    const centerRadius = baseSize * 0.34; // Large golden disc floret center (~34% of diameter)

    for (let i = 0; i < petalCount; i++) {
      const angle = angleOffset + (i * Math.PI * 2) / petalCount + (Math.random() - 0.5) * 0.06;
      const petalLength = baseSize * (0.92 + Math.random() * 0.16);
      const petalWidth = baseSize * (0.22 + Math.random() * 0.05);
      const isTopTier = (i % 2 === 1);

      const petalData = {
        angle,
        length: petalLength,
        width: petalWidth,
        tipRoundness: 0.85 + Math.random() * 0.15,
        grooveOffset: (Math.random() - 0.5) * 0.1
      };

      if (isTopTier) {
        tier2Petals.push(petalData);
      } else {
        tier1Petals.push(petalData);
      }
    }

    // Generate textured phyllotaxis stipple dots for center golden disc
    const stipplePoints = [];
    const numStipples = 60;
    const goldenAngle = 2.39996; // 137.5 degrees in radians
    for (let j = 1; j <= numStipples; j++) {
      const r = centerRadius * Math.sqrt(j / numStipples) * 0.92;
      const theta = j * goldenAngle + angleOffset;
      stipplePoints.push({
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        size: (0.9 + Math.random() * 1.2) * this.brushScale,
        isHighlight: Math.random() > 0.45
      });
    }

    // Optional natural dewdrop on petal
    const hasDewdrop = Math.random() < 0.4;
    let dewdrop = null;
    if (hasDewdrop) {
      const dAngle = angleOffset + Math.random() * Math.PI * 2;
      const dDist = baseSize * (0.45 + Math.random() * 0.35);
      dewdrop = {
        x: Math.cos(dAngle) * dDist,
        y: Math.sin(dAngle) * dDist,
        radius: (1.6 + Math.random() * 2.0) * this.brushScale
      };
    }

    stroke.flowers.push({
      x: point.x,
      y: point.y,
      baseSize,
      theme: flowerTheme,
      tier1Petals,
      tier2Petals,
      centerRadius,
      stipplePoints,
      rotation: angleOffset,
      birthTime: now,
      bloomDuration: 380 + Math.random() * 100, // 380-480ms smooth blossoming
      dewdrop
    });
  }

  spawnBud(stroke, point, velocity, now = performance.now()) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const angle = (velocity.direction || 0) + side * (0.75 + Math.random() * 0.5);
    const dist = (14 + Math.random() * 18) * this.brushScale;
    const budX = point.x + Math.cos(angle) * dist;
    const budY = point.y + Math.sin(angle) * dist;

    const flowerTheme = stroke.palette.flowers[0];

    stroke.buds.push({
      x: budX,
      y: budY,
      stemFrom: { x: point.x, y: point.y },
      baseSize: (11 + Math.random() * 9) * this.brushScale,
      theme: flowerTheme,
      angle: angle,
      birthTime: now,
      bloomDuration: 280 + Math.random() * 80
    });
  }

  spawnLeaf(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const leafAngle = dir + sideDirection * (0.65 + Math.random() * 0.55);
    const length = (18 + Math.random() * 24) * this.brushScale;
    const width = length * (0.40 + Math.random() * 0.16);

    stroke.leaves.push({
      x: point.x,
      y: point.y,
      angle: leafAngle,
      length,
      width,
      sideDirection,
      curve: sideDirection * (0.16 + Math.random() * 0.22),
      birthTime: now,
      bloomDuration: 300 + Math.random() * 100
    });
  }

  spawnTendril(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const tendrilAngle = dir + sideDirection * (0.8 + Math.random() * 0.6);
    const length = (20 + Math.random() * 28) * this.brushScale;

    stroke.tendrils.push({
      x: point.x,
      y: point.y,
      angle: tendrilAngle,
      length,
      sideDirection,
      coils: 1.5 + Math.random() * 1.5,
      birthTime: now,
      bloomDuration: 350 + Math.random() * 100
    });
  }

  spawnFloatingPetal(point, velocity, palette) {
    if (this.particles.length >= this.maxParticles) return;

    const speed = Math.min(velocity.speed || 60, 450);
    const driftAngle = (velocity.direction || 0) + (Math.random() - 0.5) * 1.6;

    this.particles.push({
      type: 'petal',
      x: point.x + (Math.random() - 0.5) * 16,
      y: point.y + (Math.random() - 0.5) * 16,
      vx: Math.cos(driftAngle) * (speed * 0.08 + 1.2) + (Math.random() - 0.5) * 1.2,
      vy: Math.sin(driftAngle) * (speed * 0.08) + Math.random() * 1.4 + 0.6,
      size: (8 + Math.random() * 10) * this.brushScale,
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
      angle: 0,
      vAngle: 0,
      opacity: 1.0,
      color: 'rgba(254, 240, 138, 0.95)',
      life: 1.0,
      decay: 0.01 + Math.random() * 0.015
    });
  }

  // --- Physics Simulation ---

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.vAngle;

      if (p.type === 'petal') {
        p.flip += p.vFlip;
        p.vx *= 0.965;
        p.vy = p.vy * 0.965 + 0.045; // Gentle gravity
        p.vAngle *= 0.985;
      } else {
        // Pollen floating air turbulence
        p.vx += (Math.random() - 0.5) * 0.15;
        p.vy -= 0.015; // Floats upwards slightly
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

  // --- Rendering Loop ---

  render() {
    const now = performance.now();
    this.updateParticles();

    // Check finished blooming strokes to bake into permanent buffer
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
        // Bake completed stroke permanently onto buffer canvas
        this.renderStrokeToBuffer(stroke, now);
        this.bloomingStrokes.delete(stroke);
      }
    }

    // 1. Clear drawing canvas and draw permanent buffer
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bufferCanvas, 0, 0);

    // 2. Render completed strokes that are still blooming
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

    // 2. Delicate Curling Tendrils
    this.drawTendrils(ctx, stroke, now);

    // 3. Buds & Accent Stems
    this.drawBuds(ctx, stroke, now);

    // 4. Lush Shaded Foliage Leaves
    this.drawLeaves(ctx, stroke, now);

    // 5. White Daisies with Radiant Multi-Tiered Petals & Golden Textured Disc Core
    this.drawBotanicalFlowers(ctx, stroke, now);

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
    ctx.strokeStyle = stroke.palette.stemColor;
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
    ctx.strokeStyle = stroke.palette.stemColor;
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
    ctx.save();
    const leafHighlight = stroke.palette.leafHighlight || 'rgba(129, 199, 132, 0.88)';
    const leafShadow = stroke.palette.leafShadow || 'rgba(27, 94, 32, 0.95)';

    for (const leaf of stroke.leaves) {
      const elapsed = now - leaf.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / leaf.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      const currentLen = leaf.length * bloom;
      const currentWidth = leaf.width * bloom;

      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.angle + (1 - Math.min(1, progress)) * 0.25 * leaf.sideDirection);

      // 3D shaded leaf gradient with natural sunlight
      const grad = ctx.createLinearGradient(0, -currentWidth * 0.55, 0, currentWidth * 0.55);
      grad.addColorStop(0, leafHighlight);
      grad.addColorStop(0.48, stroke.palette.leafColor);
      grad.addColorStop(1.0, leafShadow);

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 4;

      // Realistic pointed daisy leaf
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        currentLen * 0.32, -currentWidth * 0.9,
        currentLen * 0.72, -currentWidth * 0.6,
        currentLen, 0
      );
      ctx.bezierCurveTo(
        currentLen * 0.72, currentWidth * 0.6,
        currentLen * 0.32, currentWidth * 0.9,
        0, 0
      );
      ctx.fill();

      // Central Midrib Spine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.1 * this.brushScale * bloom;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(currentLen * 0.5, leaf.curve * 6 * bloom, currentLen * 0.92, 0);
      ctx.stroke();

      // Lateral Rib Veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.65 * this.brushScale * bloom;
      for (let v = 0.22; v <= 0.75; v += 0.18) {
        const vx = currentLen * v;
        const ribLen = currentWidth * (0.45 - (v - 0.5) * 0.2);
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + currentLen * 0.14, -ribLen);
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + currentLen * 0.14, ribLen);
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  drawBuds(ctx, stroke, now) {
    if (!stroke.buds) return;

    for (const bud of stroke.buds) {
      const elapsed = now - bud.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / bud.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.05) continue;

      const currentSize = bud.baseSize * bloom;

      ctx.save();
      // Stem leading to bud
      if (bud.stemFrom) {
        ctx.strokeStyle = stroke.palette.stemColor;
        ctx.lineWidth = 2.0 * this.brushScale;
        ctx.beginPath();
        ctx.moveTo(bud.stemFrom.x, bud.stemFrom.y);
        ctx.lineTo(bud.x, bud.y);
        ctx.stroke();
      }

      ctx.translate(bud.x, bud.y);
      ctx.rotate(bud.angle);

      // Green Calyx Base Sepals
      ctx.fillStyle = stroke.palette.leafColor;
      ctx.beginPath();
      ctx.moveTo(-currentSize * 0.45, 0);
      ctx.lineTo(0, -currentSize * 0.35);
      ctx.lineTo(currentSize * 0.45, 0);
      ctx.closePath();
      ctx.fill();

      // Daisy Bud: emerging crisp white petal tips & golden core
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        currentSize * 0.4, -currentSize * 0.6,
        currentSize * 0.85, -currentSize * 0.35,
        currentSize, 0
      );
      ctx.bezierCurveTo(
        currentSize * 0.85, currentSize * 0.35,
        currentSize * 0.4, currentSize * 0.6,
        0, 0
      );
      ctx.fill();

      // Peek of golden yellow center
      ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
      ctx.beginPath();
      ctx.arc(currentSize * 0.35, 0, currentSize * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawBotanicalFlowers(ctx, stroke, now) {
    for (const fl of stroke.flowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      ctx.save();
      ctx.translate(fl.x, fl.y);
      // Organic rotational bloom
      ctx.rotate(fl.rotation + (1 - Math.min(1, progress)) * 0.25);

      const currentCenterRadius = fl.centerRadius * bloom;

      // 1. Soft atmospheric drop shadow under the daisy
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 8 * bloom;

      // 2. LAYER 1: Bottom Tier Ray Petals (Under-petals with depth shadow)
      if (fl.tier1Petals) {
        for (const petal of fl.tier1Petals) {
          this.drawSingleDaisyPetal(ctx, petal, bloom, true, fl.theme);
        }
      }

      // 3. LAYER 2: Top Tier Ray Petals (Overlapping crisp white surface petals)
      if (fl.tier2Petals) {
        for (const petal of fl.tier2Petals) {
          this.drawSingleDaisyPetal(ctx, petal, bloom, false, fl.theme);
        }
      }

      // 4. LAYER 3: Golden-Yellow Disc Core (Fibonacci textured dome center)
      this.drawDaisyCenterDisc(ctx, fl, currentCenterRadius, bloom);

      // 5. Realistic Glassy Dewdrop on Petal
      if (fl.dewdrop && bloom > 0.6) {
        const d = fl.dewdrop;
        const dRadius = d.radius * bloom;

        ctx.save();
        // Drop shadow under drop
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(d.x + 0.8, d.y + 0.8, dRadius, 0, Math.PI * 2);
        ctx.fill();

        // Water droplet lens gradient
        const dropGrad = ctx.createRadialGradient(d.x - dRadius * 0.3, d.y - dRadius * 0.3, 0.5, d.x, d.y, dRadius);
        dropGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
        dropGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
        dropGrad.addColorStop(1.0, 'rgba(100, 100, 150, 0.2)');

        ctx.fillStyle = dropGrad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, dRadius, 0, Math.PI * 2);
        ctx.fill();

        // White specular glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.beginPath();
        ctx.arc(d.x - dRadius * 0.35, d.y - dRadius * 0.35, dRadius * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  drawSingleDaisyPetal(ctx, petal, bloom, isBottomTier, theme) {
    ctx.save();
    ctx.rotate(petal.angle);

    const pLen = petal.length * bloom;
    const pWidth = petal.width * bloom;

    // Multi-stop radial/linear gradient along petal:
    // Warm golden-ivory base near disc -> Crisp pure white body -> Translucent edge
    const grad = ctx.createLinearGradient(0, 0, pLen, 0);
    if (isBottomTier) {
      grad.addColorStop(0, theme.petalBase || 'rgba(254, 240, 138, 0.5)');
      grad.addColorStop(0.2, theme.secondary || 'rgba(241, 245, 249, 0.96)');
      grad.addColorStop(0.7, theme.primary || 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(1.0, theme.petalShadow || 'rgba(203, 213, 225, 0.7)');
    } else {
      grad.addColorStop(0, theme.petalBase || 'rgba(254, 240, 138, 0.45)');
      grad.addColorStop(0.18, theme.secondary || 'rgba(248, 250, 252, 0.98)');
      grad.addColorStop(0.65, theme.primary || 'rgba(255, 255, 255, 0.99)');
      grad.addColorStop(1.0, theme.primary || 'rgba(255, 255, 255, 0.99)');
    }

    ctx.fillStyle = grad;

    // Slender oval petal with subtle notched 3-lobed tip matching reference
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Top side curve
    ctx.bezierCurveTo(
      pLen * 0.28, -pWidth * 0.7,
      pLen * 0.75, -pWidth * 0.55,
      pLen, 0
    );
    // Bottom side curve
    ctx.bezierCurveTo(
      pLen * 0.75, pWidth * 0.55,
      pLen * 0.28, pWidth * 0.7,
      0, 0
    );
    ctx.fill();

    // Longitudinal Ridges / Furrows (characteristic of real daisy petals)
    const grooveColor = isBottomTier
      ? (theme.petalShadow || 'rgba(203, 213, 225, 0.45)')
      : (theme.petalGroove || 'rgba(226, 232, 240, 0.6)');
    
    ctx.strokeStyle = grooveColor;
    ctx.lineWidth = 0.75 * this.brushScale * bloom;

    // Central longitudinal ridge
    ctx.beginPath();
    ctx.moveTo(pLen * 0.15, 0);
    ctx.lineTo(pLen * 0.88, 0);
    ctx.stroke();

    // Side delicate ridge
    ctx.lineWidth = 0.5 * this.brushScale * bloom;
    ctx.beginPath();
    ctx.moveTo(pLen * 0.22, -pWidth * 0.18);
    ctx.lineTo(pLen * 0.82, -pWidth * 0.1);
    ctx.moveTo(pLen * 0.22, pWidth * 0.18);
    ctx.lineTo(pLen * 0.82, pWidth * 0.1);
    ctx.stroke();

    ctx.restore();
  }

  drawDaisyCenterDisc(ctx, fl, centerRadius, bloom) {
    ctx.save();

    // 1. Soft contact shadow around center rim
    const rimGrad = ctx.createRadialGradient(0, 0, centerRadius * 0.65, 0, 0, centerRadius * 1.08);
    rimGrad.addColorStop(0, 'rgba(217, 119, 6, 0)');
    rimGrad.addColorStop(0.85, 'rgba(180, 83, 9, 0.55)');
    rimGrad.addColorStop(1.0, 'rgba(146, 64, 14, 0.8)');

    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius * 1.05, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main Golden Yellow Dome Base Gradient
    const domeGrad = ctx.createRadialGradient(
      -centerRadius * 0.2, -centerRadius * 0.2, centerRadius * 0.1,
      0, 0, centerRadius
    );
    domeGrad.addColorStop(0, fl.theme.centerHighlight || '#fde047');
    domeGrad.addColorStop(0.45, fl.theme.center || '#f59e0b');
    domeGrad.addColorStop(0.88, fl.theme.throat || '#d97706');
    domeGrad.addColorStop(1.0, '#b45309');

    ctx.fillStyle = domeGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 5 * bloom;

    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Stipple granular disc florets (Fibonacci spiral texture matching real daisy eye)
    if (fl.stipplePoints && bloom > 0.4) {
      for (const pt of fl.stipplePoints) {
        ctx.fillStyle = pt.isHighlight
          ? (fl.theme.stippleLight || 'rgba(254, 249, 195, 0.95)')
          : (fl.theme.stippleDark || 'rgba(180, 83, 9, 0.8)');

        ctx.beginPath();
        ctx.arc(pt.x * bloom, pt.y * bloom, pt.size * bloom, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Subtle central crown ring depression
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 1.0 * this.brushScale * bloom;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.opacity;

      if (p.type === 'petal') {
        // Tumbling 3D flutter effect using cosine flip
        ctx.scale(Math.cos(p.flip), 1.0);

        // White daisy petal gradient
        const grad = ctx.createLinearGradient(0, -p.size * 0.35, p.size, p.size * 0.35);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.98)');
        grad.addColorStop(1.0, 'rgba(241, 245, 249, 0.95)');

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(p.size * 0.35, -p.size * 0.5, p.size * 0.8, -p.size * 0.35, p.size, 0);
        ctx.bezierCurveTo(p.size * 0.8, p.size * 0.35, p.size * 0.35, p.size * 0.5, 0, 0);
        ctx.fill();
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
