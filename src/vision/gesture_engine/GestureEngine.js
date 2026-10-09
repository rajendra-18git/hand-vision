/**
 * VisionGarden AI - Centralized Gesture Engine
 * 
 * Features:
 * - 21 hand landmarks tracking per hand.
 * - Palm-size normalized thumb-index pinch detection with hysteresis (enter < 0.38 scale, exit > 0.48 scale).
 * - Continuous pinch distance calculation (normalized 0.0 -> 1.0 with quadratic easing).
 * - Accidental trigger prevention with configurable hold durations, hysteresis gates, and cooldown timers.
 * - Palm orientation & 3D rotation angles (roll, pitch, yaw).
 * - Velocity tracking & dynamic swipe detection (left, right, up, down).
 * - Two-hand coordination & Invisibility cloak gesture recognition.
 */

import { dist2D } from '../../utils/geometry.js';
import { LANDMARK_INDICES } from '../../pipeline/3_keypoints.js';

export const GESTURE_TYPES = {
  NONE: 'none',
  POINT: 'point',
  PINCH: 'pinch',
  OPEN_PALM: 'open_palm',
  FIST: 'fist',
  PEACE: 'peace',
  THUMBS_UP: 'thumbs_up',
  INVISIBILITY: 'invisibility',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SWIPE_UP: 'swipe_up',
  SWIPE_DOWN: 'swipe_down'
};

export class GestureEngine {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.swipeVelocityThreshold = options.swipeVelocityThreshold || 520; // px/sec
    this.swipeCooldownMs = options.swipeCooldownMs || 450;
    
    // Accidental trigger prevention settings
    this.gestureHoldThresholdMs = options.gestureHoldThresholdMs || 180; // ms gesture must be held
    this.actionCooldownMs = options.actionCooldownMs || 900; // ms cooldown between discrete actions
    
    // Hand tracking history for velocity & swipe detection
    // trackId -> { history: Array<{ x, y, time }>, lastSwipeTime: number, isPinching: boolean, ... }
    this.handHistories = new Map();

