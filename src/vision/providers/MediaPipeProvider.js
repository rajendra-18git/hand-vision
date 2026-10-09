/**
 * MediaPipe Tasks Vision HandLandmarker Provider
 * Highly accurate 21-keypoint tracking with reliable execution.
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandTrackingProvider } from './HandTrackingProvider.js';

export class MediaPipeProvider extends HandTrackingProvider {
  constructor(options = {}) {
    super('MediaPipe Tasks Vision');
    this.numHands = options.numHands || 2;
    // Forgiving detection thresholds for everyday webcam lighting
    this.minHandDetectionConfidence = options.minHandDetectionConfidence || 0.2;
    this.minHandPresenceConfidence = options.minHandPresenceConfidence || 0.2;
    this.minTrackingConfidence = options.minTrackingConfidence || 0.2;

    this.landmarker = null;
    this.lastTimestamp = -1;
    this.backendType = 'CPU';
    this.modelName = 'hand_landmarker.task (float16)';
  }

  async init(options = {}, progressCallback = () => {}) {
    progressCallback('wasm', 0.3);

    let wasmFileset = null;
    try {
      wasmFileset = await FilesetResolver.forVisionTasks('/wasm');
    } catch (localErr) {
      wasmFileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
      );
    }

    progressCallback('model', 0.7);

    const modelPaths = [
      '/models/hand_landmarker.task',
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
    ];

    // Try CPU first for guaranteed zero-flicker stability across all Windows GPUs
    const delegates = ['CPU', 'GPU'];

    for (const delegate of delegates) {
      for (const modelPath of modelPaths) {
        try {
          this.landmarker = await HandLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: delegate
            },
            runningMode: 'VIDEO',
            numHands: this.numHands,
            minHandDetectionConfidence: this.minHandDetectionConfidence,
            minHandPresenceConfidence: this.minHandPresenceConfidence,
            minTrackingConfidence: this.minTrackingConfidence
          });

          if (this.landmarker) {
            this.backendType = delegate;
            this.isReady = true;
            progressCallback('ready', 1.0);
            console.log(`MediaPipe initialized with ${delegate} delegate using ${modelPath}`);
            return true;
          }
        } catch (mErr) {
          console.warn(`MediaPipe loading attempt (${delegate} / ${modelPath}) notice:`, mErr.message);
        }
      }
    }

    if (!this.landmarker) {
      this.isReady = false;
      throw new Error('All MediaPipe delegate and model loading attempts failed.');
    }
    return true;
  }

  detect(inputFrame, timestamp = performance.now()) {
    if (!this.isReady || !this.landmarker) return null;
    if (!inputFrame || !inputFrame.videoWidth || !inputFrame.videoHeight) return null;

    const now = Math.max(Math.floor(timestamp || performance.now()), this.lastTimestamp + 1);
    this.lastTimestamp = now;

    const tStart = performance.now();
    try {
      const rawResults = this.landmarker.detectForVideo(inputFrame, now);
      const detectionLatencyMs = performance.now() - tStart;

      if (!rawResults || !rawResults.landmarks || rawResults.landmarks.length === 0) {
        return {
          landmarks: [],
          handedness: [],
          detectionLatencyMs,
          providerName: this.name,
          backendType: this.backendType
        };
      }

      return {
        landmarks: rawResults.landmarks,
        handedness: rawResults.handedness || rawResults.handednesses || [],
        worldLandmarks: rawResults.worldLandmarks || [],
        detectionLatencyMs,
        providerName: this.name,
        backendType: this.backendType
      };
    } catch (err) {
      console.error('MediaPipe detection error:', err);
      return null;
    }
  }

  dispose() {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.isReady = false;
  }
}
