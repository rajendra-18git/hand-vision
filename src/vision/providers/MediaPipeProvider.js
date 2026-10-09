/**
 * MediaPipe Tasks Vision HandLandmarker Provider
 * Supports GPU delegate acceleration with fallback to CPU/WASM.
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandTrackingProvider } from './HandTrackingProvider.js';

export class MediaPipeProvider extends HandTrackingProvider {
  constructor(options = {}) {
    super('MediaPipe Tasks Vision');
    this.numHands = options.numHands || 2;
    this.minHandDetectionConfidence = options.minHandDetectionConfidence || 0.3;
    this.minHandPresenceConfidence = options.minHandPresenceConfidence || 0.3;
    this.minTrackingConfidence = options.minTrackingConfidence || 0.3;

    this.landmarker = null;
    this.lastTimestamp = -1;
    this.preferGPU = options.preferGPU !== false;
    this.modelName = 'hand_landmarker.task (float16)';
    this.backendType = 'CPU';
  }

  async init(options = {}, progressCallback = () => {}) {
    try {
      progressCallback('wasm', 0.2);

      let wasmFileset = null;
      try {
        wasmFileset = await FilesetResolver.forVisionTasks('/wasm');
      } catch (localErr) {
        wasmFileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        );
      }

      progressCallback('model', 0.6);

      const modelPaths = [
        '/models/hand_landmarker.task',
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
      ];

      // Try GPU delegate first, fallback to CPU
      const delegates = this.preferGPU ? ['GPU', 'CPU'] : ['CPU'];

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
          } catch (dErr) {
            console.warn(`MediaPipe delegate ${delegate} failed with ${modelPath}:`, dErr.message);
          }
        }
      }

      if (!this.landmarker) {
        throw new Error('All MediaPipe delegate/model combinations failed to initialize.');
      }
      return true;
    } catch (err) {
      this.isReady = false;
      throw err;
    }
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
