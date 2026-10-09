/**
 * VisionGarden XR — Next-Gen Spatial Hand Tracking Studio
 * 
 * Integrated Experiences:
 * 1. 🌸 BOTANICAL: Photorealistic floral trails, blooming pops & spring-damper smoothing
 * 2. 🌌 GALAXY: 8,000+ Quantum Particles with hand gravity, singularity pinch & supernova blasts
 * 3. 🪄 MAGIC: Doctor Strange Arcane Mandalas, Sacred Geometry & two-hand lightning bridges
 * 4. 💎 3D HOLOGRAM: Spatial 3D object manipulation (Diamond, Hypercube, DNA, Torus Knot) via Three.js
 * 5. 🎵 SYNTH: Cybernetic Theremin Synthesizer & synesthesia audio wave visualizer
 * 6. ⚔️ SLICE: Spatial energy orb slicer game with combo score physics
 * 7. ✨ AI FILTERS: 20+ Real-Time Aesthetic Video Shaders with continuous pinch modulation
 * 8. 📸 CAPTURE: Composite Photo Snapshots, WebM Video Recording & interactive Media Gallery
 * 9. 🤖 MULTI-BACKEND VISION: MediaPipe Tasks Vision (GPU/CPU) & Ultralytics YOLO Pose (WebGPU/WASM)
 * 10. 📊 COMPREHENSIVE BENCHMARK: Real-time detection & E2E latency, jitter, missed frame & pinch reliability suite
 * 11. 👻 INVISIBILITY CLOAK: Decoupled person segmentation & optical cloaking effect
 */

import { CameraManager } from './pipeline/1_capture.js';
import { HandDetector } from './pipeline/2_detector.js';
import { KeypointExtractor } from './pipeline/3_keypoints.js';
import { HandTracker } from './pipeline/4_tracker.js';
import { HandMotionManager } from './pipeline/5_filters.js';
import { GestureEngine, GESTURE_TYPES } from './vision/gesture_engine/GestureEngine.js';
import { FilterEngine, FILTER_LIBRARY } from './filters/FilterEngine.js';
import { FlowerRenderer } from './pipeline/8_flowerRenderer.js';
import { SkeletonRenderer } from './render/skeletonRenderer.js';
import { getCoverTransform } from './utils/geometry.js';

// Modular Additions: Benchmarks & Invisibility Cloak Engine
import { HandTrackingBenchmark } from './benchmarks/HandTrackingBenchmark.js';
import { InvisibilityEngine } from './vision/segmentation/InvisibilityEngine.js';

// Top-Tier Interactive Experiences
import { GalaxyPhysics } from './experiences/GalaxyPhysics.js';
import { DoctorStrangeMagic } from './experiences/DoctorStrangeMagic.js';
import { Hologram3D } from './experiences/Hologram3D.js';
import { ThereminSynth } from './experiences/ThereminSynth.js';
import { SlashGame } from './experiences/SlashGame.js';

export const APP_MODES = {
  CREATE: 'CREATE',
  GALAXY: 'GALAXY',
  MAGIC: 'MAGIC',
  HOLOGRAM: 'HOLOGRAM',
  SYNTH: 'SYNTH',
  SLASH: 'SLASH',
  FILTERS: 'FILTERS',
  CAPTURE: 'CAPTURE'
};

const MODE_ORDER = [
  APP_MODES.CREATE,
  APP_MODES.GALAXY,
  APP_MODES.MAGIC,
  APP_MODES.HOLOGRAM,
  APP_MODES.SYNTH,
  APP_MODES.SLASH,
  APP_MODES.FILTERS,
  APP_MODES.CAPTURE
];