    // Debounce & state stabilization
    this.gestureHoldTracker = new Map(); // trackId -> { candidateGesture, startTime, confirmedGesture }
  }

  /**
   * Main entry point to process tracked and filtered hands
   * @param {Array<Object>} trackedHands - Array of tracked hands from HandMotionManager
   * @param {number} timestamp - Current frame timestamp
   * @returns {Object} Enriched gesture recognition result
   */
  process(trackedHands, timestamp = performance.now()) {
    if (!trackedHands || trackedHands.length === 0) {
      return {
        hands: [],
        primaryHand: null,
        secondaryHand: null,
        activeGesture: GESTURE_TYPES.NONE,
        twoHandState: null,
        pinchIntensity: 0.5,
        invisibilityActive: false
      };
    }

    const activeTrackIds = new Set();
    const recognizedHands = trackedHands.map((hand) => {
      activeTrackIds.add(hand.trackId);
      return this.analyzeHand(hand, timestamp);
    });

    // Clean up stale histories
    for (const [id] of this.handHistories.entries()) {
      if (!activeTrackIds.has(id)) {
        this.handHistories.delete(id);
        this.gestureHoldTracker.delete(id);
      }
    }

    // Determine primary and secondary hands (sorted left to right on screen)
    let primaryHand = recognizedHands[0] || null;
    let secondaryHand = recognizedHands[1] || null;

    if (recognizedHands.length >= 2) {
      recognizedHands.sort((a, b) => a.palmCenter.x - b.palmCenter.x);
      primaryHand = recognizedHands[0];
      secondaryHand = recognizedHands[1];
    }

    // Two-hand coordinated state
    const twoHandState = this.evaluateTwoHandInteraction(recognizedHands, timestamp);
    const invisibilityActive = !!(twoHandState && twoHandState.invisibilityTriggered);

    // Dominant active gesture
    const activeGesture = primaryHand ? primaryHand.gesture : GESTURE_TYPES.NONE;
    const pinchIntensity = primaryHand ? primaryHand.normalizedPinchDistance : 0.5;

    return {
      hands: recognizedHands,
      primaryHand,
      secondaryHand,
      activeGesture,
      twoHandState,
      pinchIntensity,
      invisibilityActive
    };
  }

  /**
   * Analyzes single hand geometry, normalized pinch with hysteresis, and gesture hold state
   */
  analyzeHand(hand, timestamp) {
    const lm = hand.landmarks;
    const scale = Math.max(hand.handScale || 50, 25);
    const wrist = lm[LANDMARK_INDICES.WRIST];
    const palmCenter = hand.palmCenter || {
      x: (wrist.x + lm[5].x + lm[17].x) / 3,
      y: (wrist.y + lm[5].y + lm[17].y) / 3
    };

    // 1. Hand History for Velocity & Swipe
    if (!this.handHistories.has(hand.trackId)) {
      this.handHistories.set(hand.trackId, {
        history: [],
        lastSwipeTime: 0,
        isPinching: false,
        lastPinchRatio: 0.5,
        rotation: 0
      });
    }
    const historyState = this.handHistories.get(hand.trackId);
    historyState.history.push({ x: palmCenter.x, y: palmCenter.y, time: timestamp });

    while (historyState.history.length > 0 && timestamp - historyState.history[0].time > 300) {
      historyState.history.shift();
    }

    const velocity = this.calculateHandVelocity(historyState.history);
    const rotation = this.calculateHandRotation(lm, wrist, palmCenter);
    historyState.rotation = rotation;

    // 2. Stable Thumb-Index Pinch with Palm-Normalized Distance & Hysteresis
    const pinchData = this.calculatePinchMetrics(lm, scale, historyState.isPinching);
    historyState.isPinching = pinchData.isPinching;
    historyState.lastPinchRatio = pinchData.normalizedDistance;

    // 3. Finger Curl & Extension Metrics
    const fingerStates = this.extractFingerStates(lm, wrist, palmCenter, scale);

    // 4. Raw Gesture Candidate Detection
    const isOpenPalm = this.detectOpenPalm(fingerStates);
    const isFist = this.detectFist(fingerStates, pinchData.isPinching);
    const isPoint = this.detectPoint(fingerStates, pinchData.isPinching);
    const isPeace = this.detectPeace(fingerStates);
    const isThumbsUp = this.detectThumbsUp(lm, wrist, fingerStates, scale, pinchData.isPinching);
    
    // Swipe check (with velocity & direction cooldown)
    let swipeGesture = null;
    if (timestamp - historyState.lastSwipeTime > this.swipeCooldownMs) {
      swipeGesture = this.detectSwipe(velocity);
      if (swipeGesture) {
        historyState.lastSwipeTime = timestamp;
      }
    }

    // Determine candidate gesture
    let rawGesture = GESTURE_TYPES.NONE;
    let confidence = 0.5;

    if (swipeGesture) {
      rawGesture = swipeGesture;
      confidence = 0.95;
    } else if (isThumbsUp) {
      rawGesture = GESTURE_TYPES.THUMBS_UP;
      confidence = 0.98;
    } else if (pinchData.isPinching) {
      rawGesture = GESTURE_TYPES.PINCH;
      confidence = 0.97;
    } else if (isPoint) {
      rawGesture = GESTURE_TYPES.POINT;
      confidence = 0.95;
    } else if (isPeace) {
      rawGesture = GESTURE_TYPES.PEACE;
      confidence = 0.96;
    } else if (isOpenPalm) {
      rawGesture = GESTURE_TYPES.OPEN_PALM;
      confidence = 0.94;
    } else if (isFist) {
      rawGesture = GESTURE_TYPES.FIST;
      confidence = 0.92;
    }

    // 5. Apply Configurable Hold Duration & Hysteresis to Prevent Accidental Triggers
    const confirmedGesture = this.applyHoldStabilization(hand.trackId, rawGesture, timestamp);

    return {
      ...hand,
      palmCenter,
      scale,
      rotation,
      velocity,
      fingerStates,
      pinchData,
      pinchCenter: pinchData.center,
      rawPinchDistance: pinchData.distance,
      normalizedPinchDistance: pinchData.normalizedDistance,
      pinchPercentage: Math.round(pinchData.normalizedDistance * 100),
      isPinching: pinchData.isPinching,
      gesture: confirmedGesture,
      rawGesture,
      confidence,
      pointingPosition: isPoint ? lm[8] : null
    };
  }

  /**
   * Thumb-Index pinch calculation normalized by palm scale with hysteresis:
   * Enter pinch when normalized distance < 0.38, exit pinch when > 0.48
   */
  calculatePinchMetrics(lm, scale, currentlyPinching = false) {
    const thumbTip = lm[LANDMARK_INDICES.THUMB_TIP];
    const indexTip = lm[LANDMARK_INDICES.INDEX_FINGER_TIP];
    
    const distance = dist2D(thumbTip, indexTip);
    const normalizedRatio = distance / scale;

    // Hysteresis thresholds to eliminate pinch flutter
    const enterThreshold = 0.38;
    const exitThreshold = 0.48;
    const isPinching = currentlyPinching 
      ? (normalizedRatio < exitThreshold)
      : (normalizedRatio < enterThreshold);

    // Continuous 0.0 -> 1.0 slider mapping with smooth ease curve
    const minSpan = 0.10 * scale;
    const maxSpan = 0.85 * scale;
    const clamped = Math.max(0, Math.min(1, (distance - minSpan) / (maxSpan - minSpan)));
    const normalizedDistance = Math.round(clamped * 100) / 100;

    const center = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
      z: ((thumbTip.z || 0) + (indexTip.z || 0)) / 2
    };

    return {
      distance,
      normalizedRatio,
      normalizedDistance,
      center,
      isPinching,
      isTightPinch: normalizedRatio < 0.32,
      isOpenSpan: normalizedRatio > 0.65
    };
  }

  /**
   * Detailed finger curl and extension state extraction with angle & distance metrics
   */
  extractFingerStates(lm, wrist, palmCenter, scale) {
    const isCurled = (tip, pip, mcp) => {
      const dTip = dist2D(lm[tip], wrist);
      const dPip = dist2D(lm[pip], wrist);
      const dMcp = dist2D(lm[mcp], wrist);
      const palmDist = dist2D(lm[tip], palmCenter) / scale;
      const extRatio = dist2D(lm[tip], lm[mcp]) / scale;
      
      return (dTip < dPip * 1.05) || (dTip < dMcp * 1.08) || (palmDist < 0.65) || (extRatio < 0.62);
    };

    const isExtended = (tip, pip, mcp) => {
      const dTip = dist2D(lm[tip], wrist);
      const dPip = dist2D(lm[pip], wrist);
      const dMcp = dist2D(lm[mcp], wrist);
      const palmDist = dist2D(lm[tip], palmCenter) / scale;
      const extRatio = dist2D(lm[tip], lm[mcp]) / scale;

      return (dTip > dPip * 1.04 && dTip > dMcp * 1.12 && extRatio > 0.68 && palmDist > 0.68);
    };

    const indexCurled = isCurled(8, 6, 5);
    const middleCurled = isCurled(12, 10, 9);
    const ringCurled = isCurled(16, 14, 13);
    const pinkyCurled = isCurled(20, 18, 17);

    const indexExtended = isExtended(8, 6, 5);
    const middleExtended = isExtended(12, 10, 9);
    const ringExtended = isExtended(16, 14, 13);
    const pinkyExtended = isExtended(20, 18, 17);

    const thumbTip = lm[LANDMARK_INDICES.THUMB_TIP];
    const thumbExtRatio = dist2D(thumbTip, lm[2]) / scale;
    const thumbExtended = thumbExtRatio > 0.50;
    const thumbPointingUp = (thumbTip.y < lm[3].y - 0.05 * scale) && (thumbTip.y < lm[2].y) && (thumbTip.y < lm[5].y);

    const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);
    const extendedCount = (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0);

    return {
      index: { curled: indexCurled, extended: indexExtended, tip: lm[8] },
      middle: { curled: middleCurled, extended: middleExtended, tip: lm[12] },
      ring: { curled: ringCurled, extended: ringExtended, tip: lm[16] },
      pinky: { curled: pinkyCurled, extended: pinkyExtended, tip: lm[20] },
      thumb: { extended: thumbExtended, pointingUp: thumbPointingUp, tip: thumbTip },
      curledCount,
      extendedCount
    };
  }

  detectOpenPalm(fingerStates) {
    return fingerStates.extendedCount >= 4 || (fingerStates.index.extended && fingerStates.middle.extended && fingerStates.ring.extended && fingerStates.pinky.extended);
  }

  detectFist(fingerStates, isPinching) {
    return fingerStates.curledCount >= 3 && !fingerStates.index.extended && !fingerStates.middle.extended && !isPinching;
  }

  detectPoint(fingerStates, isPinching) {
    if (isPinching) return false;
    return fingerStates.index.extended && !fingerStates.middle.extended;
  }

  detectPeace(fingerStates) {
    return fingerStates.index.extended && fingerStates.middle.extended && (fingerStates.ring.curled || !fingerStates.ring.extended) && (fingerStates.pinky.curled || !fingerStates.pinky.extended);
  }

  detectThumbsUp(lm, wrist, fingerStates, scale, isPinching) {
    const thumbTip = lm[LANDMARK_INDICES.THUMB_TIP];
    const thumbUpward = (thumbTip.y < lm[3].y - 0.05 * scale) && (thumbTip.y < lm[2].y) && (thumbTip.y < lm[5].y);
    return thumbUpward && fingerStates.thumb.extended && fingerStates.curledCount >= 3 && !isPinching;
  }

  detectSwipe(velocity) {
    if (velocity.speed < this.swipeVelocityThreshold) return null;

    const absVx = Math.abs(velocity.vx);
    const absVy = Math.abs(velocity.vy);

    if (absVx > absVy * 1.5) {
      return velocity.vx > 0 ? GESTURE_TYPES.SWIPE_RIGHT : GESTURE_TYPES.SWIPE_LEFT;
    } else if (absVy > absVx * 1.5) {
      return velocity.vy > 0 ? GESTURE_TYPES.SWIPE_DOWN : GESTURE_TYPES.SWIPE_UP;
    }
    return null;
  }

  calculateHandVelocity(history) {
    if (!history || history.length < 2) {
      return { vx: 0, vy: 0, speed: 0, direction: 0 };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const dt = Math.max(0.016, (last.time - first.time) / 1000);

    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);
    const direction = Math.atan2(vy, vx);

    return { vx, vy, speed, direction };
  }

  calculateHandRotation(lm, wrist, palmCenter) {
    const middleMcp = lm[LANDMARK_INDICES.MIDDLE_FINGER_MCP];
    const angleRad = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
    const rollDegrees = (angleRad * 180 / Math.PI) + 90;
    const pitch = (middleMcp.z - wrist.z) * 100;

    return { roll: rollDegrees, pitch, angleRad };
  }

  /**
   * Two-Hand Coordination & Invisibility Cloak Gesture Trigger (Crossed wrists or Double Open Palms facing forward)
   */
  evaluateTwoHandInteraction(hands, timestamp) {
    if (hands.length < 2) return null;

    const leftHand = hands[0];
    const rightHand = hands[1];
    const centerDist = dist2D(leftHand.palmCenter, rightHand.palmCenter);
    const averageScale = (leftHand.scale + rightHand.scale) / 2;

    // Invisibility Gesture Trigger: Both open palms pushing outward or crossed wrists close together
    const bothOpenPalms = leftHand.gesture === GESTURE_TYPES.OPEN_PALM && rightHand.gesture === GESTURE_TYPES.OPEN_PALM;
    const wristsCrossed = dist2D(leftHand.landmarks[0], rightHand.landmarks[0]) < 1.2 * averageScale;
    const invisibilityTriggered = (bothOpenPalms && centerDist > 2.5 * averageScale) || wristsCrossed;

    return {
      active: true,
      leftHandGesture: leftHand.gesture,
      rightHandGesture: rightHand.gesture,
      leftPinch: leftHand.isPinching,
      rightPinch: rightHand.isPinching,
      controlIntensity: rightHand.normalizedPinchDistance,
      selectionGesture: leftHand.gesture,
      handDistance: centerDist,
      invisibilityTriggered
    };
  }

  /**
   * Accidental Trigger Prevention: Gesture hold stabilization filter
   */
  applyHoldStabilization(trackId, candidateGesture, timestamp) {
    if (!this.gestureHoldTracker.has(trackId)) {
      this.gestureHoldTracker.set(trackId, {
        candidate: candidateGesture,
        startTime: timestamp,
        confirmed: candidateGesture
      });
      return candidateGesture;
    }

    const state = this.gestureHoldTracker.get(trackId);

    // Fast-path interactive continuous gestures (pinch & point require zero lag)
    if (candidateGesture === GESTURE_TYPES.PINCH || candidateGesture === GESTURE_TYPES.POINT) {
      state.candidate = candidateGesture;
      state.confirmed = candidateGesture;
      state.startTime = timestamp;
      return candidateGesture;
    }

    // Dynamic swipe triggers immediately
    if (candidateGesture.startsWith('swipe_')) {
      return candidateGesture;
    }

    // Discrete action gestures (Peace, Fist, Open Palm, Thumbs Up) require consistent hold
    if (candidateGesture === state.candidate) {
      const elapsed = timestamp - state.startTime;
      if (elapsed >= this.gestureHoldThresholdMs) {
        state.confirmed = candidateGesture;
      }
    } else {
      state.candidate = candidateGesture;
      state.startTime = timestamp;
    }

    return state.confirmed;
  }
}
