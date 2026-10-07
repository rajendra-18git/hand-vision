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

    // 8. DOM Elements - Modals & Gallery
    this.tutorialModal = document.getElementById('tutorial-modal-overlay');
    this.btnCloseTutorial = document.getElementById('btn-close-tutorial');
    this.btnTutorialStart = document.getElementById('btn-tutorial-start');
    this.galleryModal = document.getElementById('gallery-modal-overlay');
    this.btnCloseGallery = document.getElementById('btn-close-gallery');
    this.galleryGrid = document.getElementById('gallery-grid');
    this.galleryEmptyState = document.getElementById('gallery-empty-state');

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

    // Pipeline Subsystems
    this.cameraManager = new CameraManager({
      videoElement: this.videoElement,
      onError: (err) => this.handleCameraError(err),
      onReady: () => this.handleCameraReady()
    });

    this.detector = new HandDetector({
      onStatusChange: (status) => this.updateStatus(status, 'loading')
    });

    this.keypoints = new KeypointExtractor();
    this.tracker = new HandTracker();
    this.motionManager = new HandMotionManager();
    this.gestureEngine = new GestureEngine({ swipeVelocityThreshold: 500 });
    this.filterEngine = new FilterEngine(this.filterCanvas);
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

    // Camera Flip & Fullscreen
    this.btnCameraFlip?.addEventListener('click', () => this.cameraManager.flipCamera());
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

    // Interactive Pointer / Mouse Interaction for ALL Modes
    let isPointerDown = false;
    const forwardPointer = (e) => {
      const isUI = e.target.closest('button, .floating-dock-container, .floating-glass-hud-top, .glass-modal-card');
      if (isUI) return;

      const pt = { x: e.clientX, y: e.clientY };

      if (this.activeMode === APP_MODES.CREATE) {
        if (isPointerDown) {
          this.flowerRenderer.updateStroke('mouse_ptr', pt);
        }
      } else if (this.activeMode === APP_MODES.GALAXY) {
        this.galaxyEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.MAGIC) {
        this.magicEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.HOLOGRAM) {
        this.holoEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.SYNTH) {
        if (isPointerDown) {
          this.synthEngine.setPointer(pt);
        }
      } else if (this.activeMode === APP_MODES.SLASH) {
        this.slashEngine.setPointer(pt);
      }
    };

    window.addEventListener('pointerdown', (e) => {
      const isUI = e.target.closest('button, .floating-dock-container, .floating-glass-hud-top, .glass-modal-card');
      if (isUI) return;

      isPointerDown = true;
      const pt = { x: e.clientX, y: e.clientY };

      if (this.activeMode === APP_MODES.CREATE) {
        this.flowerRenderer.startStroke('mouse_ptr', pt);
      } else if (this.activeMode === APP_MODES.GALAXY) {
        this.galaxyEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.MAGIC) {
        this.magicEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.HOLOGRAM) {
        this.holoEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.SYNTH) {
        this.synthEngine.setPointer(pt);
      } else if (this.activeMode === APP_MODES.SLASH) {
        this.slashEngine.setPointer(pt);
      }
    });

    window.addEventListener('pointermove', forwardPointer);

    const stopPointer = () => {
      if (isPointerDown) {
        isPointerDown = false;
        if (this.activeMode === APP_MODES.CREATE) {
          this.flowerRenderer.endStroke('mouse_ptr');
        }
      }
      if (this.activeMode === APP_MODES.SYNTH) {
        this.synthEngine.setPointer(null);
      }
      if (this.activeMode === APP_MODES.GALAXY) {
        this.galaxyEngine.setPointer(null);
      }
      if (this.activeMode === APP_MODES.MAGIC) {
        this.magicEngine.setPointer(null);
      }
      if (this.activeMode === APP_MODES.HOLOGRAM) {
        this.holoEngine.setPointer(null);
      }
      if (this.activeMode === APP_MODES.SLASH) {
        this.slashEngine.setPointer(null);
      }
    };
    window.addEventListener('pointerup', stopPointer);
    window.addEventListener('pointercancel', stopPointer);

    // Mouse Wheel / Trackpad Pinch Simulation
    window.addEventListener('wheel', (e) => {
      if (this.activeMode === APP_MODES.FILTERS) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        this.updatePinchIntensity(this.currentFilterIntensity + delta);
      }
    }, { passive: true });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
      if (e.key === 'c' || e.key === 'C') this.flowerRenderer.clear();
      if (e.key === 'b' || e.key === 'B') this.flowerRenderer.bloomAllFlowers();
      if (e.key === 'z' || e.key === 'Z') this.flowerRenderer.undo();
      if (e.key === '1') this.setMode(APP_MODES.CREATE);
      if (e.key === '2') this.setMode(APP_MODES.GALAXY);
      if (e.key === '3') this.setMode(APP_MODES.MAGIC);
      if (e.key === '4') this.setMode(APP_MODES.HOLOGRAM);
      if (e.key === '5') this.setMode(APP_MODES.SYNTH);
      if (e.key === '6') this.setMode(APP_MODES.SLASH);
      if (e.key === '7') this.setMode(APP_MODES.FILTERS);
      if (e.key === '8') this.setMode(APP_MODES.CAPTURE);
    });
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    [
      this.filterCanvas,
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
    this.updateStatus('Starting Camera & Vision AI...', 'loading');

    // Unlock Audio Context on start
    this.synthEngine?.initAudio();

    try {
      // 1. Initialize Camera
      await this.cameraManager.init();
      
      // 2. Initialize MediaPipe Detector
      await this.detector.init();

      this.isRunning = true;
      this.updateStatus('Vision Live', 'live');
      this.showToast('Vision Live: Raise your hands', '✨');

      // 3. Launch Core Vision Loop
      requestAnimationFrame((ts) => this.renderLoop(ts));
    } catch (err) {
      console.warn('Camera stream warning, starting interactive canvas mode:', err);
      this.isRunning = true;
      this.updateStatus('Interactive Mode Active', 'live');
      this.showToast('Pointer Mode Active — Draw with mouse or touch', '🌸');
      requestAnimationFrame((ts) => this.renderLoop(ts));
    }
  }

  handleCameraReady() {
    this.handleResize();
  }

  handleCameraError(err) {
    console.error('Camera error:', err);
    this.updateStatus('Camera Blocked', 'error');
  }

  updateStatus(text, state = 'live') {
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusDot) {
      this.statusDot.className = 'status-dot';
      if (state === 'live') this.statusDot.classList.add('live');
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
   * Main High-Performance Vision & AR Render Loop (Target: 60 FPS)
   */
  renderLoop(timestamp) {
    if (!this.isRunning) return;

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

    // Calculate exact CSS object-fit: cover transform for 1:1 pixel alignment
    const transform = getCoverTransform(videoWidth, videoHeight, canvasWidth, canvasHeight);

    // 2. Real-time Filter Processing (Active in FILTERS mode or with selected filter)
    if (this.activeMode === APP_MODES.FILTERS) {
      this.filterEngine.setIntensity(this.currentFilterIntensity);
      this.filterEngine.processFrame(this.videoElement, timestamp, transform);
    } else {
      const fCtx = this.filterCanvas.getContext('2d');
      fCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    // 3. Run MediaPipe Detection on Hardware Video Stream
    let gestureResult = { hands: [], activeGesture: GESTURE_TYPES.NONE };
    if (this.videoElement && (this.videoElement.readyState >= 2 || (this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0))) {
      const rawResults = this.detector.detect(this.videoElement, timestamp);
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

    // 4. Handle Global Discrete Gestures
    this.handleGestures(gestureResult, timestamp);

    // 5. Render Selected Mode Engine Layer
    this.renderActiveModeEngine(gestureResult, timestamp);

    // 6. Render Skeleton & Dynamic Reticle Overlay Canvas
    const sCtx = this.skeletonCanvas.getContext('2d');
    sCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
    this.skeletonRenderer.render(gestureResult, this.activeMode);

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
    const { primaryHand, activeGesture } = gestureResult;

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

    // Discrete Gesture Actions (Debounced)
    if (timestamp - this.lastActionTime > 1100) {
      
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
      const compCtx = compositeCanvas.getContext('2d');

      const stream = compositeCanvas.captureStream(30);

      const updateComp = () => {
        if (!this.isRecording) return;
        compCtx.clearRect(0, 0, w, h);
        if (this.videoElement && this.videoElement.videoWidth > 0) {
          const transform = getCoverTransform(this.videoElement.videoWidth, this.videoElement.videoHeight, w, h);
          compCtx.save();
          compCtx.translate(w, 0);
          compCtx.scale(-1, 1);
          compCtx.drawImage(this.videoElement, transform.offsetX, transform.offsetY, transform.drawWidth, transform.drawHeight);
          compCtx.restore();
        }
        [
          this.filterCanvas,
          this.galaxyCanvas,
          this.magicCanvas,
          this.hologramCanvas,
          this.synthCanvas,
          this.slashCanvas,
          this.drawingCanvas
        ].forEach((cvs) => {
          if (cvs) compCtx.drawImage(cvs, 0, 0);
        });

        requestAnimationFrame(updateComp);
      };

      this.recordedChunks = [];
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? { mimeType: 'video/webm;codecs=vp9' }
        : { mimeType: 'video/webm' };

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const filename = `visiongarden-video-${Date.now()}.webm`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = videoUrl;
        link.click();

        this.addGalleryItem({ type: 'video', url: videoUrl, filename, timestamp: new Date().toLocaleTimeString() });
        this.showToast('Video Saved to Gallery', '🎥');
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      requestAnimationFrame(updateComp);

      if (this.recordBtnText) this.recordBtnText.textContent = 'Stop Recording (0s)';
      this.btnToggleRecord?.classList.add('recording');

      this.recordTimerInterval = setInterval(() => {
        const secs = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        if (this.recordBtnText) this.recordBtnText.textContent = `Stop Recording (${secs}s)`;
      }, 1000);

      this.showToast('Recording Started', '🔴');
    } catch (err) {
      console.error('MediaRecorder error:', err);
      this.showToast('Recording not supported on this browser', '⚠️');
    }
  }

  stopVideoRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    clearInterval(this.recordTimerInterval);
    this.mediaRecorder.stop();

    if (this.recordBtnText) this.recordBtnText.textContent = 'Start Recording';
    this.btnToggleRecord?.classList.remove('recording');
  }

  addGalleryItem(item) {
    this.galleryItems.unshift(item);
    this.renderGalleryGrid();
  }

  renderGalleryGrid() {
    if (!this.galleryGrid || !this.galleryEmptyState) return;

    if (this.galleryItems.length === 0) {
      this.galleryEmptyState.classList.remove('hidden');
      this.galleryGrid.classList.add('hidden');
      return;
    }

    this.galleryEmptyState.classList.add('hidden');
    this.galleryGrid.classList.remove('hidden');
    this.galleryGrid.innerHTML = '';

    for (const item of this.galleryItems) {
      const card = document.createElement('div');
      card.className = 'gallery-item-card';

      if (item.type === 'image') {
        card.innerHTML = `
          <img src="${item.url}" alt="${item.filename}" class="gallery-thumb" />
          <div class="gallery-item-meta">
            <span>📷 ${item.timestamp}</span>
            <a href="${item.url}" download="${item.filename}" class="btn-gallery-dl">⬇️</a>
          </div>
        `;
      } else {
        card.innerHTML = `
          <video src="${item.url}" controls class="gallery-thumb"></video>
          <div class="gallery-item-meta">
            <span>🎥 ${item.timestamp}</span>
            <a href="${item.url}" download="${item.filename}" class="btn-gallery-dl">⬇️</a>
          </div>
        `;
      }

      this.galleryGrid.appendChild(card);
    }
  }

  openTutorial() {
    this.tutorialModal?.classList.remove('hidden');
  }

  closeTutorial() {
    this.tutorialModal?.classList.add('hidden');
  }

  openGallery() {
    this.renderGalleryGrid();
    this.galleryModal?.classList.remove('hidden');
  }

  closeGallery() {
    this.galleryModal?.classList.add('hidden');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
}

// Bootstrap Application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.visionGardenApp = new VisionGardenApp();
});
