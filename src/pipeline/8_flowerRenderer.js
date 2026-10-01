/**
 * Stage 8: Minimal, Elegant Botanical Floral Arrangement Engine
 * Displays 3-6 large, photorealistic flowers with minimal accent greenery.
 * Features discrete pinch creation, interactive drag-and-drop repositioning,
 * elegant on-demand botanical labels, and 60fps real-time blossoming.
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

export class FlowerRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Maximum flower limit (strict minimal arrangement: 3-6, default 5)
    this.maxFlowers = 5;
    this.activeFlowerId = 'allMix';

    // Arrangement State
    this.flowers = []; // Array of active flowers on screen
    this.selectedFlower = null; // Currently grabbed / selected flower
    this.hoveredFlower = null; // Currently hovered flower
    this.hoverAlpha = 0;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    // Creation Cooldown Management
    this.lastCreationTime = 0;
    this.creationCooldownMs = 1500; // 1.5s cooldown

    // Ambient floating particles
    this.particles = [];
    this.maxParticles = 120;

    // High-Resolution Transparent PNG Photographic Flower Assets
    this.images = {
      pinkDahlia: this.loadImage('./assets/flowers/pink_dahlia.png'),
      purpleRose: this.loadImage('./assets/flowers/purple_rose.png'),
      pinkPlumeriaFrangipani: this.loadImage('./assets/flowers/pink_plumeria_frangipani.png'),
      pinkPlumeria: this.loadImage('./assets/flowers/pink_plumeria.png'),
      blueAfricanDaisy: this.loadImage('./assets/flowers/blue_african_daisy.png'),
      whiteDaisy: this.loadImage('./assets/flowers/white_daisy.png'),
      leaf: this.loadImage('./assets/flowers/daisy_leaf.png'),
      petal: this.loadImage('./assets/flowers/daisy_petal.png')
    };

    // Pre-populate with an initial minimal 3-flower balanced arrangement
    this.initBalancedArrangement();
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

  initBalancedArrangement() {
    const now = performance.now();
    const cx = (this.canvas.width || window.innerWidth) / 2;
    const cy = (this.canvas.height || window.innerHeight) / 2;

    // Initial 3 flowers gracefully arranged
    this.flowers = [
      this.createFlowerInstance('pinkDahlia', cx, cy - 20, 190, 0, now),
      this.createFlowerInstance('purpleRose', cx - 140, cy + 50, 165, -0.4, now + 100),
      this.createFlowerInstance('whiteDaisy', cx + 130, cy + 40, 175, 0.35, now + 200)
    ];
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
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
    const finalSize = size || (165 + Math.random() * 35);
    const finalRot = rotation !== undefined ? rotation : Math.random() * Math.PI * 2;

    // At most 1-2 small accent leaves tucked behind
    const leaves = [];
    if (Math.random() > 0.25) {
      leaves.push({
        angle: finalRot + 0.8 + Math.random() * 0.5,
        size: finalSize * 0.32,
        dist: finalSize * 0.42
      });
    }
    if (Math.random() > 0.5) {
      leaves.push({
        angle: finalRot - 1.2 - Math.random() * 0.5,
        size: finalSize * 0.28,
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
      bloomDuration: 400
    };
  }

  // --- Discrete Gestural Interaction: Pinch & Move ---

  handlePinchStart(point, flowerId = this.activeFlowerId) {
    const now = performance.now();
    const hitFlower = this.getFlowerAtPoint(point);

    if (hitFlower) {
      // 1. Select and grab existing flower to move
      this.selectedFlower = hitFlower;
      this.isDragging = true;
      this.dragOffset = {
        x: hitFlower.x - point.x,
        y: hitFlower.y - point.y
      };
      this.spawnPollenBurst(point, hitFlower.flowerId);
      return { action: 'SELECT', flower: hitFlower };
    }

    // 2. Spawn 1 new flower at location if cooldown has passed
    if (now - this.lastCreationTime < this.creationCooldownMs) {
      return { action: 'COOLDOWN', remaining: Math.ceil((this.creationCooldownMs - (now - this.lastCreationTime)) / 1000) };
    }

    this.lastCreationTime = now;

    // If max flowers reached, remove the oldest one to maintain clean 3-6 limit
    if (this.flowers.length >= this.maxFlowers) {
      this.flowers.shift();
    }

    const variety = this.resolveFlowerVariety(flowerId);
    const newFlower = this.createFlowerInstance(variety.id, point.x, point.y, null, undefined, now);
    this.flowers.push(newFlower);

    this.selectedFlower = newFlower;
    this.isDragging = true;
    this.dragOffset = { x: 0, y: 0 };

    this.spawnPollenBurst(point, variety.id);
    return { action: 'CREATE', flower: newFlower };
  }

  handlePinchMove(point) {
    if (this.isDragging && this.selectedFlower) {
      const margin = this.selectedFlower.size * 0.4;
      const maxX = (this.canvas.width || window.innerWidth) - margin;
      const maxY = (this.canvas.height || window.innerHeight) - margin;

      // Smoothly reposition flower clamped inside canvas
      this.selectedFlower.x = Math.max(margin, Math.min(maxX, point.x + this.dragOffset.x));
      this.selectedFlower.y = Math.max(margin, Math.min(maxY, point.y + this.dragOffset.y));
    }
  }

  handlePinchEnd() {
    this.isDragging = false;
  }

  setHoverPoint(point) {
    if (!point) {
      this.hoveredFlower = null;
      return null;
    }
    const hit = this.getFlowerAtPoint(point);
    this.hoveredFlower = hit;
    if (hit && !this.selectedFlower) {
      this.selectedFlower = hit;
    }
    return hit;
  }

  getFlowerAtPoint(point) {
    // Search top-most flower under cursor
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const fl = this.flowers[i];
      const dist = Math.hypot(point.x - fl.x, point.y - fl.y);
      if (dist <= fl.size * 0.52) {
        return fl;
      }
    }
    return null;
  }

  spawnPollenBurst(point, flowerId) {
    const variety = FLOWER_COLLECTION[flowerId] || FLOWER_COLLECTION.pinkDahlia;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        type: 'pollen',
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * (speed * 0.04),
        vy: Math.sin(angle) * (speed * 0.04) - 0.4,
        size: 2 + Math.random() * 3,
        color: variety.color || '#fbbf24',
        opacity: 1.0,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.015
      });
    }
  }

  // --- Physics Simulation ---

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

  // --- Main Rendering Loop ---

  render() {
    const now = performance.now();
    this.updateParticles();

    // 1. Clear Drawing Canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Render Subtle Background Connecting Branches
    this.drawSubtleArrangementBranch(this.ctx);

    // 3. Render Minimal Leaves (Strictly Behind Flowers)
    this.drawArrangementLeaves(this.ctx, now);

    // 4. Render 3-6 Large Photorealistic Flowers
    this.drawArrangementFlowers(this.ctx, now);

    // 5. Render Elegant Botanical Name Labels for Selected/Hovered Flower
    this.drawElegantFlowerLabel(this.ctx);

    // 6. Render Floating Pollen Particles
    this.renderParticles(this.ctx);
  }

  drawSubtleArrangementBranch(ctx) {
    if (this.flowers.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(46, 125, 50, 0.35)';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.flowers[0].x, this.flowers[0].y);
    for (let i = 1; i < this.flowers.length; i++) {
      const prev = this.flowers[i - 1];
      const curr = this.flowers[i];
      const midX = (prev.x + curr.x) / 2 + (i % 2 === 0 ? 15 : -15);
      const midY = (prev.y + curr.y) / 2 + (i % 2 === 0 ? -15 : 15);
      ctx.quadraticCurveTo(midX, midY, curr.x, curr.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawArrangementLeaves(ctx, now) {
    const leafImg = this.images.leaf;

    for (const fl of this.flowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);

      if (!fl.leaves || fl.leaves.length === 0) continue;

      for (const leaf of fl.leaves) {
        const lx = fl.x + Math.cos(leaf.angle) * (leaf.dist * bloom);
        const ly = fl.y + Math.sin(leaf.angle) * (leaf.dist * bloom);
        const lSize = leaf.size * bloom;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leaf.angle);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 6 * bloom;

        if (leafImg && leafImg.loaded) {
          ctx.globalAlpha = Math.min(0.88, progress * 1.2);
          ctx.drawImage(leafImg, -lSize * 0.5, -lSize * 0.8, lSize, lSize);
        }

        ctx.restore();
      }
    }
  }

  drawArrangementFlowers(ctx, now) {
    for (const fl of this.flowers) {
      const elapsed = now - fl.birthTime;
      const progress = Math.min(1.0, Math.max(0, elapsed / fl.bloomDuration));
      const bloom = easeOutBack(progress);

      const size = fl.size * bloom;
      const img = this.images[fl.flowerId] || this.images.pinkDahlia;
      const isSelected = (this.selectedFlower === fl || this.hoveredFlower === fl);

      ctx.save();
      ctx.translate(fl.x, fl.y);
      ctx.rotate(fl.rotation);

      // Soft natural photographic drop shadow
      ctx.shadowColor = isSelected ? 'rgba(236, 72, 153, 0.45)' : 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = isSelected ? 18 : 10 * bloom;
      ctx.shadowOffsetY = 4 * bloom;

      if (img && img.loaded) {
        ctx.globalAlpha = Math.min(1.0, progress * 1.5);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      }

      // Subtle glowing halo ring if grabbed or selected
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- Display Name Label on Selected/Hovered Flower ---

  drawElegantFlowerLabel(ctx) {
    const active = this.selectedFlower || this.hoveredFlower;

    if (active) {
      this.hoverAlpha = Math.min(1.0, this.hoverAlpha + 0.1);
    } else {
      this.hoverAlpha = Math.max(0.0, this.hoverAlpha - 0.1);
    }

    if (this.hoverAlpha <= 0.02 || !active) return;

    ctx.save();
    ctx.globalAlpha = this.hoverAlpha;

    const labelX = active.x;
    const labelY = active.y + active.size * 0.52 + 14;
    const cardWidth = 180;
    const cardHeight = 44;

    // Centered label under the flower
    const rx = labelX - cardWidth / 2;
    const ry = labelY;

    // Translucent glass pill
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(rx, ry, cardWidth, cardHeight, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flower Common Name
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(active.name || 'Botanical Bloom', labelX, ry + 18);

    // Botanical Binomial Name
    ctx.font = 'italic 400 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(active.scientificName || 'Flora', labelX, ry + 33);

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

  // Clear arrangement
  clear() {
    this.flowers = [];
    this.selectedFlower = null;
    this.hoveredFlower = null;
    this.particles = [];
  }

  // Backward compatibility methods
  startStroke(trackId, point) {
    return this.handlePinchStart(point);
  }

  addStrokePoint(trackId, point) {
    return this.handlePinchMove(point);
  }

  endStroke(trackId) {
    return this.handlePinchEnd();
  }

  restoreStrokes() {
    this.initBalancedArrangement();
  }
}
