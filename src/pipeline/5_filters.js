/**
 * Stage 5: Movement Calculation & One Euro Filter Smoothing
 * Filters noisy raw landmark outputs and computes velocities/direction vectors.
 *
 * One Euro Filter Reference:
 * Casiez, G., Roussel, N. and Vogel, F. (2012). 1€ Filter: A Simple Speed-based Low-pass Filter.
 */

class LowPassFilter {
  constructor(alpha = 0.5, initVal = 0) {
    this.alpha = alpha;
    this.s = initVal;
    this.initialized = false;
  }

  filter(value, alpha = this.alpha) {
    if (!this.initialized) {
      this.s = value;
      this.initialized = true;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s;
    return this.s;
  }

  lastValue() {
    return this.s;
  }

  reset() {
    this.initialized = false;
  }
}

export class OneEuroFilter1D {
  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff; // Min cutoff frequency in Hz
    this.beta = beta;           // Speed coefficient
    this.dCutoff = dCutoff;     // Derivative cutoff in Hz

    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.lastTime = null;
  }

  alpha(rate, cutoff) {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(val, timestamp) {
    if (this.lastTime === null || timestamp === undefined) {
      this.lastTime = timestamp || performance.now();
      return this.xFilter.filter(val);
    }

    const dt = Math.max(1e-3, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Estimate derivative (velocity)
    const prevX = this.xFilter.initialized ? this.xFilter.lastValue() : val;
    const dx = (val - prevX) * rate;
    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));

    // Calculate dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(val, this.alpha(rate, cutoff));
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export class OneEuroFilter3D {
  constructor(minCutoff = 1.2, beta = 0.008, dCutoff = 1.0) {
    this.fx = new OneEuroFilter1D(minCutoff, beta, dCutoff);
    this.fy = new OneEuroFilter1D(minCutoff, beta, dCutoff);
    this.fz = new OneEuroFilter1D(minCutoff, beta, dCutoff);
  }

  filter(point, timestamp) {
    return {
      x: this.fx.filter(point.x, timestamp),
      y: this.fy.filter(point.y, timestamp),
      z: this.fz.filter(point.z || 0, timestamp)
    };
  }

  reset() {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

/**
 * Manages 1€ filters and motion dynamics for all tracked hands and fingertips
 */
export class HandMotionManager {
  constructor() {
    // Map of trackId -> { landmarkFilters: Array<OneEuroFilter3D>, lastPoints: Array }
    this.handFilters = new Map();
  }

  /**
   * Smooths landmarks and computes velocity vectors for tracked hands
   * @param {Array<Object>} trackedHands - Array of tracked hand objects from HandTracker
   * @param {number} timestamp - Frame timestamp
   * @returns {Array<Object>} Processed hands with smoothed landmarks, velocity, direction
   */
  process(trackedHands, timestamp = performance.now()) {
    const activeTrackIds = new Set();

    const enrichedHands = trackedHands.map((hand) => {
      activeTrackIds.add(hand.trackId);

      if (!this.handFilters.has(hand.trackId)) {
        // Initialize 21 landmark filters for this hand
        const filters = [];
        for (let i = 0; i < 21; i++) {
          // Landmark 8 (Index tip) and 4 (Thumb tip) tuned for silky smooth, jitter-free precision drawing
          if (i === 8 || i === 4) {
            filters.push(new OneEuroFilter3D(0.7, 0.018, 1.2));
          } else {
            filters.push(new OneEuroFilter3D(1.2, 0.008, 1.0));
          }
        }
        this.handFilters.set(hand.trackId, {
          filters,
          prevIndexTip: null,
          prevWrist: null,
          prevTime: null,
          smoothedVelocity: { x: 0, y: 0, speed: 0, direction: 0 }
        });
      }

      const state = this.handFilters.get(hand.trackId);

      // Filter all 21 landmarks
      const smoothedLandmarks = hand.landmarks.map((lm, idx) => {
        const filtered = state.filters[idx].filter(lm, timestamp);
        return {
          id: idx,
          x: filtered.x,
          y: filtered.y,
          z: filtered.z,
          rawX: lm.x,
          rawY: lm.y,
          rawZ: lm.z
        };
      });

      // Calculate velocity and motion dynamics for Index Tip (Pen) and Wrist
      const indexTip = smoothedLandmarks[8];
      const thumbTip = smoothedLandmarks[4];
      const wrist = smoothedLandmarks[0];

      let dt = 0.016; // default fallback ~60fps
      if (state.prevTime !== null) {
        dt = Math.max(1e-3, (timestamp - state.prevTime) / 1000.0);
      }

      let tipVelocity = { x: 0, y: 0, speed: 0, direction: 0 };
      if (state.prevIndexTip) {
        const rawVx = (indexTip.x - state.prevIndexTip.x) / dt;
        const rawVy = (indexTip.y - state.prevIndexTip.y) / dt;
        
        // Low-pass smooth the velocity vector to avoid jerkiness
        const vAlpha = 0.4;
        const sv = state.smoothedVelocity;
        sv.x = sv.x * (1 - vAlpha) + rawVx * vAlpha;
        sv.y = sv.y * (1 - vAlpha) + rawVy * vAlpha;
        sv.speed = Math.hypot(sv.x, sv.y);
        sv.direction = Math.atan2(sv.y, sv.x);
        tipVelocity = { ...sv };
      }

      // Update state history
      state.prevIndexTip = { x: indexTip.x, y: indexTip.y };
      state.prevWrist = { x: wrist.x, y: wrist.y };
      state.prevTime = timestamp;

      // Pinch center & distance
      const pinchDistance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const pinchCenter = {
        x: (thumbTip.x + indexTip.x) / 2,
        y: (thumbTip.y + indexTip.y) / 2
      };

      return {
        ...hand,
        landmarks: smoothedLandmarks,
        indexTip,
        thumbTip,
        wrist,
        pinchCenter,
        pinchDistance,
        tipVelocity
      };
    });

    // Cleanup stale hand filters
    for (const [id] of this.handFilters.entries()) {
      if (!activeTrackIds.has(id)) {
        this.handFilters.delete(id);
      }
    }

    return enrichedHands;
  }
}