class VisionGardenApp {
  constructor() {
    // 1. DOM Elements - Views
    this.landingScreen = document.getElementById('landing-screen');
    this.mainExperience = document.getElementById('main-experience');
    this.btnLaunchApp = document.getElementById('btn-launch-app');
    this.btnOpenTutorial = document.getElementById('btn-open-tutorial');

    // 2. DOM Elements - Viewport & Canvases
    this.videoElement = document.getElementById('webcam-video');
    this.filterCanvas = document.getElementById('filter-canvas');
    this.invisibilityCanvas = document.getElementById('invisibility-canvas');
    this.galaxyCanvas = document.getElementById('galaxy-canvas');
    this.magicCanvas = document.getElementById('magic-canvas');
    this.hologramCanvas = document.getElementById('hologram-canvas');
    this.synthCanvas = document.getElementById('synth-canvas');
    this.slashCanvas = document.getElementById('slash-canvas');
    this.drawingCanvas = document.getElementById('drawing-canvas');
    this.skeletonCanvas = document.getElementById('skeleton-canvas');

    // 3. DOM Elements - Floating HUD & Telemetry
    this.statusPill = document.getElementById('status-pill');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.fpsCounter = document.getElementById('fps-counter');
    this.handsCounter = document.getElementById('hands-counter');
    
    // Provider Switcher & Benchmarks
    this.btnProviderToggle = document.getElementById('btn-provider-toggle');
    this.providerLabel = document.getElementById('provider-label');
    this.btnOpenBenchmark = document.getElementById('btn-open-benchmark');
    this.btnToggleInvisibility = document.getElementById('btn-toggle-invisibility');

    // 4. DOM Elements - Controls & Toggles
    this.btnCameraFlip = document.getElementById('btn-camera-flip');
    this.btnToggleSkeleton = document.getElementById('btn-toggle-skeleton');
    this.btnHudTutorial = document.getElementById('btn-hud-tutorial');
    this.btnOpenGallery = document.getElementById('btn-open-gallery');
    this.btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');

    // 5. DOM Elements - Pinch Intensity HUD
    this.pinchHud = document.getElementById('pinch-intensity-hud');
    this.intensityLabel = document.getElementById('intensity-percent-label');
    this.intensityFill = document.getElementById('intensity-track-fill');
    this.intensityThumb = document.getElementById('intensity-thumb-dot');

    // 6. DOM Elements - Live Gesture Feedback Pill
    this.gestureLivePill = document.getElementById('gesture-live-pill');
    this.liveGestureIcon = document.getElementById('live-gesture-icon');
    this.liveGestureText = document.getElementById('live-gesture-text');

    // 7. DOM Elements - Mode Dock & Ribbons
    this.modeTabButtons = document.querySelectorAll('.mode-tab-btn');
    this.subRibbonCreate = document.getElementById('ribbon-create');
    this.subRibbonGalaxy = document.getElementById('ribbon-galaxy');
    this.subRibbonMagic = document.getElementById('ribbon-magic');
    this.subRibbonHologram = document.getElementById('ribbon-hologram');
    this.subRibbonSynth = document.getElementById('ribbon-synth');
    this.subRibbonSlash = document.getElementById('ribbon-slash');
    this.subRibbonFilters = document.getElementById('ribbon-filters');
    this.subRibbonCapture = document.getElementById('ribbon-capture');

    this.flowerPills = document.querySelectorAll('.variety-pill');
    this.galaxyPills = document.querySelectorAll('.preset-pill');
    this.holoPills = document.querySelectorAll('.holo-pill');
    this.synthPills = document.querySelectorAll('.synth-pill');
    this.filterPills = document.querySelectorAll('.filter-pill');
    this.btnBloomAll = document.getElementById('btn-bloom-all');
    this.btnClearCanvas = document.getElementById('btn-clear-canvas');
    this.btnResetGame = document.getElementById('btn-reset-game');

    // Capture Ribbon buttons
    this.btnTakePhoto = document.getElementById('btn-take-photo');
    this.btnToggleRecord = document.getElementById('btn-toggle-record');
    this.recordBtnText = document.getElementById('record-btn-text');
    this.btnCanvasUndo = document.getElementById('btn-canvas-undo');

    // 8. DOM Elements - Modals & Benchmark Dashboard
    this.tutorialModal = document.getElementById('tutorial-modal-overlay');
    this.btnCloseTutorial = document.getElementById('btn-close-tutorial');
    this.btnTutorialStart = document.getElementById('btn-tutorial-start');
    
    this.galleryModal = document.getElementById('gallery-modal-overlay');
    this.btnCloseGallery = document.getElementById('btn-close-gallery');
    this.galleryGrid = document.getElementById('gallery-grid');
    this.galleryEmptyState = document.getElementById('gallery-empty-state');

    this.benchmarkModal = document.getElementById('benchmark-modal-overlay');
    this.btnCloseBenchmark = document.getElementById('btn-close-benchmark');
    this.btnBenchmarkDone = document.getElementById('btn-benchmark-done');
    this.btnStartAutoBenchmark = document.getElementById('btn-start-auto-benchmark');
    
    // Benchmark telemetry DOM refs
    this.bmDetLatency = document.getElementById('bm-metric-det-latency');
    this.bmP95 = document.getElementById('bm-metric-p95');
    this.bmE2E = document.getElementById('bm-metric-e2e-latency');
    this.bmFps = document.getElementById('bm-metric-fps');
    this.bmBackend = document.getElementById('bm-metric-backend');
    this.bmJitter = document.getElementById('bm-metric-jitter');
    this.bmMissed = document.getElementById('bm-metric-missed');
    this.bmPinchRel = document.getElementById('bm-metric-pinch-rel');
    this.bmProgressWrap = document.getElementById('bm-progress-bar-wrap');
    this.bmProgressFill = document.getElementById('bm-progress-fill');
    this.bmProgressText = document.getElementById('bm-progress-text');
    this.bmResultsTableWrap = document.getElementById('bm-results-table-wrap');
    this.bmTableBody = document.getElementById('bm-table-body');
    this.bmRecCard = document.getElementById('bm-recommendation-card');

    // State Variables
    this.activeMode = APP_MODES.CREATE;
    this.currentFilterIntensity = 0.65; // 0.0 -> 1.0
    this.lastPinchToastVal = -1;
    this.lastActionTime = 0;
    this.isRunning = false;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.fps = 60;
    this.galleryItems = [];

    // Recording State
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
    this.recordTimerInterval = null;

    // Pipeline Subsystems & Modular Engines
    this.cameraManager = new CameraManager({
      videoElement: this.videoElement,
      onError: (err) => this.handleCameraError(err),
      onReady: () => this.handleCameraReady()
    });

    this.detector = new HandDetector({
      onStatusChange: (status) => this.updateStatus(status, 'loading'),
      onProviderSwitch: (t, p) => this.updateProviderLabel(p)
    });

    this.keypoints = new KeypointExtractor();
    this.tracker = new HandTracker({ maxMissedFrames: 5 });
    this.motionManager = new HandMotionManager();
    this.gestureEngine = new GestureEngine({ 
      swipeVelocityThreshold: 520,
      gestureHoldThresholdMs: 180
    });
    this.filterEngine = new FilterEngine(this.filterCanvas);
    this.invisibilityEngine = new InvisibilityEngine(this.invisibilityCanvas);
    this.benchmark = new HandTrackingBenchmark();
    this.skeletonRenderer = new SkeletonRenderer(this.skeletonCanvas);
    this.flowerRenderer = new FlowerRenderer(this.drawingCanvas, { maxFlowers: 60 });

    // Specialized Experience Engines
    this.galaxyEngine = new GalaxyPhysics(this.galaxyCanvas);
    this.magicEngine = new DoctorStrangeMagic(this.magicCanvas);
    this.holoEngine = new Hologram3D(this.hologramCanvas);
    this.synthEngine = new ThereminSynth(this.synthCanvas);
    this.slashEngine = new SlashGame(this.slashCanvas);

    this.initEventListeners();
    this.handleResize();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.handleResize());

