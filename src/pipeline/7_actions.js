/**
 * Stage 7: Action Dispatcher & Mapping Layer
 * Translates recognized gestures into discrete flower arrangement actions:
 * - Pinch: Select existing flower or spawn 1 new flower with cooldown
 * - Move: Smoothly reposition selected flower
 * - Open Palm: Flower inspection and hover mode
 * - Fist (Held): Clear arrangement
 * - Peace Sign: Cycle flower variety
 */

export class ActionDispatcher {
  constructor() {
    this.listeners = new Map();
    this.handStates = new Map();
    this.lastSpawnTime = 0;
    this.spawnCooldownMs = 1500; // 1.5s cooldown
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
    if (this.listeners.has('*')) {
      for (const cb of this.listeners.get('*')) {
        cb({ type: actionType, payload });
      }
    }
  }

  process(classifiedHands, timestamp = performance.now()) {
    const activeTrackIds = new Set();

    for (const hand of classifiedHands) {
      activeTrackIds.add(hand.trackId);

      if (!this.handStates.has(hand.trackId)) {
        this.handStates.set(hand.trackId, {
          previousGesture: 'none',
          gestureStartTime: timestamp,
          isPinching: false,
          fistTriggered: false,
          lastCycleTime: 0
        });
      }

      const state = this.handStates.get(hand.trackId);
      const recognizedGesture = hand.gestureResult.gesture;

      if (recognizedGesture !== state.previousGesture) {
        state.previousGesture = recognizedGesture;
        state.gestureStartTime = timestamp;
        state.fistTriggered = false;
      }

      const gestureDuration = timestamp - state.gestureStartTime;
      const pinchPoint = hand.pinchCenter || hand.indexTip;

      // 1. PINCH GESTURE: Grab or Create Exactly One Flower
      if (recognizedGesture === 'pinch') {
        if (!state.isPinching) {
          state.isPinching = true;
          this.emit('PINCH_START', {
            hand,
            trackId: hand.trackId,
            point: pinchPoint,
            timestamp
          });
        } else {
          this.emit('PINCH_MOVE', {
            hand,
            trackId: hand.trackId,
            point: pinchPoint,
            timestamp
          });
        }
      } else {
        if (state.isPinching) {
          state.isPinching = false;
          this.emit('PINCH_END', {
            hand,
            trackId: hand.trackId,
            point: pinchPoint,
            timestamp
          });
        }
      }

      // 2. OPEN PALM / POINTING: Hover & Inspect
      if (recognizedGesture === 'open_palm' || recognizedGesture === 'pointing') {
        this.emit('HOVER', {
          hand,
          trackId: hand.trackId,
          point: hand.indexTip,
          gesture: recognizedGesture,
          timestamp
        });
      }

      // 3. CLOSED FIST (Held for 1.2s): Clear Arrangement
      if (recognizedGesture === 'fist' && gestureDuration >= 1100 && !state.fistTriggered) {
        state.fistTriggered = true;
        this.emit('CLEAR_CANVAS', {
          hand,
          trackId: hand.trackId,
          timestamp
        });
      }

      // 4. THUMBS UP: Immediate Clear
      if (recognizedGesture === 'thumbs_up' && gestureDuration >= 400 && !state.fistTriggered) {
        state.fistTriggered = true;
        this.emit('CLEAR_CANVAS', {
          hand,
          trackId: hand.trackId,
          timestamp
        });
      }

      // 5. PEACE SIGN (✌️): Cycle Flower Variety (1.2s debounce)
      if (recognizedGesture === 'peace' && gestureDuration >= 350 && timestamp - state.lastCycleTime > 1200) {
        state.lastCycleTime = timestamp;
        this.emit('CYCLE_FLOWER', {
          hand,
          trackId: hand.trackId,
          timestamp
        });
      }
    }

    // Clean up hands that left the camera
    for (const [trackId, state] of this.handStates.entries()) {
      if (!activeTrackIds.has(trackId)) {
        if (state.isPinching) {
          this.emit('PINCH_END', { trackId });
        }
        this.handStates.delete(trackId);
      }
    }
  }
}
