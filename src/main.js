/**
 * App Orchestrator & Pipeline Lifecycle Manager
 * Links Stages 1 through 8 in a high-performance requestAnimationFrame loop.
 */

import { CameraManager } from './pipeline/1_capture.js';
import { HandDetector } from './pipeline/2_detector.js';
import { KeypointExtractor } from './pipeline/3_keypoints.js';
import { HandTracker } from './pipeline/4_tracker.js';
import { HandMotionManager } from './pipeline/5_filters.js';
import { GestureClassifier } from './pipeline/6_gestures.js';
import { ActionDispatcher } from './pipeline/7_actions.js';
import { FlowerRenderer } from './pipeline/8_flowerRenderer.js';

import { SkeletonRenderer } from './render/skeletonRenderer.js';
import { DebugOverlay } from './render/debugOverlay.js';
import { PALETTES, PALETTE_LIST } from './render/palette.js';
import { UndoManager } from './utils/undoManager.js';

class App {
  constructor() {
    // DOM Elements
    this.viewport = document.getElementById('viewport');
    this.videoElement = document.getElementById('webcam-video');
    this.drawingCanvas = document.getElementById('drawing-canvas');
    this.skeletonCanvas = document.getElementById('skeleton-canvas');

    this.statusPill = document.getElementById('status-pill');
    this.statusText = document.getElementById('status-text');
    this.statusDot = this.statusPill.querySelector('.status-dot');

    this.detectionPill = document.getElementById('detection-pill');
    this.detectionPillText = document.getElementById('detection-pill-text');

    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalDesc = document.getElementById('modal-desc');
    this.modalBtn = document.getElementById('modal-btn');
    this.modalDemoBtn = document.getElementById('modal-demo-btn');
    this.modalHelpTip = document.getElementById('modal-help-tip');
    this.modalIconContainer = document.getElementById('modal-icon-container');

    this.actionToast = document.getElementById('action-toast');
    this.toastText = document.getElementById('toast-text');
    this.toastIcon = document.getElementById('toast-icon');

    // UI Buttons
    this.undoBtn = document.getElementById('undo-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.modeFlowerBtn = document.getElementById('mode-flower-btn');
    this.modePlainBtn = document.getElementById('mode-plain-btn');
    this.triggerBtn = document.getElementById('trigger-btn');
    this.triggerLabel = document.getElementById('trigger-label');
    this.skeletonBtn = document.getElementById('skeleton-btn');
    this.cameraFlipBtn = document.getElementById('camera-flip-btn');
    this.debugToggleBtn = document.getElementById('debug-toggle-btn');
    this.paletteBtn = document.getElementById('palette-btn');
    this.paletteDropdown = document.getElementById('palette-dropdown');
    this.activePaletteSwatch = document.getElementById('active-palette-swatch');
    this.activePaletteName = document.getElementById('active-palette-name');

    // Pipeline Stage Instances
    this.cameraManager = new CameraManager({
      videoElement: this.videoElement,
      onError: (err) => this.handleCameraError(err),
      onReady: () => this.handleCameraReady()
    });

    this.detector = new HandDetector({
      onStatusChange: (status) => this.setStatus(status, 'loading')
    });

    this.keypoints = new KeypointExtractor();
    this.tracker = new HandTracker();
    this.motionManager = new HandMotionManager();
    this.gestureClassifier = new GestureClassifier();
    this.actionDispatcher = new ActionDispatcher();
    this.flowerRenderer = new FlowerRenderer(this.drawingCanvas);
    this.skeletonRenderer = new SkeletonRenderer(this.skeletonCanvas);
    this.debugOverlay = new DebugOverlay(document.getElementById('debug-hud'));
    this.undoManager = new UndoManager();

    // Default to continuous index finger drawing so single-finger motion paints instantly
    this.actionDispatcher.setAlwaysDraw(true);

    this.isMirrored = true;
    this.currentPaletteIndex = 0;
    this.toastTimeout = null;

    // Mouse / Touch Demo Mode State
    this.isDemoMode = false;
    this.isMouseDown = false;
    this.lastMousePos = { x: 0, y: 0 };

    this.init();
  }

  async init() {
    this.setupResizeHandler();
    this.setupPaletteDropdown();
    this.setupUIEventListeners();
    this.setupActionBindings();
    this.setupMouseSimulation();

    // Set default botanical white daisy palette from reference image
    this.selectPalette('whiteDaisy');

    // Wire up modal action buttons
    this.modalBtn.onclick = async () => {
      this.modalBtn.disabled = true;
      this.modalBtn.textContent = 'Requesting...';
      this.modalIconContainer.innerHTML = '<div class="spinner"></div>';
      try {
        await this.cameraManager.start();
        this.hideModal();
        this.setStatus('Camera Active', 'ready');
      } catch (err) {
        this.handleCameraError(err);
      } finally {
        this.modalBtn.disabled = false;
        this.modalBtn.textContent = 'Retry Camera Access';
      }
    };

    this.modalDemoBtn.onclick = () => {
      this.isDemoMode = true;
      this.hideModal();
      this.setStatus('Mouse Paint Mode', 'ready');
      this.showToast('🎨', 'Click & drag anywhere to paint watercolor flowers!');
    };

    try {
      // 1. Initialize MediaPipe Model
      this.setStatus('Loading Vision AI...', 'loading');
      await this.detector.init();

      // 2. Attempt Camera Start
      this.setStatus('Starting Camera...', 'loading');
      await this.cameraManager.start();

      // 3. Hide loading modal & start loop
      this.hideModal();
      this.setStatus('Camera Active', 'ready');
    } catch (err) {
      console.warn('Initial camera auto-start paused, presenting user action modal:', err);
      this.handleCameraError(err);
    }

    // Always start animation loop so drawing and particles render
    this.startLoop();
  }

  setupResizeHandler() {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.drawingCanvas.width = width;
      this.drawingCanvas.height = height;

      this.skeletonCanvas.width = width;
      this.skeletonCanvas.height = height;

      this.flowerRenderer.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  setupPaletteDropdown() {
    this.paletteDropdown.innerHTML = PALETTE_LIST.map((p, idx) => {
      const pColor1 = p.flowers[0].primary;
      const pColor2 = p.flowers[0].secondary;
      return `
        <button class="palette-option ${idx === 0 ? 'selected' : ''}" data-palette-id="${p.id}">
          <span class="palette-swatch" style="background: linear-gradient(135deg, ${pColor1}, ${pColor2});"></span>
          <span>${p.name}</span>
        </button>
      `;
    }).join('');

    this.paletteDropdown.querySelectorAll('.palette-option').forEach((opt) => {
      opt.addEventListener('click', (e) => {
        const palId = opt.getAttribute('data-palette-id');
        this.selectPalette(palId);
        this.paletteDropdown.classList.remove('open');
      });
    });
  }

  selectPalette(paletteId) {
    const palette = PALETTES[paletteId];
    if (!palette) return;

    this.flowerRenderer.setPalette(paletteId);
    this.currentPaletteIndex = PALETTE_LIST.findIndex((p) => p.id === paletteId);

    // Update active swatch
    const pColor1 = palette.flowers[0].primary;
    const pColor2 = palette.flowers[0].secondary;
    this.activePaletteSwatch.style.background = `linear-gradient(135deg, ${pColor1}, ${pColor2})`;
    this.activePaletteName.textContent = palette.name.split(' ')[0];

    // Update selected class
    this.paletteDropdown.querySelectorAll('.palette-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.getAttribute('data-palette-id') === paletteId);
    });

    this.showToast('🌸', `Palette: ${palette.name}`);
  }

  cyclePalette() {
    this.currentPaletteIndex = (this.currentPaletteIndex + 1) % PALETTE_LIST.length;
    const nextPalette = PALETTE_LIST[this.currentPaletteIndex];
    this.selectPalette(nextPalette.id);
  }

  setupUIEventListeners() {
    // Palette Dropdown Toggle
    this.paletteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.paletteDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      this.paletteDropdown.classList.remove('open');
    });

