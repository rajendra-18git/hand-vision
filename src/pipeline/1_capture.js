/**
 * Stage 1: Camera Capture
 * 
 * Manages getUserMedia stream with multi-tier progressive constraint fallback,
 * camera enumeration, facingMode toggling, and robust permission error handling.
 */

export class CameraManager {
  constructor(options = {}) {
    this.videoElement = options.videoElement || document.createElement('video');
    this.setupVideoElement(this.videoElement);

    this.currentStream = null;
    this.currentDeviceId = null;
    this.facingMode = options.facingMode || 'user'; // 'user' | 'environment'
    this.onError = options.onError || console.error;
    this.onReady = options.onReady || (() => {});
    this.onDevicesChanged = options.onDevicesChanged || (() => {});

    this.isStreaming = false;

    // Listen for hardware device changes
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.getDevices().then(this.onDevicesChanged);
      });
    }
  }

  setupVideoElement(video) {
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
  }

  /**
   * Enumerate available video input devices
   */
  async getDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
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

  async init(deviceId = null, facing = null) {
    return this.start(deviceId, facing);
  }

  async flipCamera() {
    return this.switchCamera();
  }

  /**
   * Start camera with progressive constraint fallback
   */
  async start(deviceId = null, facing = null) {
    if (deviceId) this.currentDeviceId = deviceId;
    if (facing) this.facingMode = facing;

    this.stop();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const unsupportedErr = new Error(
        'Camera API (getUserMedia) is not available. Please ensure you are running on localhost or HTTPS.'
      );
      this.onError(unsupportedErr);
      throw unsupportedErr;
    }

    // Constraint tier fallbacks for maximum cross-platform hardware compatibility
    const constraintTiers = [];

    if (this.currentDeviceId) {
      constraintTiers.push({
        video: { deviceId: { exact: this.currentDeviceId } },
        audio: false
      });
    }

    // Tier 1: Ideal HD 720p with flexible facingMode
    constraintTiers.push({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: { ideal: this.facingMode }
      },
      audio: false
    });

    // Tier 2: HD without facingMode (for PC webcams without facingMode attribute)
    constraintTiers.push({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    // Tier 3: Standard resolution (640x480)
    constraintTiers.push({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    // Tier 4: Most permissive basic video constraint
    constraintTiers.push({
      video: true,
      audio: false
    });

    let stream = null;
    let lastError = null;

    for (const constraints of constraintTiers) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && stream.getVideoTracks().length > 0) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn('Camera constraint tier failed, trying next fallback...', constraints, err.message);
      }
    }

    if (!stream) {
      this.isStreaming = false;
      let userFriendlyMessage = 'Could not access camera.';

      if (lastError) {
        if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
          userFriendlyMessage =
            'Camera permission was blocked. Please click the lock/settings icon next to the browser address bar and set Camera to "Allow", then refresh.';
        } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
          userFriendlyMessage =
            'No webcam was detected on this device. Please connect a webcam or use Interactive Pointer Mode.';
        } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
          userFriendlyMessage =
            'Your webcam is currently in use by another program (e.g. Teams, Zoom, or another tab). Please close other apps and retry.';
        } else if (lastError.name === 'OverconstrainedError') {
          userFriendlyMessage = 'Camera constraints could not be satisfied by your video hardware.';
        }
      }

      const enhancedError = new Error(userFriendlyMessage);
      enhancedError.originalError = lastError;
      this.onError(enhancedError);
      throw enhancedError;
    }

    this.currentStream = stream;
    this.videoElement.srcObject = stream;

    // Ensure video plays smoothly
    try {
      await new Promise((resolve) => {
        let isResolved = false;

        const done = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        const timeout = setTimeout(done, 1500);

        if (this.videoElement.readyState >= 1) {
          clearTimeout(timeout);
          done();
        } else {
          this.videoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            done();
          };
          this.videoElement.oncanplay = () => {
            clearTimeout(timeout);
            done();
          };
        }
      });

      await this.videoElement.play().catch((playErr) => {
        console.warn('Direct video.play() warning:', playErr);
      });
    } catch (playErr) {
      console.warn('Video play handler notice:', playErr);
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
