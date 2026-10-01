/**
 * Stage 7: Action Dispatcher & Mapping Layer
 * Translates recognized gestures and motion events into declarative application actions.
 */

export const DEFAULT_ACTION_CONFIG = {
  // Gesture -> Action definition
  pointing: {
    type: 'DRAW',
    target: 'indexTip',
    continuous: true,
    description: 'Plant flowers with index finger'
  },
  pinch: {
    type: 'DRAW',
    target: 'pinchCenter',
    continuous: true,
    description: 'Precision pinch planting'
  },
  open_palm: {
    type: 'BLOSSOM_BURST',
    trigger: 'ENTER',
    debounceMs: 800,
    description: 'Open palm to shower blooming flowers'
  },
  fist: {
    type: 'REST',
    description: 'Rest hand without drawing'
  },
  thumbs_up: {
    type: 'CLEAR_CANVAS',
    trigger: 'ENTER',
    debounceMs: 700,
    description: 'Thumbs up to clear garden'
  },
  peace: {
    type: 'CYCLE_FLOWER',
    trigger: 'ENTER',
    debounceMs: 500,
    description: 'Peace sign to switch flower variety'
  }
};

export class ActionDispatcher {
  constructor(config = DEFAULT_ACTION_CONFIG) {
    this.config = { ...config };
    this.listeners = new Map();
    this.alwaysDraw = false; // When true, always draws on indexTip unless resting or performing actions

    // Temporal tracking for debouncing per hand
    this.handStates = new Map();
  }

  setAlwaysDraw(always) {
    this.alwaysDraw = always;
  }

  on(actionType, callback) {
    if (!this.listeners.has(actionType)) {
      this.listeners.set(actionType, new Set());
    }
    this.listeners.get(actionType).add(callback);
    return () => this.listeners.get(actionType).delete(callback);
  }

  emit(actionType, payload) {
    if (this.listeners.has(actionType)) {
      for (const cb of this.listeners.get(actionType)) {
        cb(payload);
      }
    }
    // Catch-all
    if (this.listeners.has('*')) {
      for (const cb of this.listeners.get('*')) {
        cb({ type: actionType, payload });
      }
    }
  }

  /**
   * Process classified hands and dispatch corresponding actions
   * @param {Array<Object>} classifiedHands - Hands with gesture classification from stage 6
   * @param {number} timestamp - Monotonic frame timestamp
   */
  process(classifiedHands, timestamp = performance.now()) {
    const activeTrackIds = new Set();

    for (const hand of classifiedHands) {
      activeTrackIds.add(hand.trackId);

      if (!this.handStates.has(hand.trackId)) {
        this.handStates.set(hand.trackId, {
          currentGesture: 'neutral',
          gestureStartTime: timestamp,
          isDrawing: false,
          lastTriggerTime: 0
        });
      }

      const state = this.handStates.get(hand.trackId);
      const recognizedGesture = hand.gestureResult.gesture;
      const mapping = this.config[recognizedGesture];

      // Detect general gesture transition
      if (recognizedGesture !== state.currentGesture) {
        state.currentGesture = recognizedGesture;
        state.gestureStartTime = timestamp;
      }

      const gestureDuration = timestamp - state.gestureStartTime;

      // Non-drawing gestures (Rest, Open Palm, Thumbs Up, Peace)
      const isResting = recognizedGesture === 'fist' || recognizedGesture === 'open_palm' || recognizedGesture === 'thumbs_up' || recognizedGesture === 'peace';
      
      const shouldDraw =
        !isResting &&
        ((mapping && mapping.type === 'DRAW') ||
         (this.alwaysDraw && recognizedGesture !== 'none'));

      if (shouldDraw) {
        const penPoint = (mapping && mapping.target === 'pinchCenter') ? hand.pinchCenter : hand.indexTip;

        if (!state.isDrawing) {
          state.isDrawing = true;
          this.emit('DRAW_START', {
            hand,
            trackId: hand.trackId,
            point: penPoint,
            velocity: hand.tipVelocity,
            timestamp
          });
        } else {
          this.emit('DRAW_MOVE', {
            hand,
            trackId: hand.trackId,
            point: penPoint,
            velocity: hand.tipVelocity,
            timestamp
          });
        }
      } else {
        // Stop drawing if active
        if (state.isDrawing) {
          state.isDrawing = false;
          this.emit('DRAW_END', { hand, trackId: hand.trackId });
        }

        if (!mapping) continue;

        // Discrete gesture triggers (ENTER with debounce)
        if (mapping.trigger === 'ENTER') {
          const debounce = mapping.debounceMs || 600;
          if (gestureDuration >= 80 && timestamp - state.lastTriggerTime > debounce) {
            state.lastTriggerTime = timestamp;
            this.emit(mapping.type, {
              hand,
              trackId: hand.trackId,
              gesture: recognizedGesture,
              timestamp
            });
          }
        } else if (mapping.type === 'HOVER') {
          this.emit('HOVER', {
            hand,
            trackId: hand.trackId,
            point: hand.indexTip,
            velocity: hand.tipVelocity
          });
        }
      }
    }

    // Clean up hands that disappeared
    for (const [trackId, state] of this.handStates.entries()) {
      if (!activeTrackIds.has(trackId)) {
        if (state.isDrawing) {
          this.emit('DRAW_END', { trackId });
        }
        this.handStates.delete(trackId);
      }
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}