    // Launch App
    this.btnLaunchApp?.addEventListener('click', () => this.startExperience());
    
    // Tutorial Modal
    this.btnOpenTutorial?.addEventListener('click', () => this.openTutorial());
    this.btnHudTutorial?.addEventListener('click', () => this.openTutorial());
    this.btnCloseTutorial?.addEventListener('click', () => this.closeTutorial());
    this.btnTutorialStart?.addEventListener('click', () => {
      this.closeTutorial();
      if (!this.isRunning) {
        this.startExperience();
      }
    });

    // Gallery Modal
    this.btnOpenGallery?.addEventListener('click', () => this.openGallery());
    this.btnCloseGallery?.addEventListener('click', () => this.closeGallery());

    // Benchmark Modal
    this.btnOpenBenchmark?.addEventListener('click', () => this.openBenchmark());
    this.btnCloseBenchmark?.addEventListener('click', () => this.closeBenchmark());
    this.btnBenchmarkDone?.addEventListener('click', () => this.closeBenchmark());
    this.btnStartAutoBenchmark?.addEventListener('click', () => this.runAutomatedBenchmark());

    // Provider Hot-Switching
    this.btnProviderToggle?.addEventListener('click', () => this.toggleProvider());

    // Invisibility Cloak Toggle
    this.btnToggleInvisibility?.addEventListener('click', () => {
      const active = this.invisibilityEngine.toggle();
      if (active) this.invisibilityEngine.captureBackground(this.videoElement);
      this.showToast(active ? 'Invisibility Cloak Active' : 'Cloak Deactivated', '👻');
    });

    // Status Pill Retry
    this.statusPill?.addEventListener('click', () => {
      if (!this.cameraManager.isStreaming) {
        this.retryCamera();
      }
    });

    // Camera Flip & Fullscreen
    this.btnCameraFlip?.addEventListener('click', () => {
      if (!this.cameraManager.isStreaming) {
        this.retryCamera();
      } else {
        this.cameraManager.flipCamera();
      }
    });
    this.btnToggleFullscreen?.addEventListener('click', () => this.toggleFullscreen());
    this.btnToggleSkeleton?.addEventListener('click', () => {
      const active = this.skeletonRenderer.toggleSkeletonLines();
      this.showToast(active ? 'Joint Skeleton Visible' : 'Clean Tracking Mode', '👁️');
    });

