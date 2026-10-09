/**
 * Stage 4: Multi-Frame Position Tracking & Hand ID Association
 * 
 * Features:
 * - Persistent Hand IDs across frames using nearest-neighbor spatial matching.
 * - Landmark-loss recovery: Extrapolates landmark trajectory using velocity vectors
 *   during brief occlusions or dropped detection frames (up to maxMissedFrames).
 * - Temporal history buffer for velocity estimation and motion smoothing.
 */

import { dist2D } from '../utils/geometry.js';

export class HandTracker {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 15;
    this.maxMatchDistance = options.maxMatchDistance || 220; // max pixel distance between frames to match
    this.maxMissedFrames = options.maxMissedFrames || 5;     // frames to retain & predict before pruning

    this.tracks = new Map(); // id -> TrackState
    this.nextTrackId = 1;
  }

  track(detectedHands, timestamp = performance.now()) {
    return this.update(detectedHands, timestamp);
  }

  /**
   * Updates tracking states with newly detected hands from the current frame
   * @param {Array<Object>} detectedHands - Hands processed by KeypointExtractor
   * @param {number} timestamp - Monotonic time in ms
   * @returns {Array<Object>} Tracked hands with persistent IDs, recovery states, and history
   */
  update(detectedHands, timestamp = performance.now()) {
    const currentDetections = detectedHands || [];
    const matchedTrackIds = new Set();
    const matchedDetectionIndices = new Set();

    // 1. Build distance matrix between existing active tracks and current detections
    const matchPairs = [];

    for (const [trackId, track] of this.tracks.entries()) {
      const lastState = track.history[track.history.length - 1];
      const lastCenter = lastState.palmCenter;

      for (let i = 0; i < currentDetections.length; i++) {
        const detection = currentDetections[i];
        const distance = dist2D(lastCenter, detection.palmCenter);

        // Same handedness is strongly preferred; penalize if handedness differs
        const handednessPenalty = (lastState.rawHandedness !== detection.rawHandedness) ? 80 : 0;
        const totalCost = distance + handednessPenalty;

        if (totalCost < this.maxMatchDistance) {
          matchPairs.push({ trackId, detectionIndex: i, cost: totalCost });
        }
      }
    }

    // Sort by lowest distance/cost (Greedy association)
    matchPairs.sort((a, b) => a.cost - b.cost);

    for (const pair of matchPairs) {
      if (!matchedTrackIds.has(pair.trackId) && !matchedDetectionIndices.has(pair.detectionIndex)) {
        matchedTrackIds.add(pair.trackId);
        matchedDetectionIndices.add(pair.detectionIndex);

        // Update matched track with real detection
        const track = this.tracks.get(pair.trackId);
        const detection = currentDetections[pair.detectionIndex];

        // Compute velocity from previous frame
        const prev = track.history[track.history.length - 1];
        const dt = Math.max(1e-3, (timestamp - prev.timestamp) / 1000);
        const vx = (detection.palmCenter.x - prev.palmCenter.x) / dt;
        const vy = (detection.palmCenter.y - prev.palmCenter.y) / dt;

        track.velocity = { vx, vy };
        track.history.push({
          timestamp,
          landmarks: detection.landmarks,
          palmCenter: detection.palmCenter,
          boundingBox: detection.boundingBox,
          handedness: detection.handedness,
          rawHandedness: detection.rawHandedness,
          handScale: detection.handScale,
          confidence: detection.confidence,
          isRecovered: false
        });

        if (track.history.length > this.maxHistory) {
          track.history.shift();
        }

        track.missedFrames = 0;
        track.age += 1;
        track.latestDetection = detection;
      }
    }

    // 2. Spawn new tracks for unmatched detections
    for (let i = 0; i < currentDetections.length; i++) {
      if (!matchedDetectionIndices.has(i)) {
        const detection = currentDetections[i];
        const newTrackId = `hand_${this.nextTrackId++}`;

        this.tracks.set(newTrackId, {
          id: newTrackId,
          age: 1,
          missedFrames: 0,
          velocity: { vx: 0, vy: 0 },
          history: [
            {
              timestamp,
              landmarks: detection.landmarks,
              palmCenter: detection.palmCenter,
              boundingBox: detection.boundingBox,
              handedness: detection.handedness,
              rawHandedness: detection.rawHandedness,
              handScale: detection.handScale,
              confidence: detection.confidence,
              isRecovered: false
            }
          ],
          latestDetection: detection
        });

        matchedTrackIds.add(newTrackId);
      }
    }

    // 3. Landmark-Loss Recovery for unmatched active tracks
    const activeTrackedHands = [];

    for (const [trackId, track] of this.tracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        track.missedFrames += 1;

        if (track.missedFrames > this.maxMissedFrames) {
          this.tracks.delete(trackId);
          continue;
        }

        // Landmark-Loss Recovery: Dead reckoning extrapolation using velocity
        const last = track.history[track.history.length - 1];
        const dt = Math.max(1e-3, (timestamp - last.timestamp) / 1000);
        const decay = Math.pow(0.75, track.missedFrames); // Dampen velocity over consecutive missed frames
        const dx = (track.velocity?.vx || 0) * dt * decay;
        const dy = (track.velocity?.vy || 0) * dt * decay;

        const extrapolatedLandmarks = last.landmarks.map((lm) => ({
          ...lm,
          x: lm.x + dx,
          y: lm.y + dy,
          confidence: (lm.confidence || 0.8) * 0.75
        }));

        const extrapolatedCenter = {
          x: last.palmCenter.x + dx,
          y: last.palmCenter.y + dy,
          z: last.palmCenter.z
        };

        const recoveredState = {
          timestamp,
          landmarks: extrapolatedLandmarks,
          palmCenter: extrapolatedCenter,
          boundingBox: {
            ...last.boundingBox,
            x: last.boundingBox.x + dx,
            y: last.boundingBox.y + dy
          },
          handedness: last.handedness,
          rawHandedness: last.rawHandedness,
          handScale: last.handScale,
          confidence: (last.confidence || 0.8) * 0.75,
          isRecovered: true
        };

        track.history.push(recoveredState);
        if (track.history.length > this.maxHistory) {
          track.history.shift();
        }

        activeTrackedHands.push({
          trackId: track.id,
          age: track.age,
          missedFrames: track.missedFrames,
          isRecovered: true,
          history: track.history,
          landmarks: recoveredState.landmarks,
          palmCenter: recoveredState.palmCenter,
          boundingBox: recoveredState.boundingBox,
          handedness: recoveredState.handedness,
          rawHandedness: recoveredState.rawHandedness,
          handScale: recoveredState.handScale,
          confidence: recoveredState.confidence,
          detectionLatencyMs: track.latestDetection?.detectionLatencyMs || 0,
          providerName: track.latestDetection?.providerName || 'MediaPipe',
          backendType: track.latestDetection?.backendType || 'CPU'
        });
      } else {
        // Matched active track
        const latest = track.history[track.history.length - 1];
        activeTrackedHands.push({
          trackId: track.id,
          age: track.age,
          missedFrames: 0,
          isRecovered: false,
          history: track.history,
          landmarks: latest.landmarks,
          palmCenter: latest.palmCenter,
          boundingBox: latest.boundingBox,
          handedness: latest.handedness,
          rawHandedness: latest.rawHandedness,
          handScale: latest.handScale,
          confidence: latest.confidence,
          detectionLatencyMs: track.latestDetection?.detectionLatencyMs || 0,
          providerName: track.latestDetection?.providerName || 'MediaPipe',
          backendType: track.latestDetection?.backendType || 'CPU'
        });
      }
    }

    return activeTrackedHands;
  }

  reset() {
    this.tracks.clear();
    this.nextTrackId = 1;
  }
}
