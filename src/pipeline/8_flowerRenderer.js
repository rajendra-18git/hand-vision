/**
 * Stage 8: Interactive Botanical Flower Garden Engine
 * Renders 6 distinct photorealistic flower varieties (Pink Dahlia, Purple Rose, 
 * Pink Plumeria Frangipani, Vibrant Pink Plumeria, Blue African Daisy, White Daisy),
 * with natural clustering, pinch repositioning, interactive hover labels,
 * and 60fps real-time blossoming.
 */

import { FLOWER_COLLECTION, FLOWER_LIST } from '../render/palette.js';

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

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

    // Current active flower selection
    this.activeFlowerId = 'allMix';
    this.mode = 'flower'; // 'flower' | 'plain'
    this.brushScale = 1.25;

    // Active in-flight strokes and blooming queue
    this.activeStrokes = new Map();
    this.bloomingStrokes = new Set();
    this.allFlowers = []; // Master list of all placed flowers for hover / inspection

    // Interactive Hover & Drag State
    this.hoveredFlower = null;
    this.hoverAlpha = 0;
    this.draggedFlower = null;

    // Floating particles (petals & golden pollen dust)
    this.particles = [];
    this.maxParticles = 350;

    // Preload All Transparent Photographic Flower Assets
    this.images = {
      pinkDahlia: this.loadImage('./assets/flowers/pink_dahlia.png'),
      purpleRose: this.loadImage('./assets/flowers/purple_rose.png'),
      pinkPlumeriaFrangipani: this.loadImage('./assets/flowers/pink_plumeria_frangipani.png'),
      pinkPlumeria: this.loadImage('./assets/flowers/pink_plumeria.png'),
      blueAfricanDaisy: this.loadImage('./assets/flowers/blue_african_daisy.png'),
      whiteDaisy: this.loadImage('./assets/flowers/white_daisy.png'),
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
    img.onload = () => { img.loaded = true; };
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

  setFlowerType(flowerId) {
    if (FLOWER_COLLECTION[flowerId]) {
      this.activeFlowerId = flowerId;
    }
  }

  // Backward compatibility alias for setPalette
  setPalette(id) {
    this.setFlowerType(id);
  }

  setMode(mode) {
    this.mode = mode;
  }

  setBrushScale(scale) {
    this.brushScale = Math.max(0.5, Math.min(3.0, scale));
  }

  // Determine flower variety to spawn based on current selection
  resolveFlowerVariety(flowerId = this.activeFlowerId) {
    const config = FLOWER_COLLECTION[flowerId] || FLOWER_COLLECTION.allMix;
    if (config.id === 'allMix') {
      const speciesList = config.species;
      const chosen = speciesList[Math.floor(Math.random() * speciesList.length)];
      return FLOWER_COLLECTION[chosen];
    }
    return config;
  }

  // --- Stroke Lifecycle with Spline Smoothing ---

  startStroke(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const now = performance.now();
    const stroke = {
      trackId,
      points: [point],
      rawPoints: [point],
      smoothPoints: [{ x: point.x, y: point.y, width: 2.2 * this.brushScale }],
      startTime: now,
      flowerId: this.activeFlowerId,
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
      this.spawnFlowerCluster(stroke, point, velocity, now, true);
    }
  }

  addStrokePoint(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    const prevRaw = stroke.rawPoints[stroke.rawPoints.length - 1];
    const segmentDist = Math.hypot(point.x - prevRaw.x, point.y - prevRaw.y);

    if (segmentDist < 2.0) return;

    stroke.rawPoints.push(point);
    stroke.points.push(point);
    const now = performance.now();
    const speed = Math.min(velocity.speed || 0, 1500);

    const targetWidth = Math.max(1.6, Math.min(3.2, 2.6 - speed * 0.001)) * this.brushScale;

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
      // Dense spacing: no gaps between blossoms
      const spawnInterval = Math.max(18, Math.min(34, 16 + speed * 0.015)) * this.brushScale;

      if (stroke.lastSpawnDist >= spawnInterval) {
        stroke.lastSpawnDist = 0;
        this.spawnFlowerCluster(stroke, point, velocity, now, false);
      }
    }
  }

  /**
   * Spawns a dense, layered floral arrangement:
   * 85-90% prominent flowers, 10-15% subtle background leaves.
   */
  spawnFlowerCluster(stroke, point, velocity, now, isInitial = false) {
    const speed = velocity.speed || 0;
    const dir = velocity.direction || 0;
    const perpAngle = dir + Math.PI / 2;

    const variety = this.resolveFlowerVariety(stroke.flowerId);
    const heroSize = Math.max(54, 96 - speed * 0.035) * this.brushScale * (variety.defaultScale || 1.2) * (0.92 + Math.random() * 0.18);

    // 1. Hero Main Flower
    const heroFlower = {
      id: 'fl_' + Math.random().toString(36).substr(2, 9),
      flowerId: variety.id,
      name: variety.name,
      scientificName: variety.scientificName,
      family: variety.family,
      description: variety.description,
      x: point.x + (Math.random() - 0.5) * 6,
      y: point.y + (Math.random() - 0.5) * 6,
      size: heroSize,
      rotation: Math.random() * Math.PI * 2,
      birthTime: now,
      bloomDuration: variety.bloomDuration || 350,
      layer: 2
    };
    stroke.flowers.push(heroFlower);
    this.allFlowers.push(heroFlower);

    // 2. Companion Overlapping Flower (65% chance)
    if (isInitial || Math.random() < 0.68) {
      const companionVariety = this.resolveFlowerVariety(stroke.flowerId);
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = (16 + Math.random() * 26) * this.brushScale;
      const offsetAngle = perpAngle + (Math.random() - 0.5) * 0.8;
      const compSize = heroSize * (0.76 + Math.random() * 0.22);

      const compFlower = {
        id: 'fl_' + Math.random().toString(36).substr(2, 9),
        flowerId: companionVariety.id,
        name: companionVariety.name,
        scientificName: companionVariety.scientificName,
        family: companionVariety.family,
        description: companionVariety.description,
        x: point.x + Math.cos(offsetAngle) * offsetDist * side,
        y: point.y + Math.sin(offsetAngle) * offsetDist * side,
        size: compSize,
        rotation: Math.random() * Math.PI * 2,
        birthTime: now + 30,
        bloomDuration: (companionVariety.bloomDuration || 350) * 0.9,
        layer: 1
      };
      stroke.flowers.push(compFlower);
      this.allFlowers.push(compFlower);
    }

    // 3. Subtle Background Leaf (12-16% chance, strictly behind flowers)
    if (Math.random() < 0.14) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.spawnLeaf(stroke, point, velocity, side, now);
    }

    // 4. Ambient Drifting Petals & Pollen
    if (Math.random() < 0.35) {
      this.spawnFloatingPetal(point, velocity, variety);
    }
    if (Math.random() < 0.30) {
      this.spawnPollenDust(point, velocity, variety.color);
    }
  }

  spawnLeaf(stroke, point, velocity, sideDirection = 1, now = performance.now()) {
    const dir = velocity.direction || 0;
    const leafAngle = dir + sideDirection * (0.7 + Math.random() * 0.5);
    const size = (22 + Math.random() * 18) * this.brushScale;

    stroke.leaves.push({
      x: point.x,
      y: point.y,
      angle: leafAngle - Math.PI / 2,
      size,
      birthTime: now,
      bloomDuration: 260 + Math.random() * 60
    });
  }

  spawnFloatingPetal(point, velocity, variety) {
    if (this.particles.length >= this.maxParticles) return;

    const speed = Math.min(velocity.speed || 60, 450);
    const driftAngle = (velocity.direction || 0) + (Math.random() - 0.5) * 1.6;

    this.particles.push({
      type: 'petal',
      color: variety.color || '#ffffff',
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

  spawnPollenDust(point, velocity, color = '#facc15') {
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
      color: color,
      life: 1.0,
      decay: 0.01 + Math.random() * 0.015
    });
  }

  // Open Palm: Blossom shower cluster burst
  spawnBlossomBurst(point, flowerId = this.activeFlowerId) {
    const now = performance.now();
    const burstStroke = {
      trackId: 'burst_' + Math.random().toString(36).substr(2, 6),
      points: [point],
      rawPoints: [point],
      smoothPoints: [{ x: point.x, y: point.y, width: 2 }],
      startTime: now,
      flowerId,
      mode: 'flower',
      lastSpawnDist: 0,
      totalDistance: 0,
      flowers: [],
      leaves: [],
      buds: [],
      isFinished: true
    };

    // Burst of 4-6 diverse flowers in a ring
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + (Math.random() - 0.5) * 0.4;
      const dist = (18 + Math.random() * 32) * this.brushScale;
      const bx = point.x + Math.cos(angle) * dist;
      const by = point.y + Math.sin(angle) * dist;
      const variety = this.resolveFlowerVariety(flowerId);
      const size = (60 + Math.random() * 35) * this.brushScale;

      const fl = {
        id: 'fl_' + Math.random().toString(36).substr(2, 9),
        flowerId: variety.id,
        name: variety.name,
        scientificName: variety.scientificName,
        family: variety.family,
        description: variety.description,
        x: bx,
        y: by,
        size,
        rotation: Math.random() * Math.PI * 2,
        birthTime: now + i * 40,
        bloomDuration: 340 + Math.random() * 80,
        layer: (i % 2 === 0 ? 2 : 1)
      };
      burstStroke.flowers.push(fl);
      this.allFlowers.push(fl);
    }

    // Shower of floating petals
    for (let p = 0; p < 8; p++) {
      this.spawnFloatingPetal(point, { speed: 180, direction: Math.random() * Math.PI * 2 }, this.resolveFlowerVariety(flowerId));
    }

    this.bloomingStrokes.add(burstStroke);
  }

  endStroke(trackId) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return null;

    stroke.isFinished = true;
    this.activeStrokes.delete(trackId);
    this.bloomingStrokes.add(stroke);
    return stroke;
  }

  // --- Interactive Hover & Inspection ---

  setHoverCursor(point) {
    if (!point) {
      this.hoveredFlower = null;
      return;
    }

    let closest = null;
    let minDist = 65 * this.brushScale;

    // Search recent placed flowers near pointer
    for (let i = this.allFlowers.length - 1; i >= 0; i--) {
      const fl = this.allFlowers[i];
      const dist = Math.hypot(point.x - fl.x, point.y - fl.y);
      if (dist < fl.size * 0.55 && dist < minDist) {
        minDist = dist;
        closest = fl;
        break;
      }
    }

    this.hoveredFlower = closest;
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
        p.vy = p.vy * 0.965 + 0.045;
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

    // 4. Render floating physics particles
    this.renderParticles(this.ctx);

    // 5. Render Interactive Flower Inspection Label
    this.renderHoverLabel(this.ctx);
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

    // 1. Subtle Thin Background Green Stem (Never covers flowers)
    this.drawSubtleStem(ctx, stroke);

    // 2. Small Background Accent Leaves (Behind flowers)
    this.drawLeaves(ctx, stroke, now);

    // 3. Dominant High-Definition Flower Arrangement (Front & Center)
    this.drawFlowers(ctx, stroke, now);

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
    ctx.strokeStyle = 'rgba(46, 125, 50, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      ctx.beginPath();
      ctx.lineWidth = Math.min(2.5, p1.width * 0.55);
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

      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = 4 * bloom;

      if (leafImg && leafImg.loaded) {
        ctx.globalAlpha = Math.min(0.9, progress * 1.2);
        ctx.drawImage(leafImg, -currentSize * 0.45, -currentSize * 0.85, currentSize, currentSize);
      }

      ctx.restore();
    }
  }

  drawFlowers(ctx, stroke, now) {
    const sortedFlowers = [...stroke.flowers].sort((a, b) => (a.layer || 1) - (b.layer || 1));

    for (const fl of sortedFlowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);
      if (bloom <= 0.02) continue;

      const currentSize = fl.size * bloom;
      const img = this.images[fl.flowerId] || this.images.whiteDaisy;

      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.rotate(fl.rotation + (1 - Math.min(1, progress)) * 0.2);

      // Soft botanical shadow under flower head
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8 * bloom;
      ctx.shadowOffsetY = 3 * bloom;

      if (img && img.loaded) {
        ctx.globalAlpha = Math.min(1.0, progress * 1.6);
        ctx.drawImage(img, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
      } else {
        // Fallback drawing if image still fetching
        this.drawProceduralFallback(ctx, fl.flowerId, currentSize);
      }

      ctx.restore();
    }
  }

  drawProceduralFallback(ctx, flowerId, size) {
    const r = size * 0.45;
    ctx.fillStyle = flowerId.includes('Rose') ? '#9333ea' : (flowerId.includes('Plumeria') ? '#f43f5e' : (flowerId.includes('Blue') ? '#3b82f6' : '#ec4899'));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Interactive In-Canvas Botanical Hover Label ---

  renderHoverLabel(ctx) {
    if (this.hoveredFlower) {
      this.hoverAlpha = Math.min(1.0, this.hoverAlpha + 0.08);
    } else {
      this.hoverAlpha = Math.max(0.0, this.hoverAlpha - 0.08);
    }

    if (this.hoverAlpha <= 0.01 || !this.hoveredFlower) return;

    const fl = this.hoveredFlower;
    ctx.save();
    ctx.globalAlpha = this.hoverAlpha;

    const labelX = fl.x + fl.size * 0.45;
    const labelY = fl.y - fl.size * 0.35;
    const paddingX = 14;
    const paddingY = 10;
    const width = 190;
    const height = 54;

    // Glowing halo ring around inspected flower
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fl.x, fl.y, fl.size * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    // Frosted glass card backdrop
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, width, height, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Common Name
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fl.name || 'Botanical Bloom', labelX + paddingX, labelY + paddingY + 12);

    // Binomial Scientific Name in Italics
    ctx.font = 'italic 400 11px Inter, sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(fl.scientificName || fl.family || 'Flora', labelX + paddingX, labelY + paddingY + 28);

    ctx.restore();
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
          ctx.fillStyle = p.color || '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.3, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'pollen') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Clear canvas & flower registry
  clear() {
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.activeStrokes.clear();
    this.bloomingStrokes.clear();
    this.allFlowers = [];
    this.hoveredFlower = null;
    this.particles = [];
  }

  // Restore history snapshot
  restoreStrokes(strokes) {
    this.clear();
    const now = performance.now();
    for (const stroke of strokes) {
      this.renderStrokeToBuffer(stroke, now + 10000);
      if (stroke.flowers) {
        this.allFlowers.push(...stroke.flowers);
      }
    }
    this.render();
  }
}
