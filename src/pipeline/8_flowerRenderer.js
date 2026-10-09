/**
 * Stage 8: Real-Time Continuous Floral Trail & Botanical Rendering Engine
 * 
 * Features:
 * - StreamLine spring-damper stroke stabilizer for ultra-smooth hand drawing.
 * - Distance-based flower placement along smooth Quadratic Bézier / Catmull-Rom splines.
 * - Photorealistic transparent PNG flower assets with organic rotation & size jitter.
 * - Persistent capacity (up to 60 flowers) with smooth blossoming pop animations.
 * - Dual Mode: 'flower' (botanical trail with stems & blossoms) & 'plain' (smooth glowing trail).
 * - Subtle leaves tucked behind petals and floating pollen particle bursts.
 */

import { FLOWER_COLLECTION, FLOWER_LIST } from '../render/palette.js';
import { dist2D } from '../utils/geometry.js';

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export class FlowerRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Mode: 'flower' (floral trail) | 'plain' (line drawing trail)
    this.mode = options.mode || 'flower';

    // Maximum active flowers on canvas (configurable: 50-60)
    this.maxFlowers = options.maxFlowers || 60;
    this.activeFlowerId = 'allMix';

    // Active in-flight strokes (trackId -> StrokeData)
    this.activeStrokes = new Map();

    // Completed strokes & permanent flowers
    this.completedStrokes = [];
    this.flowers = [];

    // Hover & Selection state
    this.hoveredFlower = null;
    this.hoverAlpha = 0;

    // Ambient floating particles
    this.particles = [];
    this.maxParticles = 140;

    // Streamline smoothing coefficient (0.0 = raw, 0.7 = super smooth stream)
    this.smoothingWeight = 0.65;

    // High-Resolution Transparent PNG Photographic Flower Assets
    this.images = {
      pinkDahlia: this.loadImage('/assets/flowers/pink_dahlia.png'),
      purpleRose: this.loadImage('/assets/flowers/purple_rose.png'),
      pinkPlumeriaFrangipani: this.loadImage('/assets/flowers/pink_plumeria_frangipani.png'),
      pinkPlumeria: this.loadImage('/assets/flowers/pink_plumeria.png'),
      blueAfricanDaisy: this.loadImage('/assets/flowers/blue_african_daisy.png'),
      whiteDaisy: this.loadImage('/assets/flowers/white_daisy.png'),
      leaf: this.loadImage('/assets/flowers/daisy_leaf.png'),
      petal: this.loadImage('/assets/flowers/daisy_petal.png')
    };

    // Pre-populate with initial natural welcome blooms
    this.initWelcomeBlooms();
  }

  loadImage(src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    img.onerror = () => {
      // Fallback relative path if running in subfolder
      if (src.startsWith('/')) {
        img.src = '.' + src;
      }
    };
    return img;
  }

  initWelcomeBlooms() {
    const now = performance.now();
    const cx = (this.canvas.width || window.innerWidth) / 2;
    const cy = (this.canvas.height || window.innerHeight) / 2;

    this.flowers = [
      this.createFlowerInstance('pinkDahlia', cx - 110, cy - 20, 105, -0.2, now),
      this.createFlowerInstance('purpleRose', cx, cy + 25, 95, 0.4, now + 100),
      this.createFlowerInstance('whiteDaisy', cx + 115, cy - 10, 100, 0.1, now + 200)
    ];
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setMode(mode) {
    if (mode === 'flower' || mode === 'plain') {
      this.mode = mode;
    }
  }

  toggleMode() {
    this.mode = this.mode === 'flower' ? 'plain' : 'flower';
    return this.mode;
  }

  setFlowerType(flowerId) {
    if (FLOWER_COLLECTION[flowerId]) {
      this.activeFlowerId = flowerId;
    }
  }

  setPalette(id) {
    this.setFlowerType(id);
  }

  resolveFlowerVariety(flowerId = this.activeFlowerId) {
    const config = FLOWER_COLLECTION[flowerId] || FLOWER_COLLECTION.allMix;
    if (config.id === 'allMix') {
      const speciesList = config.species;
      const chosen = speciesList[Math.floor(Math.random() * speciesList.length)];
      return FLOWER_COLLECTION[chosen];
    }
    return config;
  }

  createFlowerInstance(flowerId, x, y, size, rotation, now = performance.now()) {
    const variety = FLOWER_COLLECTION[flowerId] || FLOWER_COLLECTION.pinkDahlia;
    const baseScale = variety.defaultScale || 1.15;
    const finalSize = size || ((85 + Math.random() * 25) * baseScale);
    const finalRot = rotation !== undefined ? rotation : Math.random() * Math.PI * 2;

    // 1-2 small accent leaves tucked behind flowerhead
    const leaves = [];
    if (Math.random() > 0.2) {
      leaves.push({
        angle: finalRot + 0.7 + Math.random() * 0.5,
        size: finalSize * 0.35,
        dist: finalSize * 0.42
      });
    }
    if (Math.random() > 0.4) {
      leaves.push({
        angle: finalRot - 1.1 - Math.random() * 0.5,
        size: finalSize * 0.30,
        dist: finalSize * 0.40
      });
    }

    return {
      id: 'fl_' + Math.random().toString(36).substr(2, 9),
      flowerId: variety.id,
      name: variety.name,
      scientificName: variety.scientificName,
      family: variety.family,
      description: variety.description,
      x,
      y,
      size: finalSize,
      rotation: finalRot,
      leaves,
      birthTime: now,
      bloomDuration: variety.bloomDuration || 350
    };
  }

  // --- Real-time Continuous Stroke Lifecycle with StreamLine Smoothing ---

  startStroke(trackId, point) {
    if (!point) return;
    const now = performance.now();
    const activeVariety = this.resolveFlowerVariety(this.activeFlowerId);

    const stroke = {
      trackId,
      mode: this.mode,
      flowerId: activeVariety.id,
      color: activeVariety.color || '#ec4899',
      // Store raw and smoothed positions
      currentPos: { x: point.x, y: point.y },
      points: [{ x: point.x, y: point.y, time: now }],
      distSinceLastFlower: 0,
      nextFlowerDistance: 36 + Math.random() * 12,
      flowerCount: 0,
      startTime: now
    };

    this.activeStrokes.set(trackId, stroke);

    if (this.mode === 'flower') {
      this.spawnFlowerAtPoint(point.x, point.y, stroke.flowerId, now);
      stroke.flowerCount++;
    }

    this.spawnPollenBurst(point, stroke.color);
  }

  addStrokePoint(trackId, targetPoint) {
    if (!targetPoint) return;
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) {
      this.startStroke(trackId, targetPoint);
      return;
    }

    const now = performance.now();

    // StreamLine / Spring-damper interpolation for silky smooth curve tracking
    const factor = 1.0 - this.smoothingWeight;
    const smoothX = stroke.currentPos.x + (targetPoint.x - stroke.currentPos.x) * factor;
    const smoothY = stroke.currentPos.y + (targetPoint.y - stroke.currentPos.y) * factor;
    stroke.currentPos = { x: smoothX, y: smoothY };

    const lastPoint = stroke.points[stroke.points.length - 1];
    const d = dist2D(lastPoint, stroke.currentPos);

    // Micro-jitter threshold (must move at least 1.5px to add point)
    if (d < 1.5) return;

    stroke.points.push({ x: smoothX, y: smoothY, time: now });
    stroke.distSinceLastFlower += d;

    // Continuous distance-based floral trail placement
    if (stroke.mode === 'flower') {
      while (stroke.distSinceLastFlower >= stroke.nextFlowerDistance) {
        stroke.distSinceLastFlower -= stroke.nextFlowerDistance;
        stroke.nextFlowerDistance = 36 + Math.random() * 12;

        // Sub-pixel position along the current segment
        const t = Math.max(0, Math.min(1, 1 - (stroke.distSinceLastFlower / d)));
        const interpX = lastPoint.x + (smoothX - lastPoint.x) * t;
        const interpY = lastPoint.y + (smoothY - lastPoint.y) * t;

        // Perpendicular organic jitter
        const angle = Math.atan2(smoothY - lastPoint.y, smoothX - lastPoint.x);
        const perpAngle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
        const perpOffset = (Math.random() - 0.5) * 6;

        const spawnX = interpX + Math.cos(perpAngle) * perpOffset;
        const spawnY = interpY + Math.sin(perpAngle) * perpOffset;

        const variety = (this.activeFlowerId === 'allMix')
          ? this.resolveFlowerVariety('allMix')
          : FLOWER_COLLECTION[stroke.flowerId] || FLOWER_COLLECTION.pinkDahlia;

        this.spawnFlowerAtPoint(spawnX, spawnY, variety.id, now);
        stroke.flowerCount++;
      }
    } else {
      if (Math.random() > 0.35) {
        this.spawnPollenBurst({ x: smoothX, y: smoothY }, stroke.color, 1);
      }
    }
  }

  updateStroke(trackId, targetPoint) {
    return this.addStrokePoint(trackId, targetPoint);
  }

  bloomAllFlowers(now = performance.now()) {
    for (const flower of this.flowers) {
      flower.birthTime = now;
      this.spawnPollenBurst({ x: flower.x, y: flower.y }, '#fbbf24', 8);
    }
  }

  renderAmbientParticles(now = performance.now()) {
    this.updateParticles();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderParticles(this.ctx);
  }

  processHands(hands, timestamp = performance.now()) {
    const activeTrackIds = new Set();

    if (hands && hands.length > 0) {
      for (const hand of hands) {
        const trackId = hand.trackId || 'hand_0';
        activeTrackIds.add(trackId);

        const gesture = hand.gesture || 'point';
        const isDrawing = gesture === 'point' || gesture === 'pinch' || gesture === 'none';

        if (isDrawing) {
          const drawPoint = (gesture === 'pinch' && hand.pinchCenter) ? hand.pinchCenter : hand.indexTip;
          if (drawPoint) {
            if (!this.activeStrokes.has(trackId)) {
              this.startStroke(trackId, drawPoint);
            } else {
              this.addStrokePoint(trackId, drawPoint);
            }
          }
        } else {
          if (this.activeStrokes.has(trackId)) {
            this.endStroke(trackId);
          }
        }
      }
    }

    // End strokes for hands no longer present
    for (const [trackId] of this.activeStrokes.entries()) {
      if (trackId !== 'mouse_ptr' && !activeTrackIds.has(trackId)) {
        this.endStroke(trackId);
      }
    }
  }

  addPointerPoint(x, y, now = performance.now()) {
    if (!this.activeStrokes.has('mouse_ptr')) {
      this.startStroke('mouse_ptr', { x, y });
    } else {
      this.addStrokePoint('mouse_ptr', { x, y });
    }
  }

  endPointerStroke() {
    this.endStroke('mouse_ptr');
  }

  endStroke(trackId) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    this.activeStrokes.delete(trackId);

    // If fast tap with no distance, guarantee at least 1 flower
    if (stroke.mode === 'flower' && stroke.flowerCount === 0 && stroke.points.length > 0) {
      const pt = stroke.points[0];
      this.spawnFlowerAtPoint(pt.x, pt.y, stroke.flowerId, performance.now());
      stroke.flowerCount++;
    }

    if (stroke.points.length > 1) {
      this.completedStrokes.push(stroke);
      if (this.completedStrokes.length > 30) {
        this.completedStrokes.shift();
      }
    }
  }

  spawnFlowerAtPoint(x, y, flowerId, now = performance.now()) {
    const newFlower = this.createFlowerInstance(flowerId, x, y, null, undefined, now);
    this.flowers.push(newFlower);

    if (this.flowers.length > this.maxFlowers) {
      this.flowers.shift();
    }

    this.spawnPollenBurst({ x, y }, FLOWER_COLLECTION[flowerId]?.color || '#ec4899', 5);
    return newFlower;
  }

  spawnPollenBurst(point, color = '#fbbf24', count = 5) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * (speed * 0.025),
        vy: Math.sin(angle) * (speed * 0.025) - 0.15,
        size: 2 + Math.random() * 2.5,
        color: color,
        opacity: 0.9,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }
  }

  // --- Hover & Hit Testing ---

  setHoverPoint(point) {
    if (!point) {
      this.hoveredFlower = null;
      return null;
    }
    const hit = this.getFlowerAtPoint(point);
    this.hoveredFlower = hit;
    return hit;
  }

  getFlowerAtPoint(point) {
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const fl = this.flowers[i];
      const dist = Math.hypot(point.x - fl.x, point.y - fl.y);
      if (dist <= fl.size * 0.5) {
        return fl;
      }
    }
    return null;
  }

  // --- Particle Physics ---

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Main Render Pipeline ---

  render() {
    const now = performance.now();
    this.updateParticles();

    // 1. Clear Drawing Canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Render Completed & Active Connecting Stem Trails with Midpoint Béziers
    this.renderStrokeTrails(this.ctx);

    // 3. Render Leaves Behind Flower Heads
    this.renderLeaves(this.ctx, now);

    // 4. Render Photorealistic Blossoms
    this.renderFlowers(this.ctx, now);

    // 5. Render Hover Labels
    this.renderHoverLabel(this.ctx);

    // 6. Render Floating Pollen Particles
    this.renderParticles(this.ctx);
  }

  renderStrokeTrails(ctx) {
    const allStrokes = [...this.completedStrokes, ...Array.from(this.activeStrokes.values())];

    for (const stroke of allStrokes) {
      const pts = stroke.points;
      if (!pts || pts.length < 2) continue;

      ctx.save();

      if (stroke.mode === 'flower') {
        // Natural organic green stem connecting the blossoms
        ctx.strokeStyle = 'rgba(46, 125, 50, 0.45)';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 4;
      } else {
        // Plain Mode: Vibrant glowing neon line trail
        ctx.strokeStyle = stroke.color || '#38bdf8';
        ctx.lineWidth = 5.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = stroke.color || '#38bdf8';
        ctx.shadowBlur = 12;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        // Ultra-smooth Quadratic Bézier through midpoints
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      }

      ctx.stroke();
      ctx.restore();
    }
  }

  renderLeaves(ctx, now) {
    const leafImg = this.images.leaf;

    for (const fl of this.flowers) {
      if (!fl.leaves || fl.leaves.length === 0) continue;

      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);

      for (const leaf of fl.leaves) {
        const lx = fl.x + Math.cos(leaf.angle) * (leaf.dist * bloom);
        const ly = fl.y + Math.sin(leaf.angle) * (leaf.dist * bloom);
        const lSize = leaf.size * bloom;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leaf.angle);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 5 * bloom;

        if (leafImg && leafImg.loaded) {
          ctx.globalAlpha = Math.min(0.85, progress * 1.2);
          ctx.drawImage(leafImg, -lSize * 0.5, -lSize * 0.8, lSize, lSize);
        }

        ctx.restore();
      }
    }
  }

  renderFlowers(ctx, now) {
    for (const fl of this.flowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);

      const size = fl.size * bloom;
      const img = this.images[fl.flowerId] || this.images.pinkDahlia;
      const isHovered = (this.hoveredFlower === fl);

      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.rotate(fl.rotation);

      // Soft natural drop shadow
      ctx.shadowColor = isHovered ? 'rgba(236, 72, 153, 0.55)' : 'rgba(0, 0, 0, 0.32)';
      ctx.shadowBlur = isHovered ? 16 : 8 * bloom;
      ctx.shadowOffsetY = 3 * bloom;

      if (img && (img.loaded || (img.complete && img.naturalWidth > 0))) {
        ctx.globalAlpha = Math.min(1.0, progress * 1.4);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        // Procedural Vector Bloom Fallback
        ctx.globalAlpha = Math.min(1.0, progress * 1.4);
        const petalCount = 8;
        const color = FLOWER_COLLECTION[fl.flowerId]?.color || '#ec4899';
        ctx.fillStyle = color;
        for (let p = 0; p < petalCount; p++) {
          ctx.save();
          ctx.rotate((p * Math.PI * 2) / petalCount);
          ctx.beginPath();
          ctx.ellipse(0, -size * 0.28, size * 0.16, size * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Center pistil
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
      }

      // Highlight ring when hovered
      if (isHovered) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  renderHoverLabel(ctx) {
    if (this.hoveredFlower) {
      this.hoverAlpha = Math.min(1.0, this.hoverAlpha + 0.12);
    } else {
      this.hoverAlpha = Math.max(0.0, this.hoverAlpha - 0.12);
    }

    if (this.hoverAlpha <= 0.02 || !this.hoveredFlower) return;

    const fl = this.hoveredFlower;
    ctx.save();
    ctx.globalAlpha = this.hoverAlpha;

    const labelX = fl.x;
    const labelY = fl.y + fl.size * 0.52 + 12;
    const cardWidth = 170;
    const cardHeight = 40;

    const rx = labelX - cardWidth / 2;
    const ry = labelY;

    // Translucent glass pill
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(rx, ry, cardWidth, cardHeight, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(fl.name || 'Botanical Bloom', labelX, ry + 16);

    ctx.font = 'italic 400 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(fl.scientificName || 'Flora', labelX, ry + 30);

    ctx.restore();
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Canvas Management & Undo ---

  clear() {
    this.flowers = [];
    this.completedStrokes = [];
    this.activeStrokes.clear();
    this.particles = [];
    this.hoveredFlower = null;
  }

  undo() {
    if (this.completedStrokes.length > 0) {
      const removedStroke = this.completedStrokes.pop();
      if (removedStroke.flowerCount > 0) {
        this.flowers.splice(-removedStroke.flowerCount, removedStroke.flowerCount);
      }
      return true;
    } else if (this.flowers.length > 0) {
      this.flowers.pop();
      return true;
    }
    return false;
  }
}
