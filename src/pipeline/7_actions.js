/**
 * Stage 7: Action Dispatcher & Continuous Gesture Mapping Layer
 * Translates recognized hand gestures and continuous index finger coordinates
 * into fluid real-time drawing actions:
 * - DRAW_START / DRAW_MOVE / DRAW_END: Continuous stream for floral & line trails
 * - CYCLE_FLOWER: Peace sign gesture (✌️)
 * - CLEAR_CANVAS: Closed fist (✊) or Thumbs up (👍)
 * - HOVER / INSPECT: Open palm (🖐️)
 */

export class ActionDispatcher {
  constructor(options = {}) {
    this.listeners = new Map();
    this.handStates = new Map();
    this.alwaysDraw = options.alwaysDraw !== undefined ? options.alwaysDraw : true;
    this.fistHoldDuration = 1000; // ms
  }

  setAlwaysDraw(enabled) {
    this.alwaysDraw = !!enabled;
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
          isDrawing: false,
          previousGesture: 'none',
          gestureStartTime: timestamp,
          fistTriggered: false,
          lastCycleTime: 0,
          lastPoint: null
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

      // 1. CLEAR CANVAS GESTURES: Thumbs Up or Closed Fist held
      if (recognizedGesture === 'thumbs_up' && gestureDuration >= 350 && !state.fistTriggered) {
        state.fistTriggered = true;
        if (state.isDrawing) {
          state.isDrawing = false;
          this.emit('DRAW_END', { trackId: hand.trackId, timestamp });
        }
        this.emit('CLEAR_CANVAS', { hand, trackId: hand.trackId, timestamp });
        continue;
      }

      if (recognizedGesture === 'fist' && gestureDuration >= this.fistHoldDuration && !state.fistTriggered) {
        state.fistTriggered = true;
        if (state.isDrawing) {
          state.isDrawing = false;
          this.emit('DRAW_END', { trackId: hand.trackId, timestamp });
        }
        this.emit('CLEAR_CANVAS', { hand, trackId: hand.trackId, timestamp });
        continue;
      }

      // 2. CYCLE FLOWER: Peace Sign (✌️) with 1.2s debounce
      if (recognizedGesture === 'peace' && gestureDuration >= 300 && timestamp - state.lastCycleTime > 1200) {
        state.lastCycleTime = timestamp;
        if (state.isDrawing) {
          state.isDrawing = false;
          this.emit('DRAW_END', { trackId: hand.trackId, timestamp });
        }
        this.emit('CYCLE_FLOWER', { hand, trackId: hand.trackId, timestamp });
        continue;
      }

      // 3. CONTINUOUS DRAWING CONDITION:
      // In AlwaysDraw mode: any hand gesture except resting fist/thumbs_up/open_palm will draw.
      // In strict gesture mode: pointing index or pinch triggers drawing.
      const isPinching = recognizedGesture === 'pinch';
      const isPointing = recognizedGesture === 'pointing';
      const isResting = recognizedGesture === 'fist' || recognizedGesture === 'thumbs_up';

      const shouldDraw = this.alwaysDraw
        ? (!isResting && recognizedGesture !== 'open_palm')
        : (isPointing || isPinching);

      // Coordinate to use for pen trail
      const currentPoint = isPinching
        ? (hand.pinchCenter || hand.indexTip)
        : hand.indexTip;

      if (shouldDraw && currentPoint) {
        if (!state.isDrawing) {
          state.isDrawing = true;
          state.lastPoint = currentPoint;
          this.emit('DRAW_START', {
            hand,
            trackId: hand.trackId,
            point: currentPoint,
            timestamp
          });
        } else {
          state.lastPoint = currentPoint;
          this.emit('DRAW_MOVE', {
            hand,
            trackId: hand.trackId,
            point: currentPoint,
            timestamp
          });
        }
      } else {
        if (state.isDrawing) {
          state.isDrawing = false;
          this.emit('DRAW_END', {
            hand,
            trackId: hand.trackId,
            point: state.lastPoint || currentPoint,
            timestamp
          });
        }

        // Emit hover inspection if open palm
        if (recognizedGesture === 'open_palm' && currentPoint) {
          this.emit('HOVER', {
            hand,
            trackId: hand.trackId,
            point: currentPoint,
            gesture: 'open_palm',
            timestamp
          });
        }
      }
    }

    // Clean up hands that left the camera view
    for (const [trackId, state] of this.handStates.entries()) {
      if (!activeTrackIds.has(trackId)) {
        if (state.isDrawing) {
          this.emit('DRAW_END', { trackId, timestamp });
        }
        this.handStates.delete(trackId);
      }
    }
  }
}
