/**
 * Ultra-Realistic Deep Space Galaxy & Quantum Particle Physics Engine
 * Inspired by NASA/Hubble visualizations, WebXR astrophysical simulations & Three.js particle dynamics
 * 
 * Features:
 * - 4-Arm Logarithmic Density Spiral (Andromeda / Milky Way structure)
 * - Stellar Populations:
 *   - Hot O/B Blue Supergiants along spiral arms
 *   - Golden/Amber Population II giants in the Galactic Bulge
 *   - Glowing H-II Hydrogen Emission Nebulae (Magenta/Rose/Cyan)
 *   - Central Supermassive Black Hole & Relativistic Accretion Disk
 * - 3D Volumetric Disk with realistic vertical dispersion & Hand-driven 3D perspective tilt
 * - Differential Keplerian rotation curve (Dark Matter Flat Curve)
 * - Interstellar Nebular Gas Haze background
 * - Relativistic hand interactions:
 *   - Pinch: Supermassive Singularity with Doppler boosted accretion ring
 *   - Open Palm: Supernova shock front compressing gas clouds
 *   - Fist: Charges energy -> Releases bipolar Quasar relativistic jets
 *   - Fingertip: Tidal gravity streams and gravitational lensing
 */

export const GALAXY_PRESETS = {
  nebula: {
    name: 'Milky Way / Andromeda',
    coreColor: '#fffbeb',
    bulgeColors: ['#ffffff', '#fef08a', '#fde047', '#f59e0b'],
    armColors: ['#38bdf8', '#67e8f9', '#93c5fd', '#ffffff', '#e0f2fe'],
    nebulaColors: ['#ec4899', '#f43f5e', '#a855f7', '#06b6d4'],
    dustColor: 'rgba(168, 85, 247, 0.08)',
    particleCount: 5500,
    speed: 1.0,
    spiralTightness: 0.28,
    arms: 4
  },
  cyberpunk: {
    name: 'Cybernetic Vortex',
    coreColor: '#ffffff',
    bulgeColors: ['#06b6d4', '#22d3ee', '#67e8f9', '#ffffff'],
    armColors: ['#f43f5e', '#ec4899', '#3b82f6', '#06b6d4', '#ffffff'],
    nebulaColors: ['#10b981', '#06b6d4', '#f43f5e'],
    dustColor: 'rgba(6, 182, 212, 0.08)',
    particleCount: 5500,
    speed: 1.25,
    spiralTightness: 0.32,
    arms: 3
  },
  solar: {
    name: 'Stellar Inferno',
    coreColor: '#ffffff',
    bulgeColors: ['#ffffff', '#fef08a', '#fde047', '#f59e0b'],
    armColors: ['#f97316', '#ea580c', '#fbbf24', '#ef4444', '#ffffff'],
    nebulaColors: ['#ea580c', '#dc2626', '#f59e0b'],
    dustColor: 'rgba(234, 88, 12, 0.09)',
    particleCount: 5000,
    speed: 1.15,
    spiralTightness: 0.26,
    arms: 4
  },
  quantum: {
    name: 'Emerald Cosmos',
    coreColor: '#ffffff',
    bulgeColors: ['#ecfdf5', '#a7f3d0', '#6ee7b7', '#34d399'],
    armColors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8', '#ffffff'],
    nebulaColors: ['#059669', '#047857', '#10b981'],
    dustColor: 'rgba(16, 185, 129, 0.08)',
    particleCount: 5000,
    speed: 1.1,
    spiralTightness: 0.30,
    arms: 4
  }
};

export class GalaxyPhysics {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.quasarJets = [];
    this.presetKey = 'nebula';
    this.preset = GALAXY_PRESETS.nebula;
    this.wasFist = false;
    this.fistCharge = 0;
    this.pointerPos = null;
    this.galacticRotation = 0;

    // 3D Orientation state
    this.tiltX = 0.35; // default 20 deg viewing angle
    this.tiltY = 0.0;
    this.targetTiltX = 0.35;
    this.targetTiltY = 0.0;