    // Brush Modes
    this.modeFlowerBtn.addEventListener('click', () => {
      this.flowerRenderer.setMode('flower');
      this.modeFlowerBtn.classList.add('active');
      this.modePlainBtn.classList.remove('active');
      this.showToast('🌸', 'Flower Watercolor Ink Mode');
    });

    this.modePlainBtn.addEventListener('click', () => {
      this.flowerRenderer.setMode('plain');
      this.modePlainBtn.classList.add('active');
      this.modeFlowerBtn.classList.remove('active');
      this.showToast('✏️', 'Plain Line Mode');
    });

    // Draw Trigger Mode Toggle (Point/Pinch vs Always Draw)
    this.triggerBtn.addEventListener('click', () => {
      const isAlways = !this.actionDispatcher.alwaysDraw;
      this.actionDispatcher.setAlwaysDraw(isAlways);
      this.triggerBtn.classList.toggle('active', isAlways);
      this.triggerLabel.textContent = isAlways ? '✨ Always Draw' : '☝️ Point / Pinch';
      this.showToast(isAlways ? '✨' : '☝️', isAlways ? 'Mode: Continuous Single Finger Pen' : 'Mode: Point / Pinch Gesture');
    });

    // Canvas Actions
    this.clearBtn.addEventListener('click', () => {
      this.clearCanvas();
    });

