/**
 * Doctor Strange Eldritch Magic & Tao Mandalas Engine (Movie-Accurate XR)
 * 
 * Features:
 * - Authentic Tao Mandalas with multi-layered rotating sacred geometry:
 *   - Sanskrit / Arcane Rune Circle Band (24 procedural mystic glyphs)
 *   - Sawtooth Serrated Gear Ring (Clockwise & Counter-Clockwise)
 *   - Interlocked Sacred Octagram (Double Square) & Hexagram Core
 *   - Fiery Tangential Spark Emitter (Sparkler Wheel Effect)
 * - 3D Perspective Tilt based on hand orientation (Roll, Pitch, Yaw)
 * - Fingertip Eldritch Glyphs & Continuous Spark Streamers
 * - Open Palm: Shield of the Seraphim (Massive Dual-Layer Defense Barrier)
 * - Tight Pinch / Fist: Eldritch Energy Whip with Verlet physics
 * - Two-Hand Interaction: Fiery Crackling Sling-Ring Energy Bridge
 * - Glowing additive blending (Screen / Lighter) with searing white core & fiery orange aura
 */

export class DoctorStrangeMagic {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sparks = [];
    this.whipPoints = [];
    this.mandalaAngle = 0;
    this.innerAngle = 0;
    this.pointerPos = null;

    // Pre-computed Eldritch Rune glyph templates (radial vectors)
    this.runes = this.generateRunicGlyphs(24);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setPointer(point) {
    this.pointerPos = point;
  }

  generateRunicGlyphs(count) {
    const glyphs = [];
    for (let i = 0; i < count; i++) {
      const strokes = [];
      const numLines = 3 + (i % 3);
      for (let j = 0; j < numLines; j++) {
        strokes.push({
          x1: (Math.sin(j * 1.7 + i) * 0.4),
          y1: (Math.cos(j * 1.3 + i) * 0.4),
          x2: (Math.sin(j * 2.1 + i + 1) * 0.4),
          y2: (Math.cos(j * 2.3 + i + 1) * 0.4)
        });
      }
      glyphs.push(strokes);
    }
    return glyphs;
  }