    this.initParticles();
  }

  setPreset(key) {
    if (GALAXY_PRESETS[key]) {
      this.presetKey = key;
      this.preset = GALAXY_PRESETS[key];
      this.initParticles();
    }
  }

  setPointer(point) {
    this.pointerPos = point;
  }

  initParticles() {
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    this.particles = [];

    const preset = this.preset;
    const count = preset.particleCount;
    const maxRadius = Math.min(w, h) * 0.46;
    const numArms = preset.arms;
    const tightness = preset.spiralTightness;

    // 1. Central Supermassive Bulge (25% of particles)
    const bulgeCount = Math.floor(count * 0.26);
    for (let i = 0; i < bulgeCount; i++) {
      // Exponential central density
      const r = Math.pow(Math.random(), 2.8) * (maxRadius * 0.32);
      const theta = Math.random() * Math.PI * 2;
      const zDisp = (Math.random() - 0.5) * (maxRadius * 0.16) * (1 - r / (maxRadius * 0.35));

      const isCore = r < maxRadius * 0.06;
      const color = isCore
        ? preset.coreColor
        : preset.bulgeColors[Math.floor(Math.random() * preset.bulgeColors.length)];

      this.particles.push({
        type: 'bulge',
        r,
        theta,
        z: zDisp,
        vz: (Math.random() - 0.5) * 0.2,
        ox: Math.cos(theta) * r,
        oy: Math.sin(theta) * r,
        x: cx + Math.cos(theta) * r,
        y: cy + Math.sin(theta) * r,
        vx: 0,
        vy: 0,
        size: isCore ? 1.8 + Math.random() * 2.2 : 1.0 + Math.random() * 1.8,
        color,
        alpha: isCore ? 0.95 : 0.6 + Math.random() * 0.35,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        orbitalSpeed: (0.012 + (maxRadius / (r + 20)) * 0.003) * preset.speed
      });
    }

    // 2. Logarithmic Spiral Arms (60% of particles)
    const armCount = Math.floor(count * 0.60);
    for (let i = 0; i < armCount; i++) {
      const armIndex = i % numArms;
      const armBaseAngle = armIndex * ((Math.PI * 2) / numArms);

      // Radial distribution favoring mid-disk
      const normR = Math.pow(Math.random(), 0.75);
      const r = (maxRadius * 0.12) + normR * (maxRadius * 0.88);

      // Logarithmic spiral angle: theta = b * ln(r)
      const spiralOffset = (1 / tightness) * Math.log(r / (maxRadius * 0.1));
      
      // Arm width dispersion (arms get wider further out)
      const armWidth = 0.22 + (r / maxRadius) * 0.35;
      const angleJitter = (Math.pow(Math.random(), 1.8) - 0.5) * armWidth * (Math.random() > 0.5 ? 1 : -1);
      const theta = armBaseAngle + spiralOffset + angleJitter;

      // Vertical disk height dispersion (thinner near edge)
      const zDisp = (Math.random() - 0.5) * (maxRadius * 0.08) * (1 - (r / maxRadius) * 0.5);

      // Young O/B stars vs Star-forming gas nebulae
      const isNebula = Math.random() > 0.78;
      const color = isNebula
        ? preset.nebulaColors[Math.floor(Math.random() * preset.nebulaColors.length)]
        : preset.armColors[Math.floor(Math.random() * preset.armColors.length)];

      this.particles.push({
        type: isNebula ? 'nebula' : 'arm',
        r,
        theta,
        z: zDisp,
        vz: (Math.random() - 0.5) * 0.1,
        ox: Math.cos(theta) * r,
        oy: Math.sin(theta) * r,
        x: cx + Math.cos(theta) * r,
        y: cy + Math.sin(theta) * r,
        vx: 0,
        vy: 0,
        size: isNebula ? 2.2 + Math.random() * 2.8 : 0.9 + Math.random() * 2.0,
        color,
        alpha: isNebula ? 0.35 + Math.random() * 0.45 : 0.5 + Math.random() * 0.45,
        twinkleSpeed: 0.015 + Math.random() * 0.035,
        twinklePhase: Math.random() * Math.PI * 2,
        // Flat rotation curve (Dark Matter halo effect: constant tangential velocity)
        orbitalSpeed: (0.005 + (0.003 * maxRadius) / (r + 40)) * preset.speed
      });
    }

    // 3. Diffuse Outer Stellar Halo & Dark Interstellar Matter (14% of particles)
    const haloCount = count - bulgeCount - armCount;
    for (let i = 0; i < haloCount; i++) {
      const r = Math.random() * (maxRadius * 1.15);
      const theta = Math.random() * Math.PI * 2;
      const zDisp = (Math.random() - 0.5) * (maxRadius * 0.3);

      this.particles.push({
        type: 'halo',
        r,
        theta,
        z: zDisp,
        vz: (Math.random() - 0.5) * 0.15,
        ox: Math.cos(theta) * r,
        oy: Math.sin(theta) * r,
        x: cx + Math.cos(theta) * r,
        y: cy + Math.sin(theta) * r,
        vx: 0,
        vy: 0,
        size: 0.8 + Math.random() * 1.2,
        color: Math.random() > 0.6 ? '#ffffff' : '#94a3b8',
        alpha: 0.2 + Math.random() * 0.4,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        twinklePhase: Math.random() * Math.PI * 2,
        orbitalSpeed: (0.002 + 0.002 * (maxRadius / (r + 60))) * preset.speed
      });
    }
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.initParticles();
  }

  render(gestureResult, timestamp = performance.now()) {
    const ctx = this.ctx;
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const primaryHand = gestureResult?.primaryHand;
    const hands = gestureResult?.hands || [];
    const centerX = w / 2;
    const centerY = h / 2;

    // 1. Calculate 3D Perspective Tilt from Hand Orientation
    if (primaryHand && primaryHand.rotation) {
      const roll = (primaryHand.rotation.roll || 0) * 0.012;
      const pitch = (primaryHand.rotation.pitch || 0) * 0.008;
      this.targetTiltX = Math.max(-0.6, Math.min(0.8, 0.35 + pitch));
      this.targetTiltY = Math.max(-0.6, Math.min(0.6, roll));
    } else {
      this.targetTiltX = 0.35;
      this.targetTiltY = 0.0;
    }

    this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
    this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;

    const cosTiltX = Math.cos(this.tiltX);
    const sinTiltX = Math.sin(this.tiltX);
    const cosTiltY = Math.cos(this.tiltY);
    const sinTiltY = Math.sin(this.tiltY);

    // 2. Identify Hand Attractors & Gesture States
    const attractors = [];
    let isPinching = false;
    let isOpenPalm = false;
    let isFist = false;

    for (const hand of hands) {
      if (hand.isPinching || (hand.pinchData && hand.pinchData.isTightPinch)) {
        isPinching = true;
        const pt = hand.pinchCenter || hand.indexTip || hand.palmCenter;
        if (pt) attractors.push({ x: pt.x, y: pt.y, strength: 5.5, type: 'singularity' });
      } else if (hand.gesture === 'open_palm') {
        isOpenPalm = true;
        const pt = hand.palmCenter;
        if (pt) attractors.push({ x: pt.x, y: pt.y, strength: -5.0, type: 'repulse' });
      } else if (hand.gesture === 'fist') {
        isFist = true;
        const pt = hand.palmCenter;
        if (pt) attractors.push({ x: pt.x, y: pt.y, strength: 4.0, type: 'charge' });
      } else if (hand.indexTip) {
        attractors.push({ x: hand.indexTip.x, y: hand.indexTip.y, strength: 2.8, type: 'attract' });
        if (hand.thumbTip) {
          attractors.push({ x: hand.thumbTip.x, y: hand.thumbTip.y, strength: 1.6, type: 'attract' });
        }
      }
    }

    // Pointer fallback attractor
    if (attractors.length === 0 && this.pointerPos) {
      attractors.push({ x: this.pointerPos.x, y: this.pointerPos.y, strength: 3.2, type: 'attract' });
    }

    // 3. Quasar Relativistic Jet Release on Fist Opening
    if (this.wasFist && !isFist && this.fistCharge > 20) {
      const blastCenter = primaryHand?.palmCenter || { x: centerX, y: centerY };
      this.triggerQuasarBlast(blastCenter.x, blastCenter.y, Math.min(this.fistCharge, 100));
      this.fistCharge = 0;
    }

    if (isFist) {
      this.fistCharge += 2.0;
    } else {
      this.fistCharge = Math.max(0, this.fistCharge - 1);
    }
    this.wasFist = isFist;

    // 4. Render Deep Space Atmospheric Interstellar Dust Haze
    this.renderInterstellarNebula(ctx, centerX, centerY, Math.min(w, h) * 0.45);

    // 5. Update & Render Stars with 3D Depth & Physics
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      // Natural Differential Orbital Motion
      p.theta += p.orbitalSpeed;

      // Compute ideal orbital planar coordinates
      const unrotatedX = Math.cos(p.theta) * p.r;
      const unrotatedY = Math.sin(p.theta) * p.r;
      const unrotatedZ = p.z;

      // 3D Spatial Rotation & Inclination Tilt
      // Rotate around X (inclination) and Y (roll)
      const x1 = unrotatedX * cosTiltY - unrotatedZ * sinTiltY;
      const z1 = unrotatedX * sinTiltY + unrotatedZ * cosTiltY;

      const y2 = unrotatedY * cosTiltX - z1 * sinTiltX;
      const z2 = unrotatedY * sinTiltX + z1 * cosTiltX;

      // Project into 2D Screen Space
      const targetScreenX = centerX + x1;
      const targetScreenY = centerY + y2;

      // Drift physics towards ideal orbit
      p.vx += (targetScreenX - p.x) * 0.035;
      p.vy += (targetScreenY - p.y) * 0.035;

      // Attractor Physics (Singularity / Repulse / Finger Gravity)
      for (const att of attractors) {
        const dx = att.x - p.x;
        const dy = att.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        if (att.type === 'singularity') {
          // Relativistic Frame Dragging (Kerr Black Hole Accretion)
          const force = (att.strength * 1200) / Math.max(distSq, 250);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          // Accretion swirl
          p.vx += (-dy / dist) * (force * 0.85);
          p.vy += (dx / dist) * (force * 0.85);
        } else if (att.type === 'repulse') {
          // Supernova Shock Front
          if (dist < 400) {
            const force = (Math.abs(att.strength) * 320) / Math.max(dist, 20);
            p.vx -= (dx / dist) * force;
            p.vy -= (dy / dist) * force;
          }
        } else if (att.type === 'charge') {
          // Compression into supermassive core
          const force = (att.strength * 450) / Math.max(distSq, 200);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
          p.vx += (-dy / dist) * 2.2;
          p.vy += (dx / dist) * 2.2;
        } else {
          // Tidal Gravity Streamer
          if (dist < 480) {
            const force = (att.strength * 480) / Math.max(distSq, 350);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
      }

      // Apply Velocity and Damping
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;

      // Depth scaling & Atmospheric Twinkle
      const depthScale = Math.max(0.6, Math.min(1.4, 1.0 + (z2 / 300)));
      const twinkle = Math.sin(timestamp * p.twinkleSpeed + p.twinklePhase) * 0.25 + 0.75;
      const finalAlpha = Math.max(0, Math.min(1, p.alpha * twinkle * (depthScale * 0.9)));
      const finalSize = p.size * depthScale;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = finalAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, finalSize), 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Render Quasar Relativistic Jet Particles
    this.renderQuasarJets(ctx);

    // 7. Visual Event Horizon / Relativistic Accretion Ring (Pinch)
    if (isPinching && primaryHand?.pinchCenter) {
      const pc = primaryHand.pinchCenter;
      this.renderBlackHoleLensing(ctx, pc.x, pc.y, timestamp);
    }

    // 8. Supernova Charge Glow (Fist)
    if (this.fistCharge > 0 && primaryHand?.palmCenter) {
      const pc = primaryHand.palmCenter;
      const chargeRadius = Math.min(this.fistCharge * 0.7, 65);

      ctx.beginPath();
      ctx.arc(pc.x, pc.y, chargeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 32;
      ctx.fill();
      ctx.stroke();

      // Inner white core
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, chargeRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Volumetric Nebular Dust Cloud Haze
   */
  renderInterstellarNebula(ctx, cx, cy, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Core Luminous Bulge
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.35);
    coreGrad.addColorStop(0, 'rgba(255, 250, 230, 0.45)');
    coreGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.22)');
    coreGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.08)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Diffuse Cosmic Dust Disc
    const dustGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.05);
    dustGrad.addColorStop(0, this.preset.dustColor);
    dustGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.05)');
    dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Supermassive Black Hole Accretion Disk with Gravitational Lensing
   */
  renderBlackHoleLensing(ctx, cx, cy, timestamp) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Gravitational Lensing Photon Ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, 22 + Math.sin(timestamp * 0.01) * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Hot Relativistic Accretion Swirl
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, timestamp * 0.02, timestamp * 0.02 + Math.PI * 1.4);
    ctx.stroke();

    // Event Horizon Shadow Core
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050811';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Quasar Relativistic Bipolar Jets
   */
  triggerQuasarBlast(cx, cy, energy) {
    const jetCount = Math.floor(energy * 2.5);
    for (let i = 0; i < jetCount; i++) {
      const angle = (Math.random() - 0.5) * 0.6 + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const speed = 6 + Math.random() * 16;
      this.quasarJets.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.0 + Math.random() * 3.5,
        color: Math.random() > 0.5 ? '#38bdf8' : '#fbbf24',
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }

    // Radial shockwave particles
    for (const p of this.particles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const force = (energy / dist) * 26;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }
  }

  renderQuasarJets(ctx) {
    for (let i = this.quasarJets.length - 1; i >= 0; i--) {
      const j = this.quasarJets[i];
      j.x += j.vx;
      j.y += j.vy;
      j.alpha -= j.decay;

      if (j.alpha <= 0) {
        this.quasarJets.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = j.alpha;
      ctx.fillStyle = j.color;
      ctx.shadowColor = j.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(j.x, j.y, j.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