    this.undoBtn.addEventListener('click', () => {
      this.undoStroke();
    });

    // Skeleton Overlay Toggle (Debug Skeleton Lines)
    this.skeletonBtn.addEventListener('click', () => {
      const showLines = this.skeletonRenderer.toggleSkeletonLines();
      this.skeletonBtn.classList.toggle('active', showLines);
      this.showToast(showLines ? '👁️' : '✨', showLines ? 'Skeleton Lines On' : 'Clean Pen View (Lines Hidden)');
    });

    // Telemetry Debug HUD Toggle
    this.debugToggleBtn.addEventListener('click', () => {
      const isVisible = this.debugOverlay.toggle();
      this.debugToggleBtn.classList.toggle('active', isVisible);
    });

    // Camera Switch (Front/Back)
    this.cameraFlipBtn.addEventListener('click', async () => {
      try {
        this.setStatus('Switching Camera...', 'loading');
        await this.cameraManager.switchCamera();
        this.isDemoMode = false;
        this.setStatus('Camera Active', 'ready');
        this.showToast('📷', 'Camera Switched');
      } catch (err) {
        this.showToast('⚠️', 'Could not switch camera');
      }
    });

    // Undo Manager Listener for Button State
    this.undoManager.subscribe(({ canUndo }) => {
      this.undoBtn.disabled = !canUndo;
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undoStroke();
      } else if (e.key.toLowerCase() === 'c') {
        this.clearCanvas();
      } else if (e.key.toLowerCase() === 's') {
        this.skeletonBtn.click();
      } else if (e.key.toLowerCase() === 'd') {
        this.debugToggleBtn.click();
      }
    });
  }

  setupMouseSimulation() {
    const handlePointerDown = (e) => {
      // Don't draw if clicking on dock or HUD buttons
      if (e.target.closest('.control-dock') || e.target.closest('.header-hud') || e.target.closest('.modal-overlay')) {
        return;
      }

      this.isMouseDown = true;
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      this.lastMousePos = { x, y };

      this.flowerRenderer.startStroke('mouse_pen', { x, y }, { speed: 100, direction: 0 });
    };

    const handlePointerMove = (e) => {
      if (!this.isMouseDown) return;

      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const dx = x - this.lastMousePos.x;
      const dy = y - this.lastMousePos.y;
      const speed = Math.hypot(dx, dy) * 20;
      const direction = Math.atan2(dy, dx);

      this.lastMousePos = { x, y };
      this.flowerRenderer.addStrokePoint('mouse_pen', { x, y }, { speed, direction });
    };

    const handlePointerUp = () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        const stroke = this.flowerRenderer.endStroke('mouse_pen');
        if (stroke && stroke.points.length > 1) {
          this.undoManager.push(stroke);
        }
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    window.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
  }

  setupActionBindings() {
    // 1. Drawing Lifecycle
    this.actionDispatcher.on('DRAW_START', ({ trackId, point, velocity }) => {
      this.flowerRenderer.startStroke(trackId, point, velocity);
    });

    this.actionDispatcher.on('DRAW_MOVE', ({ trackId, point, velocity }) => {
      this.flowerRenderer.addStrokePoint(trackId, point, velocity);
    });

    this.actionDispatcher.on('DRAW_END', ({ trackId }) => {
      const finishedStroke = this.flowerRenderer.endStroke(trackId);
      if (finishedStroke && finishedStroke.points.length > 1) {
        this.undoManager.push(finishedStroke);
      }
    });

    // 2. Gesture Actions
    this.actionDispatcher.on('CLEAR_CANVAS', () => {
      this.clearCanvas();
      this.showToast('🧹', 'Thumbs Up Gesture: Canvas Cleared');
    });

    this.actionDispatcher.on('CYCLE_PALETTE', () => {
      this.cyclePalette();
    });
  }

  clearCanvas() {
    this.flowerRenderer.clear();
    this.undoManager.clear();
    this.showToast('🧹', 'Canvas Cleared');
  }

  undoStroke() {
    const undone = this.undoManager.undo();
    if (undone) {
      this.flowerRenderer.restoreStrokes(this.undoManager.getStrokes());
      this.showToast('↩️', 'Stroke Undone');
    }
  }

  showToast(icon, text) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastIcon.textContent = icon;
    this.toastText.textContent = text;
    this.actionToast.classList.add('show');

    this.toastTimeout = setTimeout(() => {
      this.actionToast.classList.remove('show');
    }, 1800);
  }

  setStatus(text, state = 'ready') {
    this.statusText.textContent = text;
    this.statusDot.className = `status-dot ${state}`;
  }

  handleCameraReady() {
    this.hideModal();
    this.setStatus('Camera Active', 'ready');
  }

  handleCameraError(err) {
    this.setStatus('Camera Setup Needed', 'error');
    this.modalIconContainer.className = 'modal-icon-ring error';
    this.modalIconContainer.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
    this.modalTitle.textContent = 'Camera Access Required';
    this.modalDesc.textContent =
      err.message ||
      'Camera permission is required for real-time hand gesture tracking. Click Allow Camera Access below, or try Mouse Demo Mode.';
    this.modalBtn.style.display = 'inline-block';
    this.modalBtn.textContent = 'Allow Camera Access';
    this.modalDemoBtn.style.display = 'inline-block';
    this.modalHelpTip.style.display = 'block';
    this.showModal();
  }

  showModal() {
    this.modalOverlay.classList.remove('hidden');
  }

  hideModal() {
    this.modalOverlay.classList.add('hidden');
  }

  // --- Main Animation Frame Loop ---
  startLoop() {
    const renderLoop = (timestamp) => {
      const startTime = performance.now();
      const video = this.videoElement;

      let detectedHands = [];

      // 1. Process Hardware Video Stream if playing
      if (video && video.srcObject && video.videoWidth > 0) {
        if (video.paused) {
          video.play().catch(() => {});
        }

        const cWidth = this.drawingCanvas.width || window.innerWidth;
        const cHeight = this.drawingCanvas.height || window.innerHeight;

        // Compute object-fit cover transform
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const hRatio = cWidth / vWidth;
        const vRatio = cHeight / vHeight;
        const ratio = Math.max(hRatio, vRatio);
        const drawW = vWidth * ratio;
        const drawH = vHeight * ratio;
        const centerShiftX = (cWidth - drawW) / 2;
        const centerShiftY = (cHeight - drawH) / 2;

        // 2. Stage 2: Hand Detection
        const detectionResults = this.detector.detect(video, timestamp);

        // 3. Stage 3: Keypoint Extraction & Mirrored Space Normalization
        const viewportTransform = {
          offsetX: centerShiftX,
          offsetY: centerShiftY,
          drawWidth: drawW,
          drawHeight: drawH
        };

        detectedHands = this.keypoints.process(
          detectionResults,
          cWidth,
          cHeight,
          this.isMirrored,
          viewportTransform
        );
      }

      // 4. Stage 4: Position Tracking & ID association
      const trackedHands = this.tracker.update(detectedHands, timestamp);

      // 5. Stage 5: Movement Calculation & 1€ Filter Smoothing
      const motionHands = this.motionManager.process(trackedHands, timestamp);

      // 6. Stage 6: Geometric Gesture Classification
      const classifiedHands = motionHands.map((hand) => {
        const gestureResult = this.gestureClassifier.classify(hand);
        return {
          ...hand,
          gestureResult
        };
      });

      // Update Top Status Pill & Detection Banner
      if (this.cameraManager.isStreaming) {
        if (classifiedHands.length > 0) {
          const mainHand = classifiedHands[0];
          const mainGesture = mainHand.gestureResult.gesture.toUpperCase().replace('_', ' ');
          const conf = Math.round((mainHand.confidence || 0.9) * 100);

          if (this.detectionPill) {
            this.detectionPill.className = 'detection-pill detected';
            this.detectionPillText.textContent = `🟢 ${classifiedHands.length} Hand Detected (${mainHand.handedness} • ${mainGesture} • ${conf}%)`;
          }
          this.setStatus(`Tracking ${classifiedHands.length} Hand`, 'ready');
        } else {
          if (this.detectionPill) {
            this.detectionPill.className = 'detection-pill searching';
            this.detectionPillText.textContent = '👀 Searching for hands...';
          }
          this.setStatus('Camera Active (Show Hand)', 'ready');
        }
      } else if (this.isDemoMode) {
        if (this.detectionPill) {
          this.detectionPill.className = 'detection-pill searching';
          this.detectionPillText.textContent = '🎨 Mouse / Touch Paint Mode';
        }
      }

      // 7. Stage 7: Action Dispatcher (when hands detected)
      if (classifiedHands.length > 0) {
        this.actionDispatcher.process(classifiedHands, timestamp);
      }

      // 8. Stage 8: Generative Watercolor Flower Ink Rendering
      this.flowerRenderer.render();

      // 9. Overlay: Skeleton & Gestural Cursor
      this.skeletonCanvas.getContext('2d').clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
      this.skeletonRenderer.render(classifiedHands, { alwaysDraw: this.actionDispatcher.alwaysDraw });

      // 10. Telemetry & Diagnostics
      const inferenceTime = performance.now() - startTime;
      this.debugOverlay.updateMetrics(inferenceTime);
      this.debugOverlay.updateHands(classifiedHands);

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }
}

// Instantiate on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
