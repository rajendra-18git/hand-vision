/**
 * Provider Registry for Modular Vision Models
 * Allows hot-swapping between MediaPipe, YOLO Pose, and custom backends.
 */

import { MediaPipeProvider } from './MediaPipeProvider.js';
import { YOLOHandProvider } from './YOLOHandProvider.js';

export const PROVIDER_TYPES = {
  MEDIAPIPE: 'mediapipe',
  YOLO: 'yolo'
};

export class ProviderRegistry {
  constructor(options = {}) {
    this.providers = new Map();
    this.activeType = options.defaultProvider || PROVIDER_TYPES.MEDIAPIPE;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onProviderSwitch = options.onProviderSwitch || (() => {});

    // Register built-in providers
    this.register(PROVIDER_TYPES.MEDIAPIPE, new MediaPipeProvider(options));
    this.register(PROVIDER_TYPES.YOLO, new YOLOHandProvider(options));
  }

  register(key, providerInstance) {
    this.providers.set(key, providerInstance);
  }

  get(key) {
    return this.providers.get(key);
  }

  getActive() {
    return this.providers.get(this.activeType);
  }

  async initActive(progressCallback = () => {}) {
    const provider = this.getActive();
    if (!provider) throw new Error(`Provider ${this.activeType} not registered`);
    
    this.onStatusChange(`Initializing ${provider.name}...`);
    await provider.init({}, progressCallback);
    this.onStatusChange(`${provider.name} (${provider.backendType}) Ready`);
    return provider;
  }

  async switchProvider(targetType, progressCallback = () => {}) {
    if (!this.providers.has(targetType)) {
      throw new Error(`Cannot switch to unknown provider: ${targetType}`);
    }

    if (this.activeType === targetType && this.getActive()?.isReady) {
      return this.getActive();
    }

    const previousProvider = this.getActive();
    this.activeType = targetType;
    const newProvider = this.getActive();

    this.onStatusChange(`Switching to ${newProvider.name}...`);
    
    if (!newProvider.isReady) {
      await newProvider.init({}, progressCallback);
    }

    this.onStatusChange(`${newProvider.name} (${newProvider.backendType}) Active`);
    this.onProviderSwitch(targetType, newProvider);
    return newProvider;
  }

  getAllProviderInfo() {
    const list = [];
    for (const [key, p] of this.providers.entries()) {
      list.push({
        id: key,
        name: p.name,
        backendType: p.backendType,
        modelName: p.modelName,
        isActive: key === this.activeType,
        isReady: p.isReady
      });
    }
    return list;
  }
}
