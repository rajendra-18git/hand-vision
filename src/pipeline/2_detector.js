/**
 * Stage 2: Hand Detection Pipeline
 * Modular wrapper supporting MediaPipe Tasks Vision and Ultralytics YOLO Pose backends.
 */

import { ProviderRegistry, PROVIDER_TYPES } from '../vision/providers/ProviderRegistry.js';

export class HandDetector {
  constructor(options = {}) {
    this.numHands = options.numHands || 2;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onProviderSwitch = options.onProviderSwitch || (() => {});

    this.registry = new ProviderRegistry({
      numHands: this.numHands,
      defaultProvider: options.defaultProvider || PROVIDER_TYPES.MEDIAPIPE,
      onStatusChange: (s) => this.onStatusChange(s),
      onProviderSwitch: (t, p) => this.onProviderSwitch(t, p)
    });

    this.isReady = false;
  }

  get activeProvider() {
    return this.registry.getActive();
  }

  get activeProviderId() {
    return this.registry.activeType;
  }

  /**
   * Initializes active vision engine
   */
  async init(progressCallback = () => {}) {
    try {
      const provider = await this.registry.initActive(progressCallback);
      this.isReady = provider.isReady;
      return provider;
    } catch (err) {
      this.isReady = false;
      this.onStatusChange('Vision model load failed');
      throw err;
    }
  }

  /**
   * Switch between 'mediapipe' and 'yolo' at runtime
   */
  async switchProvider(providerType, progressCallback = () => {}) {
    const provider = await this.registry.switchProvider(providerType, progressCallback);
    this.isReady = provider.isReady;
    return provider;
  }

  /**
   * Process a single video frame with monotonic timestamp
   * @param {HTMLVideoElement|HTMLCanvasElement} videoElement
   * @param {number} timestamp - Current frame timestamp
   * @returns {Object|null} Standardized detection results
   */
  detect(videoElement, timestamp = performance.now()) {
    if (!this.isReady) return null;
    const provider = this.registry.getActive();
    if (!provider || !provider.isReady) return null;

    return provider.detect(videoElement, timestamp);
  }

  getBackendInfo() {
    return this.registry.getActive()?.getBackendInfo() || { providerName: 'None', backendType: 'N/A' };
  }

  getAllProviders() {
    return this.registry.getAllProviderInfo();
  }

  dispose() {
    for (const p of this.registry.providers.values()) {
      p.dispose();
    }
    this.isReady = false;
  }
}
