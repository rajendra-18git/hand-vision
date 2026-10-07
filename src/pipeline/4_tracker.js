/**
 * Stage 4: Multi-Frame Position Tracking & Hand ID Association
 * Maintains persistent Hand IDs across frames using nearest-neighbor spatial matching,
 * and maintains a temporal history buffer for velocity/smoothing.
 */

import { dist2D } from '../utils/geometry.js';

export class HandTracker {
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 15;
    this.maxMatchDistance = options.maxMatchDistance || 180; // max pixel distance between frames to match
    this.maxMissedFrames = options.maxMissedFrames || 6;

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
   * @returns {Array<Object>} Tracked hands with persistent IDs and history
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

        // Update matched track
        const track = this.tracks.get(pair.trackId);
        const detection = currentDetections[pair.detectionIndex];

        track.history.push({
          timestamp,
          landmarks: detection.landmarks,
          palmCenter: detection.palmCenter,
          boundingBox: detection.boundingBox,
          handedness: detection.handedness,
          rawHandedness: detection.rawHandedness,
          handScale: detection.handScale,
          confidence: detection.confidence
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
          history: [
            {
              timestamp,
              landmarks: detection.landmarks,
              palmCenter: detection.palmCenter,
              boundingBox: detection.boundingBox,
              handedness: detection.handedness,
              rawHandedness: detection.rawHandedness,
              handScale: detection.handScale,
              confidence: detection.confidence
            }
          ],
          latestDetection: detection
        });

        matchedTrackIds.add(newTrackId);
      }
    }

    // 3. Increment missed frames for unmatched tracks and prune dead tracks
    const activeTrackedHands = [];

    for (const [trackId, track] of this.tracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        track.missedFrames += 1;
        if (track.missedFrames > this.maxMissedFrames) {
          this.tracks.delete(trackId);
          continue;
        }
      } else {
        // Build the tracked hand object for the current frame
        const latest = track.history[track.history.length - 1];
        activeTrackedHands.push({
          trackId: track.id,
          age: track.age,
          history: track.history,
          landmarks: latest.landmarks,
          palmCenter: latest.palmCenter,
          boundingBox: latest.boundingBox,
          handedness: latest.handedness,
          rawHandedness: latest.rawHandedness,
          handScale: latest.handScale,
          confidence: latest.confidence
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
