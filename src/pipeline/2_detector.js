/**
 * Stage 2: Hand Detection (MediaPipe Tasks Vision HandLandmarker)
 * Configured with local model asset and native video frame stream execution.
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandDetector {
  constructor(options = {}) {
    this.numHands = options.numHands || 2;
    // Forgiving detection thresholds for everyday lighting
    this.minHandDetectionConfidence = options.minHandDetectionConfidence || 0.2;
    this.minHandPresenceConfidence = options.minHandPresenceConfidence || 0.2;
    this.minTrackingConfidence = options.minTrackingConfidence || 0.2;

    this.landmarker = null;
    this.isReady = false;
    this.lastTimestamp = -1;
    this.onStatusChange = options.onStatusChange || (() => {});
  }

  /**
   * Initializes MediaPipe FilesetResolver and HandLandmarker with local assets
   */
  async init(progressCallback = () => {}) {
    try {
      this.onStatusChange('Loading local MediaPipe Vision engine...');
      progressCallback('wasm', 0.3);

      let wasmFileset = null;
      try {
        wasmFileset = await FilesetResolver.forVisionTasks('/wasm');
      } catch (localWasmErr) {
        console.warn('Local WASM fallback to CDN...', localWasmErr);
        wasmFileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        );
      }

      this.onStatusChange('Loading HandLandmarker neural model...');
      progressCallback('model', 0.7);

      const modelPaths = [
        '/models/hand_landmarker.task',
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
      ];

      for (const modelPath of modelPaths) {
        try {
          this.landmarker = await HandLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: this.numHands,
            minHandDetectionConfidence: this.minHandDetectionConfidence,
            minHandPresenceConfidence: this.minHandPresenceConfidence,
            minTrackingConfidence: this.minTrackingConfidence
          });
          if (this.landmarker) {
            console.log('HandLandmarker successfully initialized in VIDEO mode with:', modelPath);
            break;
          }
        } catch (mErr) {
          console.warn(`Model loading from ${modelPath} failed, trying next option...`, mErr);
        }
      }

      if (!this.landmarker) {
        throw new Error('All model loading attempts failed.');
      }

      this.isReady = true;
      this.onStatusChange('Vision AI Ready');
      progressCallback('ready', 1.0);
      return this.landmarker;
    } catch (err) {
      this.isReady = false;
      this.onStatusChange('Vision model load failed');
      throw err;
    }
  }

  /**
   * Process a single video frame with monotonic timestamp
   * @param {HTMLVideoElement} videoElement
   * @param {number} timestamp - Current frame timestamp
   * @returns {Object|null}
   */
  detect(videoElement, timestamp) {
    if (!this.isReady || !this.landmarker) return null;
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) return null;

    // MediaPipe requires strictly increasing monotonic timestamps in ms
    const now = Math.max(Math.floor(timestamp || performance.now()), this.lastTimestamp + 1);
    this.lastTimestamp = now;

    try {
      // Direct hardware video detection with complete image dimensions
      const results = this.landmarker.detectForVideo(videoElement, now);
      return results;
    } catch (err) {
      console.error('HandLandmarker inference error:', err);
      return null;
    }
  }

  dispose() {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
      this.isReady = false;
    }
  }
}
