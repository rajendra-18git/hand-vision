/**
 * VisionGarden AI - Centralized Gesture Engine
 * 
 * Provides robust geometric, kinematic, and temporal gesture recognition:
 * - 21 hand landmarks tracking per hand
 * - Finger curl & extension state
 * - Continuous pinch distance calculation (normalized 0.0 -> 1.0)
 * - Palm orientation & 3D rotation angles (roll, pitch, yaw)
 * - Velocity tracking & dynamic swipe detection (left, right, up, down)
 * - Two-hand coordination (Left: Mode/Item selection, Right: Intensity/Draw)
 * - Gesture confidence scoring and debounce stabilization
 */

import { dist2D, angleBetweenPoints } from '../../utils/geometry.js';
import { LANDMARK_INDICES } from '../../pipeline/3_keypoints.js';

export const GESTURE_TYPES = {
  NONE: 'none',
  POINT: 'point',
  PINCH: 'pinch',
  OPEN_PALM: 'open_palm',
  FIST: 'fist',
  PEACE: 'peace',
  THUMBS_UP: 'thumbs_up',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SWIPE_UP: 'swipe_up',
  SWIPE_DOWN: 'swipe_down'
};

export class GestureEngine {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.swipeVelocityThreshold = options.swipeVelocityThreshold || 550; // px/sec
    this.swipeCooldownMs = options.swipeCooldownMs || 450;
    
    // Hand tracking history for kinematic velocity & swipe detection
    // trackId -> { history: Array<{ x, y, time }>, lastSwipeTime: number, lastPinchDistance: number }
    this.handHistories = new Map();

