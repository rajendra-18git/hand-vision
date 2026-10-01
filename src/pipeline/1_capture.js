/**
 * Stage 1: Camera Capture
 * Manages getUserMedia stream with multi-tier fallback, camera enumeration,
 * facingMode toggling, and permission error handling.
 */

export class CameraManager {
  constructor(options = {}) {
    this.videoElement = options.videoElement || document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.setAttribute('autoplay', 'true');
    this.videoElement.setAttribute('playsinline', 'true');
    this.videoElement.setAttribute('muted', 'true');

    this.currentStream = null;
    this.currentDeviceId = null;
    this.facingMode = options.facingMode || 'user'; // 'user' | 'environment'
    this.onError = options.onError || console.error;
    this.onReady = options.onReady || (() => {});
    this.onDevicesChanged = options.onDevicesChanged || (() => {});

    this.isStreaming = false;

    // Listen for device changes (plug/unplug)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.getDevices().then(this.onDevicesChanged);
      });
    }
  }

  /**
   * Enumerate available video input devices
   */
  async getDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`
        }));
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
      return [];
    }
  }

  /**
   * Start camera with progressive constraint fallback
   */
  async start(deviceId = null, facing = null) {
    if (deviceId) {
      this.currentDeviceId = deviceId;
    }
    if (facing) {
      this.facingMode = facing;
    }

    this.stop();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const unsupportedErr = new Error(
        'Camera API (getUserMedia) is not available. Please ensure you are running on localhost or HTTPS.'
      );
      this.onError(unsupportedErr);
      throw unsupportedErr;
    }

    // Constraint tier fallbacks
    const constraintTiers = [];

    if (this.currentDeviceId) {
      constraintTiers.push({
        video: { deviceId: { exact: this.currentDeviceId } },
        audio: false
      });
    } else {
      constraintTiers.push({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: this.facingMode
        },
        audio: false
      });
      constraintTiers.push({
        video: {
          facingMode: this.facingMode
        },
        audio: false
      });
    }

    // Ultimate generic fallback
    constraintTiers.push({
      video: true,
      audio: false
    });

    let stream = null;
    let lastError = null;

    for (const constraints of constraintTiers) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err;
        console.warn('Constraint tier failed, attempting fallback...', constraints, err);
      }
    }

    if (!stream) {
      this.isStreaming = false;
      let userFriendlyMessage = 'Could not access camera.';

      if (lastError) {
        if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
          userFriendlyMessage =
            'Camera permission was blocked. Please click the lock/settings icon next to the address bar in Chrome and set Camera to "Allow", then retry.';
        } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
          userFriendlyMessage =
            'No webcam was detected on this device. Please connect a camera or switch to Interactive Demo Mode.';
        } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
          userFriendlyMessage =
            'Your webcam is currently in use by another program (e.g. Teams, Zoom, or another tab). Please close other apps using the camera and retry.';
        } else if (lastError.name === 'OverconstrainedError') {
          userFriendlyMessage = 'Camera constraint could not be satisfied.';
        }
      }

      const enhancedError = new Error(userFriendlyMessage);
      enhancedError.originalError = lastError;
      this.onError(enhancedError);
      throw enhancedError;
    }

    this.currentStream = stream;
    this.videoElement.srcObject = stream;

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // If metadata takes too long, resolve anyway
          resolve();
        }, 3000);

        this.videoElement.onloadedmetadata = () => {
          clearTimeout(timeout);
          this.videoElement.play().then(resolve).catch(resolve);
        };
        this.videoElement.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });

      await this.videoElement.play().catch(() => {});
    } catch (playErr) {
      console.warn('Video play notification:', playErr);
    }

    this.isStreaming = true;
    this.onReady({
      width: this.videoElement.videoWidth || 1280,
      height: this.videoElement.videoHeight || 720,
      stream: this.currentStream
    });

    return stream;
  }

  /**
   * Toggle between front and back camera
   */
  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.currentDeviceId = null;
    return this.start();
  }

  stop() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isStreaming = false;
  }

  getVideoElement() {
    return this.videoElement;
  }

  getDimensions() {
    return {
      width: this.videoElement.videoWidth || 1280,
      height: this.videoElement.videoHeight || 720
    };
  }
}