  render(gestureResult, timestamp = performance.now()) {
    const ctx = this.ctx;
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    this.mandalaAngle += 0.015;
    this.innerAngle -= 0.022;

    const hands = gestureResult?.hands || [];

    // 1. Two-Hand Interaction: Fiery Energy Bridge / Sling Ring Portal Arc
    if (hands.length >= 2) {
      const h1 = hands[0];
      const h2 = hands[1];
      const p1 = h1.palmCenter || h1.indexTip;
      const p2 = h2.palmCenter || h2.indexTip;
      if (p1 && p2) {
        this.renderEldritchBridge(ctx, p1, p2, timestamp);
      }
    }

    // 2. Render Hand Mandalas & Spells
    if (hands.length > 0) {
      for (const hand of hands) {
        const palm = hand.palmCenter || hand.indexTip;
        if (!palm) continue;

        const rawScale = hand.handScale || 65;
        const scale = Math.max(rawScale * 1.6, 85);
        const isShield = hand.gesture === 'open_palm';
        const isPinch = hand.isPinching || (hand.pinchData && hand.pinchData.isTightPinch);
        const rollRad = hand.rotation?.angleRad || 0;
        const pitchTilt = (hand.rotation?.pitch || 0) * 0.005;

        if (isPinch) {
          // Eldritch Energy Whip
          const origin = hand.pinchCenter || hand.indexTip || palm;
          this.renderEldritchWhip(ctx, origin, timestamp);
        } else {
          // Tao Mandala Shield
          this.renderTaoMandala(ctx, palm.x, palm.y, scale * (isShield ? 1.45 : 1.0), rollRad, pitchTilt, isShield, timestamp);
        }

        // Fingertip Eldritch Nodes & Spark Sprays
        if (hand.landmarks) {
          for (const idx of [4, 8, 12, 16, 20]) {
            const tip = hand.landmarks[idx];
            if (tip) {
              this.renderFingertipRune(ctx, tip.x, tip.y, 12, timestamp + idx * 100);
              if (Math.random() > 0.3) {
                this.spawnSpark(tip.x, tip.y, (Math.random() - 0.5) * 4, -Math.random() * 4, '#ffcc00');
              }
            }
          }
        }
      }
    } else if (this.pointerPos) {
      // Mouse fallback mandala
      this.renderTaoMandala(ctx, this.pointerPos.x, this.pointerPos.y, 100, this.mandalaAngle, 0, false, timestamp);
      if (Math.random() > 0.35) {
        this.spawnSpark(this.pointerPos.x, this.pointerPos.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#ffaa00');
      }
    } else {
      // Ambient Idle Portal Mandala
      const cx = w / 2;
      const cy = h / 2;
      const idlePulse = Math.sin(timestamp * 0.003) * 10 + 105;
      this.renderTaoMandala(ctx, cx, cy, idlePulse, this.mandalaAngle * 0.7, 0, false, timestamp);
      if (Math.random() > 0.3) {
        this.spawnSpark(cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, '#ffaa00');
      }
    }

    // 3. Render Sparks & Fiery Embers
    this.renderSparks(ctx);
  }

  /**
   * Main Movie-Accurate Tao Mandala (Doctor Strange Shield of the Seraphim)
   */
  renderTaoMandala(ctx, cx, cy, radius, handRoll = 0, pitchTilt = 0, isShield = false, timestamp = performance.now()) {
    ctx.save();
    ctx.translate(cx, cy);

    // Apply hand roll angle & 3D tilt perspective
    ctx.rotate(handRoll);
    if (Math.abs(pitchTilt) > 0.01) {
      ctx.transform(1, 0, 0, Math.cos(pitchTilt), 0, 0);
    }

    // Additive blending for blinding fiery luminescence
    ctx.globalCompositeOperation = 'lighter';

    const gold = '#ffcc00';
    const amber = '#ff9900';
    const orange = '#ff5500';
    const fireRed = '#ff2200';

    ctx.shadowColor = orange;
    ctx.shadowBlur = isShield ? 30 : 18;

    // --- 1. Outer Sparkler Perimeter ---
    const outerRadius = radius * 1.0;
    ctx.save();
    ctx.rotate(this.mandalaAngle * 0.8);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3.0;

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Outer Tangential Sparks
    const sparkCount = isShield ? 24 : 16;
    for (let i = 0; i < sparkCount; i++) {
      const a = (i * Math.PI * 2) / sparkCount;
      const sx = Math.cos(a) * outerRadius;
      const sy = Math.sin(a) * outerRadius;

      if (Math.random() > 0.35) {
        const tangent = a + Math.PI / 2;
        const speed = 2.5 + Math.random() * 4.5;
        this.spawnSpark(
          cx + sx * Math.cos(handRoll) - sy * Math.sin(handRoll),
          cy + sx * Math.sin(handRoll) + sy * Math.cos(handRoll),
          Math.cos(tangent) * speed + (Math.random() - 0.5) * 2,
          Math.sin(tangent) * speed + (Math.random() - 0.5) * 2,
          gold
        );
      }
    }
    ctx.restore();

    // --- 2. Arcane Sanskrit Runic Circle Band ---
    const runeRadius = radius * 0.88;
    const runeInnerRadius = radius * 0.76;

    ctx.save();
    ctx.rotate(this.mandalaAngle * 0.5);

    // Bounding rings for the rune track
    ctx.strokeStyle = amber;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, runeRadius, 0, Math.PI * 2);
    ctx.arc(0, 0, runeInnerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Render 24 Mystical Glyphs along the circumference
    const glyphCount = 20;
    const glyphMidRadius = (runeRadius + runeInnerRadius) / 2;
    const glyphScale = (runeRadius - runeInnerRadius) * 0.85;

    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < glyphCount; i++) {
      const a = (i * Math.PI * 2) / glyphCount;
      const gx = Math.cos(a) * glyphMidRadius;
      const gy = Math.sin(a) * glyphMidRadius;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(a + Math.PI / 2);

      const glyph = this.runes[i % this.runes.length];
      for (const str of glyph) {
        ctx.beginPath();
        ctx.moveTo(str.x1 * glyphScale, str.y1 * glyphScale);
        ctx.lineTo(str.x2 * glyphScale, str.y2 * glyphScale);
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();

    // --- 3. Sawtooth Energy Gear (Counter-Rotating) ---
    const gearRadius = radius * 0.72;
    ctx.save();
    ctx.rotate(this.innerAngle * 1.2);
    ctx.strokeStyle = orange;
    ctx.lineWidth = 2.0;

    const teeth = 24;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1 = (i * Math.PI * 2) / teeth;
      const a2 = ((i + 0.5) * Math.PI * 2) / teeth;
      const r1 = gearRadius;
      const r2 = gearRadius * 0.90;

      const x1 = Math.cos(a1) * r1;
      const y1 = Math.sin(a1) * r1;
      const x2 = Math.cos(a2) * r2;
      const y2 = Math.sin(a2) * r2;

      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // --- 4. Interlocked Sacred Octagram (Two Intersecting Squares) ---
    const octRadius = radius * 0.60;
    ctx.save();
    ctx.rotate(this.mandalaAngle * 1.5);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2.2;

    for (let s = 0; s < 2; s++) {
      ctx.save();
      ctx.rotate((s * Math.PI) / 4);
      const side = octRadius * 1.414;
      ctx.strokeRect(-side / 2, -side / 2, side, side);

      // White inner accent
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-side / 2, -side / 2, side, side);
      ctx.restore();
    }
    ctx.restore();

    // --- 5. Concentric Sacred Triangles (Hexagram Seal) ---
    const triRadius = radius * 0.38;
    ctx.save();
    ctx.rotate(this.innerAngle * 1.8);
    ctx.strokeStyle = amber;
    ctx.lineWidth = 1.8;

    for (let t = 0; t < 2; t++) {
      ctx.save();
      ctx.rotate((t * Math.PI) / 3);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const tx = Math.cos(a) * triRadius;
        const ty = Math.sin(a) * triRadius;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // --- 6. Pulsing Fiery Singularity Core ---
    const corePulse = (Math.sin(timestamp * 0.008) + 1) * 3 + (radius * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = gold;
    ctx.shadowBlur = 24;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, corePulse * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = isShield ? 'rgba(255, 180, 0, 0.45)' : 'rgba(255, 100, 0, 0.35)';
    ctx.fill();

    // 12 Outer Radial Energy Spokes
    ctx.save();
    ctx.rotate(this.mandalaAngle * 0.6);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (radius * 0.2), Math.sin(a) * (radius * 0.2));
      ctx.lineTo(Math.cos(a) * (radius * 0.98), Math.sin(a) * (radius * 0.98));
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * Eldritch Whip Physics (Doctor Strange Energy Cord)
   */
  renderEldritchWhip(ctx, origin, timestamp) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ff9900';
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';

    const segments = 16;
    const whipLength = 220;

    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const wave = Math.sin(timestamp * 0.015 - i * 0.6) * (30 * t);
      const wx = origin.x + Math.cos(timestamp * 0.002 + t * 2) * (whipLength * t) + wave;
      const wy = origin.y + Math.sin(timestamp * 0.002 + t * 2) * (whipLength * t) + (t * 80);

      ctx.lineTo(wx, wy);

      if (Math.random() > 0.5) {
        this.spawnSpark(wx, wy, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#ffcc00');
      }
    }
    ctx.stroke();

    // Searing hot white inner whip core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Two-Hand Sling Ring Electric Arc Bridge
   */
  renderEldritchBridge(ctx, p1, p2, timestamp) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (dist < 20 || dist > 2000) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffaa00';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';

    const segments = 18;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    const perpAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const bx = p1.x + (p2.x - p1.x) * t;
      const by = p1.y + (p2.y - p1.y) * t;
      const jitter = (Math.sin(timestamp * 0.025 + i * 3.0) + (Math.random() - 0.5) * 1.8) * 26;
      const arcX = bx + Math.cos(perpAngle) * jitter;
      const arcY = by + Math.sin(perpAngle) * jitter;
      ctx.lineTo(arcX, arcY);

      if (Math.random() > 0.45) {
        this.spawnSpark(arcX, arcY, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, '#ffcc00');
      }
    }

    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Hot white electric core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Mini Arcane Glyph on Fingertips
   */
  renderFingertipRune(ctx, x, y, radius, timestamp) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(timestamp * 0.003);
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = '#ffaa00';
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner 4-point star
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.8, 0);
    ctx.lineTo(radius * 0.8, 0);
    ctx.moveTo(0, -radius * 0.8);
    ctx.lineTo(0, radius * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  spawnSpark(x, y, vx, vy, color = '#ffcc00') {
    this.sparks.push({
      x,
      y,
      vx: vx !== undefined ? vx : (Math.random() - 0.5) * 5,
      vy: vy !== undefined ? vy : (Math.random() - 0.5) * 5 - 1.0,
      size: 1.5 + Math.random() * 3.0,
      alpha: 1.0,
      decay: 0.02 + Math.random() * 0.035,
      color
    });

    if (this.sparks.length > 350) {
      this.sparks.shift();
    }
  }

  renderSparks(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08; // Spark gravity
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // White inner core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}