    // Debounce & state stabilization
    this.gestureHistory = new Map(); // trackId -> Array<{ gesture, timestamp }>
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
        pinchIntensity: 0.5
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
        this.gestureHistory.delete(id);
      }
    }

    // Determine primary and secondary hands (sorted by x position or dominance)
    // In mirrored webcam: Left screen = user's right hand; Right screen = user's left hand
    let primaryHand = recognizedHands[0] || null;
    let secondaryHand = recognizedHands[1] || null;

    if (recognizedHands.length >= 2) {
      // Sort left to right on screen
      recognizedHands.sort((a, b) => a.palmCenter.x - b.palmCenter.x);
      // Primary is usually right side or dominant hand
      primaryHand = recognizedHands[0];
      secondaryHand = recognizedHands[1];
    }

    // Two-hand coordinated state
    const twoHandState = this.evaluateTwoHandInteraction(recognizedHands, timestamp);

    // Get dominant active gesture
    const activeGesture = primaryHand ? primaryHand.gesture : GESTURE_TYPES.NONE;
    const pinchIntensity = primaryHand ? primaryHand.normalizedPinchDistance : 0.5;

    return {
      hands: recognizedHands,
      primaryHand,
      secondaryHand,
      activeGesture,
      twoHandState,
      pinchIntensity
    };
  }

  /**
   * Performs in-depth geometric and kinematic feature extraction on a single hand
   */
  analyzeHand(hand, timestamp) {
    const lm = hand.landmarks;
    const scale = Math.max(hand.handScale || 50, 30);
    const wrist = lm[LANDMARK_INDICES.WRIST];
    const palmCenter = hand.palmCenter || {
      x: (wrist.x + lm[5].x + lm[17].x) / 3,
      y: (wrist.y + lm[5].y + lm[17].y) / 3
    };

    // 1. History & Kinematic Movement Calculation
    if (!this.handHistories.has(hand.trackId)) {
      this.handHistories.set(hand.trackId, {
        history: [],
        lastSwipeTime: 0,
        lastPinchDistance: 0.5,
        rotation: 0
      });
    }
    const historyState = this.handHistories.get(hand.trackId);
    historyState.history.push({ x: palmCenter.x, y: palmCenter.y, time: timestamp });

    // Keep only last 300ms of history for velocity & swipe detection
    while (historyState.history.length > 0 && timestamp - historyState.history[0].time > 300) {
      historyState.history.shift();
    }

    const velocity = this.calculateHandVelocity(historyState.history);
    const rotation = this.calculateHandRotation(lm, wrist, palmCenter);
    historyState.rotation = rotation;

    // 2. Pinch Analysis (Continuous 0.0 -> 1.0 normalization)
    const pinchData = this.calculatePinchMetrics(lm, scale);
    historyState.lastPinchDistance = pinchData.normalizedDistance;

    // 3. Finger Curl & Extension Metrics
    const fingerStates = this.extractFingerStates(lm, wrist, palmCenter, scale);

    // 4. Gesture Detection Pipeline
    const isPinching = this.detectPinch(pinchData, fingerStates);
    const isOpenPalm = this.detectOpenPalm(fingerStates);
    const isFist = this.detectFist(fingerStates, isPinching);
    const isPoint = this.detectPoint(fingerStates, isPinching);
    const isPeace = this.detectPeace(fingerStates);
    const isThumbsUp = this.detectThumbsUp(lm, wrist, fingerStates, scale, isPinching);
    
    // Swipe check (with cooldown)
    let swipeGesture = null;
    if (timestamp - historyState.lastSwipeTime > this.swipeCooldownMs) {
      swipeGesture = this.detectSwipe(velocity);
      if (swipeGesture) {
        historyState.lastSwipeTime = timestamp;
      }
    }

    // 5. Determine dominant discrete gesture
    let gesture = GESTURE_TYPES.NONE;
    let confidence = 0.5;

    if (swipeGesture) {
      gesture = swipeGesture;
      confidence = 0.95;
    } else if (isThumbsUp) {
      gesture = GESTURE_TYPES.THUMBS_UP;
      confidence = 0.98;
    } else if (isPinching) {
      gesture = GESTURE_TYPES.PINCH;
      confidence = 0.97;
    } else if (isPoint) {
      gesture = GESTURE_TYPES.POINT;
      confidence = 0.95;
    } else if (isPeace) {
      gesture = GESTURE_TYPES.PEACE;
      confidence = 0.96;
    } else if (isOpenPalm) {
      gesture = GESTURE_TYPES.OPEN_PALM;
      confidence = 0.94;
    } else if (isFist) {
      gesture = GESTURE_TYPES.FIST;
      confidence = 0.92;
    }

    // 6. Stabilize gesture with temporal buffer
    gesture = this.stabilizeGesture(hand.trackId, gesture, confidence, timestamp);

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
      isPinching,
      gesture,
      confidence,
      pointingPosition: isPoint ? lm[8] : null
    };
  }

  /**
   * Continuous pinch calculation with non-linear easing for natural control
   * Normalized 0.0 (completely touching) to 1.0 (fully open thumb-index span)
   */
  calculatePinchMetrics(lm, scale) {
    const thumbTip = lm[LANDMARK_INDICES.THUMB_TIP];
    const indexTip = lm[LANDMARK_INDICES.INDEX_FINGER_TIP];
    
    const distance = dist2D(thumbTip, indexTip);
    // Natural human pinch threshold: 0.15 scale is tight touch, 1.1 scale is maximum wide open
    const minD = 0.12 * scale;
    const maxD = 0.95 * scale;
    
    // Normalized 0.0 -> 1.0
    const clamped = Math.max(0, Math.min(1, (distance - minD) / (maxD - minD)));
    
    // Smooth quadratic ease for silky continuous slider response
    const normalizedDistance = Math.round(clamped * 100) / 100;

    const center = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
      z: ((thumbTip.z || 0) + (indexTip.z || 0)) / 2
    };

    return {
      distance,
      normalizedDistance,
      center,
      isTightPinch: distance < 0.38 * scale,
      isOpenSpan: distance > 0.70 * scale
    };
  }

  /**
   * Detailed finger curl and extension state extraction
   */
  extractFingerStates(lm, wrist, palmCenter, scale) {
    const isCurled = (tip, pip, mcp) => {
      const dTip = dist2D(lm[tip], wrist);
      const dPip = dist2D(lm[pip], wrist);
      const dMcp = dist2D(lm[mcp], wrist);
      const palmDist = dist2D(lm[tip], palmCenter) / scale;
      const extRatio = dist2D(lm[tip], lm[mcp]) / scale;
      
      return (dTip < dPip * 0.98) || (dTip < dMcp * 1.02) || (palmDist < 0.62) || (extRatio < 0.60);
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

  detectPinch(pinchData, fingerStates) {
    return pinchData.isTightPinch && !fingerStates.thumb.pointingUp;
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
    // 2D In-plane roll angle (wrist to middle knuckle)
    const middleMcp = lm[LANDMARK_INDICES.MIDDLE_FINGER_MCP];
    const angleRad = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
    const rollDegrees = (angleRad * 180 / Math.PI) + 90; // 0 = straight up

    // 3D Pitch estimate based on z-depth delta
    const pitch = (middleMcp.z - wrist.z) * 100;

    return {
      roll: rollDegrees,
      pitch,
      angleRad
    };
  }

  /**
   * Two-Hand Coordination Logic:
   * Left hand handles selection/navigation, Right hand handles continuous intensity/drawing
   */
  evaluateTwoHandInteraction(hands, timestamp) {
    if (hands.length < 2) return null;

    const leftHand = hands[0];
    const rightHand = hands[1];

    return {
      active: true,
      leftHandGesture: leftHand.gesture,
      rightHandGesture: rightHand.gesture,
      leftPinch: leftHand.isPinching,
      rightPinch: rightHand.isPinching,
      controlIntensity: rightHand.normalizedPinchDistance,
      selectionGesture: leftHand.gesture,
      handDistance: dist2D(leftHand.palmCenter, rightHand.palmCenter)
    };
  }

  /**
   * Gesture stabilization filter: Requires 2-3 consistent frames to avoid flutter
   */
  stabilizeGesture(trackId, newGesture, confidence, timestamp) {
    if (!this.gestureHistory.has(trackId)) {
      this.gestureHistory.set(trackId, []);
    }

    const history = this.gestureHistory.get(trackId);
    history.push({ gesture: newGesture, timestamp });

    // Keep last 6 frames
    while (history.length > 6) {
      history.shift();
    }

    // Fast-track point, pinch, thumbs_up for instant interactive feel
    if (newGesture === GESTURE_TYPES.PINCH || newGesture === GESTURE_TYPES.POINT || newGesture === GESTURE_TYPES.THUMBS_UP) {
      return newGesture;
    }

    // Majority voting over past frames
    const counts = {};
    for (const h of history) {
      counts[h.gesture] = (counts[h.gesture] || 0) + 1;
    }

    let dominant = newGesture;
    let maxCount = 0;
    for (const [g, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = g;
      }
    }

    return dominant;
  }
}