    // Mode Switcher Tabs
    this.modeTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode && APP_MODES[mode]) {
          this.setMode(APP_MODES[mode]);
        }
      });
    });

    // Flower Variety Selector
    this.flowerPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.flowerPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const flower = pill.dataset.flower;
        this.flowerRenderer.setFlowerType(flower);
        this.showToast(`Selected: ${flower}`, '🌸');
      });
    });

    // Galaxy Presets Selector
    this.galaxyPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.galaxyPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const preset = pill.dataset.galaxy;
        this.galaxyEngine.setPreset(preset);
        this.showToast(`Galaxy: ${preset.toUpperCase()}`, '🌌');
      });
    });

    // 3D Hologram Model Selector
    this.holoPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.holoPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const holo = pill.dataset.holo;
        this.holoEngine.setModel(holo);
        this.showToast(`3D Model: ${holo.toUpperCase()}`, '💎');
      });
    });

    // Theremin Synth Scale Selector
    this.synthPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.synthPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const scale = pill.dataset.scale;
        this.synthEngine.setScale(scale);
        this.showToast(`Synth Scale: ${scale.toUpperCase()}`, '🎵');
      });
    });

    // Filter Pills
    this.filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.dataset.filter;
        this.filterEngine.setFilter(filter);
        this.showToast(`Filter: ${filter.toUpperCase()}`, '✨');
      });
    });

    // Bloom All & Clear Actions
    this.btnBloomAll?.addEventListener('click', () => {
      this.flowerRenderer.bloomAllFlowers();
      this.showToast('Blooming all flowers', '🖐️');
    });

    this.btnClearCanvas?.addEventListener('click', () => {
      this.flowerRenderer.clear();
      this.showToast('Canvas Cleared', '✊');
    });

    this.btnResetGame?.addEventListener('click', () => {
      this.slashEngine.reset();
      this.showToast('Score Reset', '⚔️');
    });

    // Capture Ribbon Actions
    this.btnTakePhoto?.addEventListener('click', () => this.takePhotoSnapshot());
    this.btnToggleRecord?.addEventListener('click', () => this.toggleVideoRecording());
    this.btnCanvasUndo?.addEventListener('click', () => {
      const undone = this.flowerRenderer.undo();
      this.showToast(undone ? 'Stroke Undone' : 'Canvas is empty', '↩️');
    });

    // Interactive Pointer / Mouse Interaction for fallback
    this.initPointerInteractions();
  }

  async toggleProvider() {
    const currentId = this.detector.activeProviderId;
    const nextId = currentId === 'mediapipe' ? 'yolo' : 'mediapipe';
    
    this.showToast(`Switching to ${nextId.toUpperCase()}...`, '🤖');
    try {
      const newProvider = await this.detector.switchProvider(nextId);
      this.updateProviderLabel(newProvider);
      this.showToast(`Active: ${newProvider.name} (${newProvider.backendType})`, '✨');
    } catch (err) {
      console.error('Provider switch error:', err);
      this.showToast('Provider switch error', '⚠️');
    }
  }

  updateProviderLabel(provider) {
    if (!this.providerLabel || !provider) return;
    const isYolo = provider.name.toLowerCase().includes('yolo');
    this.providerLabel.textContent = `${isYolo ? 'YOLO Pose' : 'MediaPipe'} (${provider.backendType})`;
    if (this.btnProviderToggle) {
      this.btnProviderToggle.classList.toggle('yolo-mode', isYolo);
    }
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    [
      this.filterCanvas,
      this.invisibilityCanvas,
      this.galaxyCanvas,
      this.magicCanvas,
      this.hologramCanvas,
      this.synthCanvas,
      this.slashCanvas,
      this.drawingCanvas,
      this.skeletonCanvas
    ].forEach((canvas) => {
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    });

    this.filterEngine?.resize(width, height);
    this.invisibilityEngine?.resize(width, height);
    this.flowerRenderer?.resize(width, height);
    this.galaxyEngine?.resize(width, height);
    this.magicEngine?.resize(width, height);
    this.holoEngine?.resize(width, height);
    this.synthEngine?.resize(width, height);
    this.slashEngine?.resize(width, height);
  }

  async startExperience() {
    this.landingScreen.classList.add('hidden');
    this.mainExperience.classList.remove('hidden');
    this.handleResize();
    this.updateStatus('Starting Camera...', 'loading');

    // Unlock Audio Context on start
    this.synthEngine?.initAudio();

    // 1. Initialize Camera (immediate stream activation)
    try {
      await this.cameraManager.init();
      this.updateStatus('Camera Connected. Loading Vision...', 'loading');
    } catch (camErr) {
      console.warn('Camera stream warning:', camErr);
      this.updateStatus('Camera Blocked (Click to retry)', 'error');
      this.showToast(camErr.message || 'Camera permission required. Click status pill to retry.', '📷');
    }

    // 2. Initialize Modular Vision Detector (MediaPipe / YOLO)
    try {
      const provider = await this.detector.init();
      this.updateProviderLabel(provider);
      if (this.cameraManager.isStreaming) {
        this.updateStatus('Vision Live', 'live');
        this.showToast('Vision Live: Raise your hands', '✨');
      }
    } catch (detErr) {
      console.warn('Vision detector initialization warning:', detErr);
      this.updateStatus('Interactive Mode Active', 'live');
      this.showToast('Interactive Pointer Mode Active', '🌸');
    }

    this.isRunning = true;
    requestAnimationFrame((ts) => this.renderLoop(ts));
  }

  async retryCamera() {
    this.updateStatus('Requesting Camera Access...', 'loading');
    this.showToast('Requesting camera access...', '📹');
    try {
      await this.cameraManager.start();
      this.updateStatus('Vision Live', 'live');
      this.showToast('Camera Connected Successfully!', '✨');
      this.handleResize();
    } catch (err) {
      console.error('Camera retry failed:', err);
      this.updateStatus('Camera Blocked (Click to retry)', 'error');
      this.showToast(err.message || 'Camera permission denied in browser.', '⚠️');
    }
  }

  handleCameraReady() {
    this.handleResize();
    this.updateStatus('Vision Live', 'live');
  }

  handleCameraError(err) {
    console.error('Camera error:', err);
    this.updateStatus('Camera Blocked (Click to retry)', 'error');
  }

  updateStatus(text, state = 'live') {
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusDot) {
      this.statusDot.className = 'status-dot';
      if (state === 'live') {
        this.statusDot.classList.add('live');
      } else if (state === 'error') {
        this.statusDot.classList.add('error');
      }
    }
  }

  setMode(newMode) {
    if (!APP_MODES[newMode] || this.activeMode === newMode) return;

    if (this.activeMode === APP_MODES.SYNTH && newMode !== APP_MODES.SYNTH) {
      this.synthEngine?.stop();
    }

    if (newMode === APP_MODES.SYNTH) {
      this.synthEngine?.initAudio();
    }

    if (newMode === APP_MODES.FILTERS && this.filterEngine.activeFilterId === 'original') {
      this.filterEngine.setFilter('anime');
      this.filterPills.forEach((p) => {
        p.classList.toggle('active', p.dataset.filter === 'anime');
      });
    }

    this.activeMode = newMode;

    // Update Mode Buttons
    this.modeTabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    // Update Sub-ribbons
    this.subRibbonCreate?.classList.toggle('hidden', newMode !== APP_MODES.CREATE);
    this.subRibbonGalaxy?.classList.toggle('hidden', newMode !== APP_MODES.GALAXY);
    this.subRibbonMagic?.classList.toggle('hidden', newMode !== APP_MODES.MAGIC);
    this.subRibbonHologram?.classList.toggle('hidden', newMode !== APP_MODES.HOLOGRAM);
    this.subRibbonSynth?.classList.toggle('hidden', newMode !== APP_MODES.SYNTH);
    this.subRibbonSlash?.classList.toggle('hidden', newMode !== APP_MODES.SLASH);
    this.subRibbonFilters?.classList.toggle('hidden', newMode !== APP_MODES.FILTERS);
    this.subRibbonCapture?.classList.toggle('hidden', newMode !== APP_MODES.CAPTURE);

    this.showToast(`Mode: ${newMode}`, this.getModeEmoji(newMode));
  }

  cycleMode() {
    const currentIndex = MODE_ORDER.indexOf(this.activeMode);
    const nextIndex = (currentIndex + 1) % MODE_ORDER.length;
    this.setMode(MODE_ORDER[nextIndex]);
  }

  getModeEmoji(mode) {
    switch (mode) {
      case APP_MODES.CREATE: return '🌸';
      case APP_MODES.GALAXY: return '🌌';
      case APP_MODES.MAGIC: return '🪄';
      case APP_MODES.HOLOGRAM: return '💎';
      case APP_MODES.SYNTH: return '🎵';
      case APP_MODES.SLASH: return '⚔️';
      case APP_MODES.FILTERS: return '✨';
      case APP_MODES.CAPTURE: return '📸';
      default: return '🌿';
    }
  }

  updatePinchIntensity(normalizedValue) {
    this.currentFilterIntensity = Math.max(0, Math.min(1, normalizedValue));
    const percent = Math.round(this.currentFilterIntensity * 100);

    if (this.intensityLabel) this.intensityLabel.textContent = `${percent}%`;
    if (this.intensityFill) this.intensityFill.style.width = `${percent}%`;
    if (this.intensityThumb) this.intensityThumb.style.left = `${percent}%`;

    this.filterEngine.setIntensity(this.currentFilterIntensity);
  }

  showToast(message, emoji = '✨') {
    if (this.liveGestureIcon) this.liveGestureIcon.textContent = emoji;
    if (this.liveGestureText) this.liveGestureText.textContent = message;

    if (this.gestureLivePill) {
      this.gestureLivePill.style.opacity = '1';
      this.gestureLivePill.style.transform = 'translateX(-50%) translateY(0)';
    }
  }

  /**
   * Main High-Performance Vision & AR Render Loop
   */
  renderLoop(timestamp) {
    if (!this.isRunning) return;
    const loopStart = performance.now();

    // 1. Calculate FPS Telemetry
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
      if (this.fpsCounter) this.fpsCounter.textContent = `${this.fps} FPS`;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }

    const canvasWidth = this.drawingCanvas.width || window.innerWidth;
    const canvasHeight = this.drawingCanvas.height || window.innerHeight;
    const videoWidth = this.videoElement?.videoWidth || 1280;
    const videoHeight = this.videoElement?.videoHeight || 720;

    // Exact CSS object-fit: cover transform for 1:1 pixel alignment
    const transform = getCoverTransform(videoWidth, videoHeight, canvasWidth, canvasHeight);

    // 2. Real-time Filter Processing
    if (this.activeMode === APP_MODES.FILTERS) {
      this.filterEngine.setIntensity(this.currentFilterIntensity);
      this.filterEngine.processFrame(this.videoElement, timestamp, transform);
    } else {
      const fCtx = this.filterCanvas.getContext('2d');
      fCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    // 3. Modular Vision Detection (MediaPipe or YOLO)
    let gestureResult = { hands: [], activeGesture: GESTURE_TYPES.NONE };
    let detectionLatencyMs = 0;

    if (this.videoElement && (this.videoElement.readyState >= 2 || (this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0))) {
      const rawResults = this.detector.detect(this.videoElement, timestamp);
      detectionLatencyMs = rawResults?.detectionLatencyMs || 0;

      const extractedHands = this.keypoints.process(rawResults, canvasWidth, canvasHeight, true, transform);
      const trackedHands = this.tracker.track(extractedHands, timestamp);
      const smoothedHands = this.motionManager.process(trackedHands, timestamp);

      // Centralized Gesture Engine Feature Extraction
      gestureResult = this.gestureEngine.process(smoothedHands, timestamp);
    }

    if (this.handsCounter) {
      const numHands = gestureResult.hands.length;
      this.handsCounter.textContent = `${numHands} Hand${numHands === 1 ? '' : 's'}`;
    }

    // 4. Invisibility Cloak Layer Rendering (Decoupled from Hand Tracking)
    this.invisibilityEngine.render(this.videoElement, gestureResult, timestamp);

    // 5. Handle Global Discrete Gestures
    this.handleGestures(gestureResult, timestamp);

    // 6. Render Selected Mode Engine Layer
    this.renderActiveModeEngine(gestureResult, timestamp);

    // 7. Render Skeleton & Dynamic Reticle Overlay Canvas
    const sCtx = this.skeletonCanvas.getContext('2d');
    sCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
    this.skeletonRenderer.render(gestureResult, this.activeMode);

    // 8. Record Telemetry to Benchmark Suite
    const loopEnd = performance.now();
    const e2eLatencyMs = loopEnd - loopStart;
    const primaryTip = gestureResult.primaryHand ? gestureResult.primaryHand.landmarks[8] : null;

    this.benchmark.recordFrame({
      detectionLatencyMs,
      e2eLatencyMs,
      hasDetection: gestureResult.hands.length > 0,
      fingertipPos: primaryTip,
      isPinching: gestureResult.primaryHand ? gestureResult.primaryHand.isPinching : false,
      timestamp
    });

    // Update live benchmark HUD if modal is visible
    if (!this.benchmarkModal.classList.contains('hidden')) {
      this.updateBenchmarkLiveHUD();
    }

    requestAnimationFrame((ts) => this.renderLoop(ts));
  }

  renderActiveModeEngine(gestureResult, timestamp) {
    const w = this.drawingCanvas.width;
    const h = this.drawingCanvas.height;

    // Clear non-active canvases to prevent blocking
    if (this.activeMode !== APP_MODES.CREATE) {
      const dCtx = this.drawingCanvas.getContext('2d');
      dCtx.clearRect(0, 0, w, h);
    }
    if (this.activeMode !== APP_MODES.GALAXY) {
      const ctx = this.galaxyCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
    }
    if (this.activeMode !== APP_MODES.MAGIC) {
      const ctx = this.magicCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
    }
    if (this.activeMode !== APP_MODES.HOLOGRAM) {
      this.holoEngine?.clear();
    }
    if (this.activeMode !== APP_MODES.SYNTH) {
      const ctx = this.synthCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
    }
    if (this.activeMode !== APP_MODES.SLASH) {
      const ctx = this.slashCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
    }

    // Render active mode
    switch (this.activeMode) {
      case APP_MODES.CREATE:
        this.renderFlowerLayer(gestureResult, timestamp);
        break;

      case APP_MODES.GALAXY:
        this.galaxyEngine.render(gestureResult, timestamp);
        break;

      case APP_MODES.MAGIC:
        this.magicEngine.render(gestureResult, timestamp);
        break;

      case APP_MODES.HOLOGRAM:
        this.holoEngine.render(gestureResult, timestamp);
        break;

      case APP_MODES.SYNTH:
        this.synthEngine.render(gestureResult, timestamp);
        break;

      case APP_MODES.SLASH:
        this.slashEngine.render(gestureResult, timestamp);
        break;

      default:
        break;
    }
  }

  handleGestures(gestureResult, timestamp) {
    const { primaryHand, activeGesture, invisibilityActive } = gestureResult;

    // Gesture-triggered Invisibility Cloak
    if (invisibilityActive && timestamp - this.lastActionTime > 800) {
      this.invisibilityEngine.captureBackground(this.videoElement);
      this.invisibilityEngine.setActive(true);
      this.showToast('Invisibility Pose: Cloak Activated', '👻');
      this.lastActionTime = timestamp;
      return;
    }

    if (!primaryHand) return;

    // Continuous Pinch Intensity Control (0.0 -> 1.0)
    if (primaryHand.isPinching && this.activeMode === APP_MODES.FILTERS) {
      const normalizedPinch = primaryHand.normalizedPinchDistance;
      this.updatePinchIntensity(normalizedPinch);

      const roundedPercent = Math.round(normalizedPinch * 100);
      if (Math.abs(roundedPercent - this.lastPinchToastVal) >= 5) {
        this.lastPinchToastVal = roundedPercent;
        this.showToast(`Pinch Intensity: ${roundedPercent}%`, '🤏');
      }
    }

    // Discrete Gesture Actions (with Hold Durations and Cooldowns)
    if (timestamp - this.lastActionTime > 1000) {
      
      // 1. Peace Sign: Switch Mode
      if (activeGesture === GESTURE_TYPES.PEACE) {
        this.cycleMode();
        this.lastActionTime = timestamp;
      }
      
      // 2. Open Palm: Bloom Garden
      else if (activeGesture === GESTURE_TYPES.OPEN_PALM && this.activeMode === APP_MODES.CREATE) {
        this.flowerRenderer.bloomAllFlowers();
        this.showToast('Open Palm: Blooming Garden', '🖐️');
        this.lastActionTime = timestamp;
      }
      
      // 3. Fist: Clear Canvas
      else if (activeGesture === GESTURE_TYPES.FIST && this.activeMode === APP_MODES.CREATE) {
        this.flowerRenderer.clear();
        this.showToast('Closed Fist: Cleared Canvas', '✊');
        this.lastActionTime = timestamp;
      }

      // 4. Thumbs Up: Take Photo Snapshot
      else if (activeGesture === GESTURE_TYPES.THUMBS_UP && this.activeMode === APP_MODES.CAPTURE) {
        this.takePhotoSnapshot();
        this.lastActionTime = timestamp;
      }

      // 5. Swipe Gestures: Next/Previous variety or filter
      else if (activeGesture === GESTURE_TYPES.SWIPE_RIGHT || activeGesture === GESTURE_TYPES.SWIPE_LEFT) {
        if (this.activeMode === APP_MODES.CREATE) {
          this.cycleFlowerVariety();
        } else if (this.activeMode === APP_MODES.FILTERS) {
          this.cycleFilter();
        }
        this.lastActionTime = timestamp;
      }
    }
  }

  cycleFlowerVariety() {
    const flowerTypes = ['allMix', 'pinkDahlia', 'purpleRose', 'pinkPlumeriaFrangipani', 'whiteDaisy', 'blueAfricanDaisy'];
    const current = this.flowerRenderer.activeFlowerId || 'allMix';
    const nextIdx = (flowerTypes.indexOf(current) + 1) % flowerTypes.length;
    const nextFlower = flowerTypes[nextIdx];
    
    this.flowerRenderer.setFlowerType(nextFlower);
    this.flowerPills.forEach((p) => {
      p.classList.toggle('active', p.dataset.flower === nextFlower);
    });
    this.showToast(`Flower: ${nextFlower}`, '🌸');
  }

  cycleFilter() {
    const filters = Object.keys(FILTER_LIBRARY);
    const current = this.filterEngine.activeFilterId || 'original';
    const nextIdx = (filters.indexOf(current) + 1) % filters.length;
    const nextFilter = filters[nextIdx];

    this.filterEngine.setFilter(nextFilter);
    this.filterPills.forEach((p) => {
      p.classList.toggle('active', p.dataset.filter === nextFilter);
    });
    this.showToast(`Filter: ${nextFilter.toUpperCase()}`, '✨');
  }

  renderFlowerLayer(gestureResult, timestamp) {
    const { hands } = gestureResult;
    
    const drawingHands = hands.filter((h) => {
      return h.gesture !== GESTURE_TYPES.FIST && h.gesture !== GESTURE_TYPES.THUMBS_UP;
    });

    this.flowerRenderer.processHands(drawingHands, timestamp);
    this.flowerRenderer.render(timestamp);
  }

  // --- Benchmark UI & Automated Test Runner ---

  openBenchmark() {
    this.benchmarkModal?.classList.remove('hidden');
    this.updateBenchmarkLiveHUD();
  }

  closeBenchmark() {
    this.benchmarkModal?.classList.add('hidden');
  }

  updateBenchmarkLiveHUD() {
    const stats = this.benchmark.getLiveStats();
    const info = this.detector.getBackendInfo();

    if (this.bmDetLatency) this.bmDetLatency.textContent = `${stats.detectionLatencyMs} ms`;
    if (this.bmP95) this.bmP95.textContent = `p95: ${stats.p95LatencyMs} ms`;
    if (this.bmE2E) this.bmE2E.textContent = `${stats.e2eLatencyMs} ms`;
    if (this.bmFps) this.bmFps.textContent = `${stats.fps} FPS`;
    if (this.bmBackend) this.bmBackend.textContent = `${info.providerName} (${info.backendType})`;
    if (this.bmJitter) this.bmJitter.textContent = `${stats.jitterPx} px`;
    if (this.bmMissed) this.bmMissed.textContent = `${stats.missedRatePercent}%`;
    if (this.bmPinchRel) this.bmPinchRel.textContent = `${stats.pinchReliabilityPercent}%`;
  }

  async runAutomatedBenchmark() {
    if (!this.btnStartAutoBenchmark) return;
    this.btnStartAutoBenchmark.disabled = true;
    this.bmProgressWrap?.classList.remove('hidden');
    this.bmResultsTableWrap?.classList.add('hidden');

    try {
      const results = await this.benchmark.runComparativeBenchmark(
        this.detector,
        this.videoElement,
        (statusText, progressRatio) => {
          if (this.bmProgressText) this.bmProgressText.textContent = statusText;
          if (this.bmProgressFill) this.bmProgressFill.style.width = `${Math.round(progressRatio * 100)}%`;
        }
      );

      // Render comparative table
      if (this.bmTableBody && results.mediapipe && results.yolo) {
        this.bmTableBody.innerHTML = `
          <tr>
            <td><strong>MediaPipe Tasks Vision</strong></td>
            <td><code>${results.mediapipe.backend}</code></td>
            <td><strong>${results.mediapipe.avgLatencyMs} ms</strong> (p95: ${results.mediapipe.p95LatencyMs}ms)</td>
            <td><strong>${results.mediapipe.fps} FPS</strong></td>
            <td>${results.mediapipe.jitterScorePx} px</td>
            <td>${results.mediapipe.missedRatePercent}%</td>
            <td>${results.mediapipe.pinchReliabilityPercent}%</td>
          </tr>
          <tr>
            <td><strong>Ultralytics YOLO Pose</strong></td>
            <td><code>${results.yolo.backend}</code></td>
            <td><strong>${results.yolo.avgLatencyMs} ms</strong> (p95: ${results.yolo.p95LatencyMs}ms)</td>
            <td><strong>${results.yolo.fps} FPS</strong></td>
            <td>${results.yolo.jitterScorePx} px</td>
            <td>${results.yolo.missedRatePercent}%</td>
            <td>${results.yolo.pinchReliabilityPercent}%</td>
          </tr>
        `;
      }

      if (this.bmRecCard) {
        this.bmRecCard.innerHTML = `
          <strong>Empirical Benchmark Conclusion:</strong><br/>
          ${results.recommendation}
        `;
      }

      this.bmResultsTableWrap?.classList.remove('hidden');
      this.bmProgressWrap?.classList.add('hidden');
    } catch (err) {
      console.error('Auto benchmark failure:', err);
      if (this.bmProgressText) this.bmProgressText.textContent = 'Benchmark encountered an error.';
    } finally {
      this.btnStartAutoBenchmark.disabled = false;
    }
  }

  // --- Photo Snapshot & Video Recording ---

  async takePhotoSnapshot() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = w;
    snapCanvas.height = h;
    const ctx = snapCanvas.getContext('2d');

    // 1. Draw raw video feed (mirrored with cover transform)
    if (this.videoElement && this.videoElement.videoWidth > 0) {
      const transform = getCoverTransform(this.videoElement.videoWidth, this.videoElement.videoHeight, w, h);
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.videoElement, transform.offsetX, transform.offsetY, transform.drawWidth, transform.drawHeight);
      ctx.restore();
    }

    // 2. Draw active canvases
    [
      this.filterCanvas,
      this.invisibilityCanvas,
      this.galaxyCanvas,
      this.magicCanvas,
      this.hologramCanvas,
      this.synthCanvas,
      this.slashCanvas,
      this.drawingCanvas
    ].forEach((cvs) => {
      if (cvs) ctx.drawImage(cvs, 0, 0);
    });

    // Visual Flash Feedback
    const flashDiv = document.createElement('div');
    flashDiv.style.position = 'fixed';
    flashDiv.style.inset = '0';
    flashDiv.style.background = '#ffffff';
    flashDiv.style.zIndex = '999';
    flashDiv.style.opacity = '0.85';
    flashDiv.style.transition = 'opacity 0.4s ease-out';
    document.body.appendChild(flashDiv);
    requestAnimationFrame(() => {
      flashDiv.style.opacity = '0';
      setTimeout(() => flashDiv.remove(), 400);
    });

    const dataUrl = snapCanvas.toDataURL('image/png');
    const filename = `visiongarden-${Date.now()}.png`;

    // Download file
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    // Add to gallery
    this.addGalleryItem({ type: 'image', url: dataUrl, filename, timestamp: new Date().toLocaleTimeString() });
    this.showToast('Photo Saved to Gallery', '📸');
  }

  toggleVideoRecording() {
    if (this.isRecording) {
      this.stopVideoRecording();
    } else {
      this.startVideoRecording();
    }
  }

  startVideoRecording() {
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = w;
      compositeCanvas.height = h;
      const cCtx = compositeCanvas.getContext('2d');

      const stream = compositeCanvas.captureStream(30);

      // Include Synth audio stream if available
      if (this.synthEngine?.audioCtx) {
        try {
          const dest = this.synthEngine.audioCtx.createMediaStreamDestination();
          this.synthEngine.gainNode?.connect(dest);
          if (dest.stream.getAudioTracks().length > 0) {
            stream.addTrack(dest.stream.getAudioTracks()[0]);
          }
        } catch (e) {}
      }

      this.recordedChunks = [];
      const options = { mimeType: 'video/webm;codecs=vp9' };
      this.mediaRecorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const filename = `visiongarden-recording-${Date.now()}.webm`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        this.addGalleryItem({ type: 'video', url, filename, timestamp: new Date().toLocaleTimeString() });
        this.showToast('Recording Saved to Gallery', '🎥');
      };

      // Composite draw loop for video recording
      const recordDraw = () => {
        if (!this.isRecording) return;
        cCtx.clearRect(0, 0, w, h);

        if (this.videoElement && this.videoElement.videoWidth > 0) {
          const transform = getCoverTransform(this.videoElement.videoWidth, this.videoElement.videoHeight, w, h);
          cCtx.save();
          cCtx.translate(w, 0);
          cCtx.scale(-1, 1);
          cCtx.drawImage(this.videoElement, transform.offsetX, transform.offsetY, transform.drawWidth, transform.drawHeight);
          cCtx.restore();
        }

        [
          this.filterCanvas,
          this.invisibilityCanvas,
          this.galaxyCanvas,
          this.magicCanvas,
          this.hologramCanvas,
          this.synthCanvas,
          this.slashCanvas,
          this.drawingCanvas
        ].forEach((cvs) => {
          if (cvs) cCtx.drawImage(cvs, 0, 0);
        });

        requestAnimationFrame(recordDraw);
      };

      this.isRecording = true;
      this.mediaRecorder.start();
      requestAnimationFrame(recordDraw);

      if (this.recordBtnText) this.recordBtnText.textContent = 'Stop Recording';
      this.btnToggleRecord?.classList.add('recording');
      this.showToast('Recording Started...', '🔴');
    } catch (err) {
      console.error('Recording error:', err);
      this.showToast('Recording failed to start', '⚠️');
    }
  }

  stopVideoRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    this.mediaRecorder.stop();

    if (this.recordBtnText) this.recordBtnText.textContent = 'Start Recording';
    this.btnToggleRecord?.classList.remove('recording');
  }

  addGalleryItem(item) {
    this.galleryItems.unshift(item);
    if (this.galleryEmptyState) this.galleryEmptyState.classList.add('hidden');
    if (this.galleryGrid) {
      this.galleryGrid.classList.remove('hidden');

      const card = document.createElement('div');
      card.className = 'gallery-item-card';

      if (item.type === 'image') {
        card.innerHTML = `
          <img src="${item.url}" class="gallery-thumb" alt="${item.filename}" />
          <div class="gallery-item-meta">
            <span>${item.timestamp}</span>
            <a href="${item.url}" download="${item.filename}" class="btn-gallery-dl" title="Download">⬇️</a>
          </div>
        `;
      } else {
        card.innerHTML = `
          <video src="${item.url}" class="gallery-thumb" controls></video>
          <div class="gallery-item-meta">
            <span>${item.timestamp}</span>
            <a href="${item.url}" download="${item.filename}" class="btn-gallery-dl" title="Download">⬇️</a>
          </div>
        `;
      }

      this.galleryGrid.prepend(card);
    }
  }

  openGallery() {
    this.galleryModal?.classList.remove('hidden');
  }

  closeGallery() {
    this.galleryModal?.classList.add('hidden');
  }

  openTutorial() {
    this.tutorialModal?.classList.remove('hidden');
  }

  closeTutorial() {
    this.tutorialModal?.classList.add('hidden');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  initPointerInteractions() {
    let isPointerDown = false;

    const handlePointerMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      if (this.activeMode === APP_MODES.CREATE && isPointerDown) {
        this.flowerRenderer.addPointerPoint(x, y, performance.now());
      } else if (this.activeMode === APP_MODES.GALAXY) {
        this.galaxyEngine.setPointerPosition(x, y, isPointerDown);
      } else if (this.activeMode === APP_MODES.MAGIC) {
        this.magicEngine.setPointerPosition(x, y, isPointerDown);
      } else if (this.activeMode === APP_MODES.HOLOGRAM) {
        this.holoEngine.setPointerPosition(x, y, isPointerDown);
      } else if (this.activeMode === APP_MODES.SYNTH) {
        this.synthEngine.setPointerPosition(x, y, isPointerDown, window.innerWidth, window.innerHeight);
      } else if (this.activeMode === APP_MODES.SLASH) {
        this.slashEngine.setPointerPosition(x, y, performance.now());
      }
    };

    window.addEventListener('pointerdown', (e) => {
      isPointerDown = true;
      handlePointerMove(e);
    });

    window.addEventListener('pointermove', (e) => {
      handlePointerMove(e);
    });

    window.addEventListener('pointerup', () => {
      isPointerDown = false;
      this.flowerRenderer.endPointerStroke();
      if (this.activeMode === APP_MODES.SYNTH) {
        this.synthEngine.stop();
      }
    });
  }
}

// Instantiate and start app on DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VisionGardenApp();
});
