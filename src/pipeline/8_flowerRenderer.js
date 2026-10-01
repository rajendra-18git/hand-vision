/**
 * Stage 8: Procedural Generative Watercolor Flower & Botanical Garland Engine
 * Renders rich petunia garlands, realistic veined petals, lush foliage,
 * and physics-driven drifting petals matching high-detail botanical art.
 */

import { PALETTES } from '../render/palette.js';

export class FlowerRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Offscreen buffer for permanent completed strokes
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCtx = this.bufferCanvas.getContext('2d');

    // Default to the rich Petunia Garland palette
    this.palette = PALETTES.petuniaGarland || PALETTES.sakura;
    this.mode = 'flower'; // 'flower' | 'plain' | 'vine'
    this.brushScale = 1.15;

    // Active strokes being drawn per trackId
    this.activeStrokes = new Map();

    // Active floating/settling particles with physics
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

  // --- Stroke Lifecycle ---

  startStroke(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = {
      trackId,
      points: [point],
      startTime: performance.now(),
      palette: this.palette,
      mode: this.mode,
      lastSpawnDist: 0,
      totalDistance: 0,
      flowers: [],
      leaves: [],
      buds: []
    };

    this.activeStrokes.set(trackId, stroke);

    if (this.mode === 'flower') {
      // Spawn initial lush cluster
      this.spawnLeaf(stroke, point, velocity, -1);
      this.spawnLeaf(stroke, point, velocity, 1);
      this.spawnFlower(stroke, point, velocity, 1.25);
    }
  }

  addStrokePoint(trackId, point, velocity = { speed: 0, direction: 0 }) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return;

    const prevPoint = stroke.points[stroke.points.length - 1];
    const segmentDist = Math.hypot(point.x - prevPoint.x, point.y - prevPoint.y);

    // Avoid clustering redundant points
    if (segmentDist < 2.5) return;

    stroke.points.push(point);
    stroke.totalDistance += segmentDist;
    stroke.lastSpawnDist += segmentDist;

    const speed = Math.min(velocity.speed || 0, 1200);

    if (this.mode === 'flower') {
      // Denser spawn interval for a continuous, lush garland like the reference illustration
      const spawnInterval = Math.max(16, Math.min(42, 14 + speed * 0.03)) * this.brushScale;

      if (stroke.lastSpawnDist >= spawnInterval) {
        stroke.lastSpawnDist = 0;

        // 1. Always spawn leaves layered at the base of the flower
        if (Math.random() < 0.85) {
          this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1);
        }
        if (Math.random() < 0.5) {
          this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1);
        }

        // 2. Spawn Main Botanical Flower or Accent Bud
        const isBud = Math.random() < Math.min(0.35, speed / 800);
        if (isBud) {
          this.spawnBud(stroke, point, velocity);
        } else {
          this.spawnFlower(stroke, point, velocity);
        }

        // 3. Spawn floating breeze petals with physics
        if (Math.random() < 0.45) {
          this.spawnFloatingPetal(point, velocity, stroke.palette);
        }
      }
    } else if (this.mode === 'vine') {
      if (stroke.lastSpawnDist >= 22 * this.brushScale) {
        stroke.lastSpawnDist = 0;
        this.spawnLeaf(stroke, point, velocity, Math.random() > 0.5 ? 1 : -1);
      }
    }
  }

  endStroke(trackId) {
    const stroke = this.activeStrokes.get(trackId);
    if (!stroke) return null;

    this.renderStrokeToBuffer(stroke);
    this.activeStrokes.delete(trackId);
    return stroke;
  }

  // --- Procedural Generation of Botanical Elements ---

  spawnFlower(stroke, point, velocity, sizeMultiplier = 1.0) {
    const speed = velocity.speed || 0;
    // Slower stroke = larger blooming petunias
    const baseSize = (Math.max(18, 44 - speed * 0.035) * this.brushScale * sizeMultiplier);
    const flowerTypeIndex = Math.floor(Math.random() * stroke.palette.flowers.length);
    const flowerTheme = stroke.palette.flowers[flowerTypeIndex];

    const numPetals = 5; // Petunias naturally have 5 broad fused flared petals
    const angleOffset = Math.random() * Math.PI * 2;
    const petals = [];

    for (let i = 0; i < numPetals; i++) {
      const angle = angleOffset + (i * Math.PI * 2) / numPetals;
      const petalLength = baseSize * (0.85 + Math.random() * 0.25);
      const petalWidth = petalLength * (0.65 + Math.random() * 0.2);
      petals.push({
        angle,
        length: petalLength,
        width: petalWidth,
        veinCount: 3 + Math.floor(Math.random() * 2)
      });
    }

    stroke.flowers.push({
      x: point.x,
      y: point.y,
      baseSize,
      theme: flowerTheme,
      petals,
      throatRadius: Math.max(5, baseSize * 0.35),
      centerRadius: Math.max(3, baseSize * 0.18),
      rotation: angleOffset
    });
  }

  spawnBud(stroke, point, velocity) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const angle = (velocity.direction || 0) + side * (0.8 + Math.random() * 0.5);
    const dist = (12 + Math.random() * 18) * this.brushScale;
    const budX = point.x + Math.cos(angle) * dist;
    const budY = point.y + Math.sin(angle) * dist;

    const flowerTheme = stroke.palette.flowers[Math.floor(Math.random() * stroke.palette.flowers.length)];

    stroke.buds.push({
      x: budX,
      y: budY,
      stemFrom: { x: point.x, y: point.y },
      baseSize: (9 + Math.random() * 10) * this.brushScale,
      theme: flowerTheme,
      angle: angle,
      color: flowerTheme.throat || flowerTheme.secondary
    });
  }

  spawnLeaf(stroke, point, velocity, sideDirection = 1) {
    const dir = velocity.direction || 0;
    const leafAngle = dir + sideDirection * (0.7 + Math.random() * 0.6);
    const length = (16 + Math.random() * 22) * this.brushScale;
    const width = length * (0.42 + Math.random() * 0.18);

    stroke.leaves.push({
      x: point.x,
      y: point.y,
      angle: leafAngle,
      length,
      width,
      curve: sideDirection * (0.15 + Math.random() * 0.25)
    });
  }

  spawnFloatingPetal(point, velocity, palette) {
    if (this.particles.length >= this.maxParticles) return;

    const flowerTheme = palette.flowers[Math.floor(Math.random() * palette.flowers.length)];
    const speed = Math.min(velocity.speed || 50, 400);
    const driftAngle = (velocity.direction || 0) + (Math.random() - 0.5) * 1.5;

    this.particles.push({
      x: point.x + (Math.random() - 0.5) * 20,
      y: point.y + (Math.random() - 0.5) * 20,
      vx: Math.cos(driftAngle) * (speed * 0.08) + (Math.random() - 0.5) * 1.5,
      vy: Math.sin(driftAngle) * (speed * 0.08) + Math.random() * 1.2 + 0.5,
      size: (6 + Math.random() * 9) * this.brushScale,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.06,
      opacity: 0.95,
      color: flowerTheme.secondary || flowerTheme.primary,
      life: 1.0,
      decay: 0.005 + Math.random() * 0.006
    });
  }

  // --- Physics ---

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.vAngle;

      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + 0.05;
      p.vAngle *= 0.98;

      p.life -= p.decay;
      p.opacity = Math.max(0, p.life);

      if (p.life <= 0 || p.y > this.canvas.height + 60) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Rendering Passes ---

  render() {
    this.updateParticles();

    // 1. Clear drawing canvas and draw permanent buffer
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.bufferCanvas, 0, 0);

    // 2. Render active in-flight strokes
    for (const stroke of this.activeStrokes.values()) {
      this.drawStroke(this.ctx, stroke);
    }

    // 3. Render floating physics particles (petals)
    this.renderParticles(this.ctx);
  }

  renderStrokeToBuffer(stroke) {
    this.drawStroke(this.bufferCtx, stroke);
  }

  drawStroke(ctx, stroke) {
    if (stroke.points.length === 0) return;

    if (stroke.mode === 'plain') {
      this.drawPlainLine(ctx, stroke);
      return;
    }

    ctx.save();

    // 1. Backbone Vine / Garland Stem
    this.drawStem(ctx, stroke);

    // 2. Trailing Buds & Stems
    this.drawBuds(ctx, stroke);

    // 3. Lush Background Foliage Leaves
    this.drawLeaves(ctx, stroke);

    // 4. Blooming Botanical Flowers (Petunias / Orchids with Veins & Ruffles)
    this.drawBotanicalFlowers(ctx, stroke);

    ctx.restore();
  }

  drawPlainLine(ctx, stroke) {
    if (stroke.points.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.0 * this.brushScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 8;

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawStem(ctx, stroke) {
    const points = stroke.points;
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = stroke.palette.stemColor;
    ctx.lineWidth = 4.0 * this.brushScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(10, 30, 15, 0.4)';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  drawLeaves(ctx, stroke) {
    ctx.save();
    const leafHighlight = stroke.palette.leafHighlight || 'rgba(110, 195, 125, 0.85)';
    const leafShadow = stroke.palette.leafShadow || 'rgba(20, 60, 35, 0.95)';

    for (const leaf of stroke.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.angle);

      // Realistic 3D shaded leaf gradient
      const grad = ctx.createLinearGradient(0, -leaf.width * 0.5, 0, leaf.width * 0.5);
      grad.addColorStop(0, leafHighlight);
      grad.addColorStop(0.5, stroke.palette.leafColor);
      grad.addColorStop(1.0, leafShadow);

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;

      // Realistic curved pointed leaf
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        leaf.length * 0.35, -leaf.width * 0.85,
        leaf.length * 0.75, -leaf.width * 0.55,
        leaf.length, 0
      );
      ctx.bezierCurveTo(
        leaf.length * 0.75, leaf.width * 0.55,
        leaf.length * 0.35, leaf.width * 0.85,
        0, 0
      );
      ctx.fill();

      // Leaf Central Spine & Subtle Ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.0 * this.brushScale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(leaf.length * 0.9, 0);
      ctx.stroke();

      // Lateral Veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.6 * this.brushScale;
      for (let v = 0.25; v < 0.8; v += 0.2) {
        const vx = leaf.length * v;
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + leaf.length * 0.15, -leaf.width * 0.35);
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + leaf.length * 0.15, leaf.width * 0.35);
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  drawBuds(ctx, stroke) {
    if (!stroke.buds) return;

    for (const bud of stroke.buds) {
      ctx.save();
      // Stem to bud
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

      // Green Calyx Base
      ctx.fillStyle = stroke.palette.leafColor;
      ctx.beginPath();
      ctx.moveTo(-bud.baseSize * 0.4, 0);
      ctx.lineTo(0, -bud.baseSize * 0.3);
      ctx.lineTo(bud.baseSize * 0.4, 0);
      ctx.closePath();
      ctx.fill();

      // Swirled Magenta/Pink Petal Bud
      ctx.fillStyle = bud.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 3;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        bud.baseSize * 0.4, -bud.baseSize * 0.6,
        bud.baseSize * 0.8, -bud.baseSize * 0.3,
        bud.baseSize, 0
      );
      ctx.bezierCurveTo(
        bud.baseSize * 0.8, bud.baseSize * 0.3,
        bud.baseSize * 0.4, bud.baseSize * 0.6,
        0, 0
      );
      ctx.fill();

      ctx.restore();
    }
  }

  drawBotanicalFlowers(ctx, stroke) {
    for (const fl of stroke.flowers) {
      ctx.save();
      ctx.translate(fl.x, fl.y);

      // 1. Soft botanical drop shadow behind flower
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 6;

      // 2. Draw 5 Flared Petals with Ruffled Edges
      for (const petal of fl.petals) {
        ctx.save();
        ctx.rotate(petal.angle);

        // Petal Gradient: Center Throat -> Mid Flare -> Outer Petal Rim
        const grad = ctx.createRadialGradient(0, 0, 2, petal.length * 0.5, 0, petal.length);
        grad.addColorStop(0, fl.theme.throat || '#4a044e');
        grad.addColorStop(0.28, fl.theme.secondary);
        grad.addColorStop(0.75, fl.theme.primary);
        grad.addColorStop(1.0, fl.theme.primary);

        ctx.fillStyle = grad;

        // Ruffled Organic Petal Shape
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          petal.length * 0.3, -petal.width * 0.85,
          petal.length * 0.7, -petal.width * 0.75,
          petal.length, 0
        );
        ctx.bezierCurveTo(
          petal.length * 0.7, petal.width * 0.75,
          petal.length * 0.3, petal.width * 0.85,
          0, 0
        );
        ctx.fill();

        // 3. Delicate Radial Veins / Striations (matching the petunias in the reference image)
        const veinColor = fl.theme.veinColor || 'rgba(112, 18, 88, 0.65)';
        ctx.strokeStyle = veinColor;
        ctx.lineWidth = 0.9 * this.brushScale;

        // Main central petal vein
        ctx.beginPath();
        ctx.moveTo(fl.centerRadius * 0.8, 0);
        ctx.lineTo(petal.length * 0.88, 0);
        ctx.stroke();

        // Radiating side striations
        ctx.lineWidth = 0.6 * this.brushScale;
        for (let v = 0.3; v <= 0.7; v += 0.2) {
          const vx = petal.length * v;
          ctx.beginPath();
          ctx.moveTo(vx * 0.6, 0);
          ctx.quadraticCurveTo(vx, -petal.width * 0.2, vx + petal.length * 0.15, -petal.width * 0.45);
          ctx.moveTo(vx * 0.6, 0);
          ctx.quadraticCurveTo(vx, petal.width * 0.2, vx + petal.length * 0.15, petal.width * 0.45);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Dark Trumpet Star Throat Center
      ctx.save();
      const throatGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, fl.throatRadius);
      throatGrad.addColorStop(0, fl.theme.center || '#2d0636');
      throatGrad.addColorStop(0.7, fl.theme.throat || '#581c87');
      throatGrad.addColorStop(1.0, 'rgba(88, 28, 135, 0)');

      ctx.fillStyle = throatGrad;
      ctx.beginPath();
      // 5-point star throat
      for (let s = 0; s < 5; s++) {
        const starAngle = fl.rotation + (s * Math.PI * 2) / 5;
        const outerX = Math.cos(starAngle) * fl.throatRadius;
        const outerY = Math.sin(starAngle) * fl.throatRadius;
        const innerAngle = starAngle + Math.PI / 5;
        const innerX = Math.cos(innerAngle) * (fl.throatRadius * 0.45);
        const innerY = Math.sin(innerAngle) * (fl.throatRadius * 0.45);

        if (s === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 5. Central Pistil & Stamens
      ctx.save();
      ctx.fillStyle = fl.theme.pistil || 'rgba(255, 250, 205, 0.95)';
      ctx.shadowColor = 'rgba(255, 240, 150, 0.6)';
      ctx.shadowBlur = 4;

      for (let a = 0; a < 5; a++) {
        const pAngle = (a * Math.PI * 2) / 5 + fl.rotation;
        const px = Math.cos(pAngle) * (fl.centerRadius * 0.65);
        const py = Math.sin(pAngle) * (fl.centerRadius * 0.65);

        ctx.beginPath();
        ctx.arc(px, py, 1.8 * this.brushScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
    }
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.opacity;

      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(p.size * 0.4, -p.size * 0.6, p.size * 0.8, -p.size * 0.4, p.size, 0);
      ctx.bezierCurveTo(p.size * 0.8, p.size * 0.4, p.size * 0.4, p.size * 0.6, 0, 0);
      ctx.fill();

      ctx.restore();
    }
  }

  // Clear canvas
  clear() {
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.activeStrokes.clear();
    this.particles = [];
  }

  // Restore history snapshot
  restoreStrokes(strokes) {
    this.clear();
    for (const stroke of strokes) {
      this.renderStrokeToBuffer(stroke);
    }
    this.render();
  }
}
