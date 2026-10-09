/**
 * Abstract Base Hand Tracking Provider Interface
 * Provides a unified contract for MediaPipe, Ultralytics YOLO, and other backends.
 */

export class HandTrackingProvider {
  constructor(name = 'AbstractProvider') {
    this.name = name;
    this.isReady = false;
    this.backendType = 'CPU'; // 'GPU' | 'WebGPU' | 'WebGL' | 'CPU' | 'WASM'
    this.modelName = '';
  }

  /**
   * Initialize model weights, delegates, and execution providers
   * @param {Object} options
   * @param {Function} progressCallback
   * @returns {Promise<boolean>}
   */
  async init(options = {}, progressCallback = () => {}) {
    throw new Error('init() must be implemented by HandTrackingProvider subclass');
  }

  /**
   * Run inference on a video frame
   * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} inputFrame
   * @param {number} timestamp
   * @returns {Object|null} Standardized detection output:
   * {
   *   landmarks: Array<Array<{ x: number, y: number, z: number, confidence?: number }>>,
   *   handedness: Array<Array<{ categoryName: string, score: number }>>,
   *   detectionLatencyMs: number,
   *   providerName: string,
   *   backendType: string
   * }
   */
  detect(inputFrame, timestamp = performance.now()) {
    throw new Error('detect() must be implemented by HandTrackingProvider subclass');
  }

  /**
   * Return metadata about backend hardware acceleration and model variant
   */
  getBackendInfo() {
    return {
      providerName: this.name,
      backendType: this.backendType,
      modelName: this.modelName,
      isReady: this.isReady
    };
  }

  /**
   * Cleanup GPU buffers, workers, or model sessions
   */
  dispose() {
    this.isReady = false;
  }
}
