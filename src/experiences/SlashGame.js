/**
 * Cyber Slash AR Spatial Game Engine
 * Inspired by Fruit Ninja & Beat Saber WebXR
 * 
 * Features:
 * - Floating neon energy orbs spawn and float upwards through gravity
 * - Fingertip acts as high-energy laser blade
 * - Slicing through orbs splits them into fragments with explosive particle bursts
 * - Combo multipliers, floating score popups, and score counter
 * - Mouse / touch fallback blade support
 */

export class SlashGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.orbs = [];
    this.fragments = [];
    this.scorePopups = [];
    this.bladeTrail = [];

    this.score = 0;
    this.combo = 0;
    this.lastSlashTime = 0;
    this.lastSpawnTime = 0;
    this.prevFingerPos = null;
    this.pointerPos = null;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setPointer(point) {
    this.pointerPos = point;
  }

  spawnOrb() {
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;

    const colors = ['#f43f5e', '#38bdf8', '#10b981', '#fbbf24', '#c084fc'];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    this.orbs.push({
      id: Math.random(),
      x: 120 + Math.random() * (w - 240),
      y: h + 30,
      vx: (Math.random() - 0.5) * 3.5,
      vy: -(7.5 + Math.random() * 3.5),
      radius: 32 + Math.random() * 12,
      color: chosenColor,
      points: 100,
      sliced: false
    });
  }

  render(gestureResult, timestamp = performance.now()) {
    const ctx = this.ctx;
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // 1. Spawn Orbs at regular intervals
    if (timestamp - this.lastSpawnTime > 1200 && this.orbs.length < 5) {
      this.spawnOrb();
      this.lastSpawnTime = timestamp;
    }

    const primaryHand = gestureResult?.primaryHand;
    const finger = primaryHand?.indexTip || primaryHand?.palmCenter || this.pointerPos;

    // 2. Track Blade Trail
    if (finger) {
      this.bladeTrail.push({ x: finger.x, y: finger.y, time: timestamp });
      if (this.bladeTrail.length > 16) this.bladeTrail.shift();

      // Check collision / slice against active orbs
      if (this.prevFingerPos) {
        this.checkSlices(this.prevFingerPos, finger, timestamp);
      }
      this.prevFingerPos = { x: finger.x, y: finger.y };
    } else {
      this.prevFingerPos = null;
      if (this.bladeTrail.length > 0) this.bladeTrail.shift();
    }

    // 3. Render Blade Trail
    this.renderBladeTrail(ctx);

    // 4. Update and Render Orbs
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.vy += 0.16; // Gentle gravity

      // Offscreen bottom cleanup
      if (orb.y > h + 70 && orb.vy > 0) {
        this.orbs.splice(i, 1);
        this.combo = 0; // Reset combo on missed orb
        continue;
      }

      // Draw glowing neon energy sphere
      ctx.save();
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();

      // Core highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x - orb.radius * 0.25, orb.y - orb.radius * 0.25, orb.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting energy ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 1.15, timestamp * 0.003, timestamp * 0.003 + Math.PI);
      ctx.stroke();

      ctx.restore();
    }

    // 5. Update and Render Sliced Fragments
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.22;
      f.alpha -= 0.022;

      if (f.alpha <= 0 || f.y > h + 50) {
        this.fragments.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Update and Render Floating Score Popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const p = this.scorePopups[i];
      p.y += p.vy;
      p.alpha -= 0.025;

      if (p.alpha <= 0) {
        this.scorePopups.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.font = '800 22px "Outfit", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // 7. Render Top-Right Score & Combo HUD
    this.renderHUD(ctx, w);
  }

  checkSlices(p1, p2, timestamp) {
    const bladeSpeed = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (bladeSpeed < 3) return; // Responsive slice threshold

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      const dist = this.distToSegment(orb, p1, p2);

      if (dist < orb.radius + 8) {
        // Successful Slice!
        this.combo++;
        const multiplier = Math.min(this.combo, 5);
        const addedScore = orb.points * multiplier;
        this.score += addedScore;

        // Score popup
        this.scorePopups.push({
          x: orb.x,
          y: orb.y - 15,
          vy: -2.2,
          text: `+${addedScore}${multiplier > 1 ? ` (${multiplier}x Combo!)` : ''}`,
          alpha: 1.0
        });

        // Spawn explosive fragments
        for (let k = 0; k < 22; k++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3.5 + Math.random() * 8.5;
          this.fragments.push({
            x: orb.x,
            y: orb.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5.5,
            color: orb.color,
            alpha: 1.0
          });
        }

        this.orbs.splice(i, 1);
      }
    }
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  renderBladeTrail(ctx) {
    if (this.bladeTrail.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.bladeTrail.length; i++) {
      const pPrev = this.bladeTrail[i - 1];
      const pCurr = this.bladeTrail[i];
      const progress = i / this.bladeTrail.length;

      ctx.beginPath();
      ctx.moveTo(pPrev.x, pPrev.y);
      ctx.lineTo(pCurr.x, pCurr.y);
      ctx.lineWidth = progress * 16;
      ctx.strokeStyle = `rgba(244, 63, 94, ${progress * 0.95})`;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Sharp white hot core
      ctx.lineWidth = progress * 4.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    ctx.restore();
  }

  renderHUD(ctx, w) {
    ctx.save();
    ctx.textAlign = 'right';

    // Score Banner
    ctx.font = '800 24px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.fillText(`SCORE: ${this.score}`, w - 24, 75);

    // Combo streak multiplier
    if (this.combo > 1) {
      ctx.font = '700 16px "Outfit", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fillText(`⚡ ${this.combo}x COMBO STREAK`, w - 24, 102);
    }

    ctx.restore();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.orbs = [];
    this.fragments = [];
    this.scorePopups = [];
  }
}
