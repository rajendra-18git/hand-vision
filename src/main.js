/**
 * AuraBloom — Interactive Botanical Garden & AI Studio Orchestrator
 * Connects MediaPipe AI vision pipeline, photorealistic flower rendering,
 * toggleable Glassmorphism 2.0 Studio Dashboard, and gesture controls.
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
import { FLOWER_COLLECTION, FLOWER_LIST } from './render/palette.js';
import { UndoManager } from './utils/undoManager.js';

class AuraBloomApp {
  constructor() {
    // 1. Root & Viewport Stack
    this.appLayout = document.getElementById('app');
    this.viewport = document.getElementById('viewport');
    this.videoElement = document.getElementById('webcam-video');
    this.drawingCanvas = document.getElementById('drawing-canvas');
    this.skeletonCanvas = document.getElementById('skeleton-canvas');

    // 2. Dashboard Navigation & Sidebar
    this.sidebar = document.getElementById('main-sidebar');
    this.sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    this.dashboardToggleBtn = document.getElementById('dashboard-toggle-btn');
    this.dashboardToggleLabel = document.getElementById('dashboard-toggle-label');
    this.navItems = document.querySelectorAll('.nav-item');
    this.viewPanels = document.querySelectorAll('.view-panel');
    this.headerViewSubtitle = document.getElementById('header-view-subtitle');

    // 3. Header Indicators & Controls
    this.statusPill = document.getElementById('status-pill');
    this.statusText = document.getElementById('status-text');
    this.statusDot = this.statusPill?.querySelector('.status-dot');
    this.detectionPill = document.getElementById('detection-pill');
    this.detectionPillText = document.getElementById('detection-pill-text');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.exportSnapshotBtn = document.getElementById('export-snapshot-btn');

    // 4. Botanical Ribbon & HUD
    this.flowerRibbon = document.getElementById('flower-ribbon');
    this.botanicalCard = document.getElementById('botanical-card-hud');
    this.botanicalAvatar = document.getElementById('botanical-avatar');
    this.botanicalName = document.getElementById('botanical-name');
    this.botanicalBinomial = document.getElementById('botanical-binomial');
    this.botanicalFamily = document.getElementById('botanical-family');
    this.botanicalDesc = document.getElementById('botanical-desc');

    // 5. Studio Dock Buttons
    this.undoBtn = document.getElementById('undo-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.triggerBtn = document.getElementById('trigger-btn');
    this.triggerLabel = document.getElementById('trigger-label');
    this.skeletonBtn = document.getElementById('skeleton-btn');
    this.cameraFlipBtn = document.getElementById('camera-flip-btn');
    this.debugToggleBtn = document.getElementById('debug-toggle-btn');
    this.shortcutsModalBtn = document.getElementById('shortcuts-modal-btn');

    // 6. Sidebar Health Elements
    this.sidebarVisionStatus = document.getElementById('sidebar-vision-status');
    this.sidebarBloomsCount = document.getElementById('sidebar-blooms-count');
    this.sidebarBloomsFill = document.getElementById('sidebar-blooms-fill');

    // 7. Modals
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalDesc = document.getElementById('modal-desc');
    this.modalBtn = document.getElementById('modal-btn');
    this.modalDemoBtn = document.getElementById('modal-demo-btn');
    this.modalHelpTip = document.getElementById('modal-help-tip');
    this.modalIconContainer = document.getElementById('modal-icon-container');

    this.exportModal = document.getElementById('export-modal-overlay');
    this.exportModalClose = document.getElementById('export-modal-close');
    this.exportPreviewCanvas = document.getElementById('export-preview-canvas');
    this.exportFormatSelect = document.getElementById('export-format-select');
    this.exportBackdropSelect = document.getElementById('export-backdrop-select');
    this.downloadExportBtn = document.getElementById('download-export-btn');

    this.shortcutsModal = document.getElementById('shortcuts-modal-overlay');
    this.shortcutsModalClose = document.getElementById('shortcuts-modal-close');

    // 8. Action Toast Notification Banner
    this.actionToast = document.getElementById('action-toast');
    this.toastText = document.getElementById('toast-text');
    this.toastIcon = document.getElementById('toast-icon');

    // 9. Analytics & Telemetry Elements
    this.telemetryCanvas = document.getElementById('telemetry-chart-canvas');
    this.analyticsFpsVal = document.getElementById('analytics-fps-val');
    this.analyticsLatVal = document.getElementById('analytics-lat-val');
    this.analyticsBloomsVal = document.getElementById('analytics-blooms-val');
    this.analyticsConfVal = document.getElementById('analytics-conf-val');
    this.gestureBarsContainer = document.getElementById('gesture-bars-container');
    this.telemetryEventTableBody = document.getElementById('telemetry-event-table-body');
    this.resetTelemetryBtn = document.getElementById('reset-telemetry-btn');
    this.exportTelemetryCsvBtn = document.getElementById('export-telemetry-csv');

    // 10. Botanical Library Elements
    this.specimensGrid = document.getElementById('specimens-grid');
    this.libraryFilterTabs = document.getElementById('library-filter-tabs');

    // 11. Gesture Matrix Elements
    this.sliderPointThreshold = document.getElementById('slider-point-threshold');
    this.valPointThreshold = document.getElementById('val-point-threshold');
    this.sliderPalmSpread = document.getElementById('slider-palm-spread');
    this.valPalmSpread = document.getElementById('val-palm-spread');
    this.sliderPeaceCooldown = document.getElementById('slider-peace-cooldown');
    this.valPeaceCooldown = document.getElementById('val-peace-cooldown');
    this.sliderThumbHold = document.getElementById('slider-thumb-hold');
    this.valThumbHold = document.getElementById('val-thumb-hold');
    this.resetGesturesBtn = document.getElementById('reset-gestures-btn');

    // 12. Settings Form Elements
    this.settingMinConfidence = document.getElementById('setting-min-confidence');
    this.valConfSetting = document.getElementById('val-conf-setting');
    this.settingFilterSmoothing = document.getElementById('setting-filter-smoothing');
    this.valFilterSetting = document.getElementById('val-filter-setting');
    this.settingMirrorVideo = document.getElementById('setting-mirror-video');
    this.settingMaxFlowers = document.getElementById('setting-max-flowers');
    this.valMaxFlowersSetting = document.getElementById('val-max-flowers-setting');
    this.settingFlowerScale = document.getElementById('setting-flower-scale');
    this.valScaleSetting = document.getElementById('val-scale-setting');
    this.saveSettingsBtn = document.getElementById('save-settings-btn');

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
    this.actionDispatcher = new ActionDispatcher({ alwaysDraw: true });
    this.flowerRenderer = new FlowerRenderer(this.drawingCanvas, { maxFlowers: 60 });
    this.skeletonRenderer = new SkeletonRenderer(this.skeletonCanvas);
    this.debugOverlay = new DebugOverlay(document.getElementById('debug-hud'));
    this.undoManager = new UndoManager();

    // App State
    this.isMirrored = true;
    this.currentFlowerIndex = 0;
    this.currentFlowerId = 'allMix';
    this.toastTimeout = null;
    this.isDashboardOpen = false;
    this.activeView = 'studio';

    // Demo Mode State
    this.isDemoMode = false;
    this.isMouseDown = false;

    // Telemetry Telemetry History State
    this.latencyHistory = new Array(60).fill(4.0);
    this.gestureCounts = { pointing: 0, open_palm: 0, peace: 0, thumbs_up: 0, fist: 0, pinch: 0 };
    this.recentEventsLog = [];
    this.lastFpsUpdateTime = performance.now();
    this.frameCountSinceFpsUpdate = 0;
    this.currentFps = 60.0;

    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupResizeHandler();
    this.setupDashboardNavigation();
    this.setupFlowerRibbon();
    this.setupBotanicalLibrary();
    this.setupGestureMatrix();
    this.setupSettingsView();
    this.setupExportModal();
    this.setupShortcutsModal();
    this.setupUIEventListeners();
    this.setupActionBindings();
    this.setupMouseSimulation();

    // Select default flower
    this.selectFlower('allMix');
    this.updateModeUI();

    // Wire up modal action buttons
    if (this.modalBtn) {
      this.modalBtn.onclick = async () => {
        this.modalBtn.disabled = true;
        this.modalBtn.textContent = 'Requesting...';
        if (this.modalIconContainer) this.modalIconContainer.innerHTML = '<div class="spinner"></div>';
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
    }

    if (this.modalDemoBtn) {
      this.modalDemoBtn.onclick = () => {
        this.isDemoMode = true;
        this.hideModal();
        this.setStatus('Interactive Demo Mode', 'ready');
        this.showToast('🌸', 'Drag mouse or finger to draw continuous floral trails!');
      };
    }

    try {
      this.setStatus('Loading Vision AI...', 'loading');
      await this.detector.init();

      this.setStatus('Starting Camera...', 'loading');
      await this.cameraManager.start();

      this.hideModal();
      this.setStatus('Camera Active', 'ready');
    } catch (err) {
      console.warn('Initial camera auto-start paused, presenting user action modal:', err);
      this.handleCameraError(err);
    }

    this.startLoop();
  }

  // --- Theme Management ---
  setupTheme() {
    const savedTheme = localStorage.getItem('aurabloom-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('aurabloom-theme', nextTheme);
        this.showToast(nextTheme === 'dark' ? '🌙' : '☀️', `${nextTheme.toUpperCase()} Glass Theme Enabled`);
      });
    }
  }

  // --- Dashboard Drawer & View Switcher ---
  setupDashboardNavigation() {
    const toggleDashboard = () => {
      this.isDashboardOpen = !this.isDashboardOpen;
      this.appLayout.classList.toggle('dashboard-open', this.isDashboardOpen);
      if (this.dashboardToggleBtn) {
        this.dashboardToggleBtn.classList.toggle('active', this.isDashboardOpen);
      }
      if (this.dashboardToggleLabel) {
        this.dashboardToggleLabel.textContent = this.isDashboardOpen ? 'Close Menu' : 'Dashboard';
      }
      this.showToast(this.isDashboardOpen ? '📊' : '🎨', this.isDashboardOpen ? 'Studio Dashboard Opened' : 'Fullscreen Garden View');
    };

    if (this.dashboardToggleBtn) {
      this.dashboardToggleBtn.addEventListener('click', toggleDashboard);
    }

    if (this.sidebarCloseBtn) {
      this.sidebarCloseBtn.addEventListener('click', () => {
        this.isDashboardOpen = false;
        this.appLayout.classList.remove('dashboard-open');
        this.dashboardToggleBtn?.classList.remove('active');
        if (this.dashboardToggleLabel) this.dashboardToggleLabel.textContent = 'Dashboard';
      });
    }

    this.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.getAttribute('data-view');
        this.switchView(viewId);
      });
    });
  }

  switchView(viewId) {
    this.activeView = viewId;

    this.navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });

    this.viewPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `view-${viewId}`);
    });

    const subtitles = {
      studio: 'Botanical Vision Canvas',
      analytics: 'Vision Telemetry & Data',
      library: 'Botanical Specimen Library',
      gestures: 'Gesture Recognition Matrix',
      settings: 'Engine & Visual Settings'
    };

    if (this.headerViewSubtitle) {
      this.headerViewSubtitle.textContent = subtitles[viewId] || 'Botanical Vision';
    }

    // If switched back to studio canvas on small screen, auto-collapse drawer
    if (viewId === 'studio' && window.innerWidth < 900) {
      this.isDashboardOpen = false;
      this.appLayout.classList.remove('dashboard-open');
      this.dashboardToggleBtn?.classList.remove('active');
    }
  }

  // --- Canvas Resizing ---
  setupResizeHandler() {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (this.drawingCanvas) {
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;
      }

      if (this.skeletonCanvas) {
        this.skeletonCanvas.width = width;
        this.skeletonCanvas.height = height;
      }

      if (this.flowerRenderer) {
        this.flowerRenderer.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  // --- Flower Selection Ribbon ---
  setupFlowerRibbon() {
    if (!this.flowerRibbon) return;

    this.flowerRibbon.innerHTML = FLOWER_LIST.map((flower, idx) => `
      <button class="flower-pill ${idx === 0 ? 'active' : ''}" data-flower-id="${flower.id}" aria-label="Select ${flower.name}">
        <span class="flower-pill-emoji">${flower.emoji}</span>
        <span>${flower.name}</span>
      </button>
    `).join('');

    this.flowerRibbon.querySelectorAll('.flower-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const flowerId = pill.getAttribute('data-flower-id');
        this.selectFlower(flowerId);
      });
    });
  }

  selectFlower(flowerId) {
    const flower = FLOWER_COLLECTION[flowerId];
    if (!flower) return;

    this.currentFlowerId = flowerId;
    this.flowerRenderer.setFlowerType(flowerId);
    this.currentFlowerIndex = FLOWER_LIST.findIndex((f) => f.id === flowerId);

    if (this.flowerRibbon) {
      this.flowerRibbon.querySelectorAll('.flower-pill').forEach((pill) => {
        pill.classList.toggle('active', pill.getAttribute('data-flower-id') === flowerId);
      });
    }

    if (this.specimensGrid) {
      this.specimensGrid.querySelectorAll('.specimen-card').forEach((card) => {
        card.classList.toggle('active-selected', card.getAttribute('data-specimen-id') === flowerId);
      });
    }

    this.updateBotanicalCard(flower);
    this.showToast(flower.emoji, `Active Specimen: ${flower.name}`);
  }

  updateBotanicalCard(flower) {
    if (!this.botanicalCard) return;

    if (this.botanicalAvatar) this.botanicalAvatar.textContent = flower.emoji || '🌸';
    if (this.botanicalName) this.botanicalName.textContent = flower.name;
    if (this.botanicalBinomial) this.botanicalBinomial.textContent = flower.scientificName || '';
    if (this.botanicalFamily) this.botanicalFamily.textContent = flower.family || 'Botanical';
    if (this.botanicalDesc) this.botanicalDesc.textContent = flower.description || '';
  }

  cycleFlowerVariety() {
    this.currentFlowerIndex = (this.currentFlowerIndex + 1) % FLOWER_LIST.length;
    const nextFlower = FLOWER_LIST[this.currentFlowerIndex];
    this.selectFlower(nextFlower.id);
  }

  toggleDrawingMode() {
    const newMode = this.flowerRenderer.toggleMode();
    this.updateModeUI();
    this.showToast(newMode === 'flower' ? '🌸' : '✨', newMode === 'flower' ? 'Floral Trail Mode' : 'Plain Trail Mode');
  }

  updateModeUI() {
    if (this.triggerLabel) {
      this.triggerLabel.textContent = this.flowerRenderer.mode === 'flower' ? '🌸 Floral Trail' : '✨ Plain Trail';
    }
    if (this.triggerBtn) {
      this.triggerBtn.classList.toggle('active', this.flowerRenderer.mode === 'flower');
    }
  }

  // --- Botanical Specimen Library ---
  setupBotanicalLibrary() {
    if (!this.specimensGrid) return;

    this.renderSpecimenCards('all');

    if (this.libraryFilterTabs) {
      this.libraryFilterTabs.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.libraryFilterTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const family = btn.getAttribute('data-family');
          this.renderSpecimenCards(family);
        });
      });
    }
  }

  renderSpecimenCards(familyFilter = 'all') {
    if (!this.specimensGrid) return;

    const filtered = FLOWER_LIST.filter((f) => {
      if (familyFilter === 'all') return true;
      return f.family && f.family.toLowerCase().includes(familyFilter.toLowerCase());
    });

    this.specimensGrid.innerHTML = filtered.map((flower) => {
      const isSelected = flower.id === this.currentFlowerId;
      return `
        <div class="glass-card specimen-card ${isSelected ? 'active-selected' : ''}" data-specimen-id="${flower.id}">
          <div class="specimen-top">
            <div class="specimen-avatar-box">${flower.emoji}</div>
            <div class="specimen-info-col">
              <h3>${flower.name}</h3>
              <span class="specimen-binomial">${flower.scientificName || 'Flora'}</span>
            </div>
          </div>
          <div class="specimen-tags-row">
            <span class="meta-tag active">${flower.family || 'Botanical'}</span>
            <span class="meta-tag">Scale: ${flower.defaultScale || 1.2}x</span>
            <span class="meta-tag">Duration: ${flower.bloomDuration || 350}ms</span>
          </div>
          <p class="specimen-desc">${flower.description || ''}</p>
          <button class="glass-action-btn ${isSelected ? 'primary' : 'secondary'} specimen-card-btn" data-specimen-id="${flower.id}">
            ${isSelected ? 'Active Specimen' : 'Select for Studio'}
          </button>
        </div>
      `;
    }).join('');

    this.specimensGrid.querySelectorAll('.specimen-card-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const flowerId = btn.getAttribute('data-specimen-id');
        this.selectFlower(flowerId);
        this.switchView('studio');
      });
    });

    this.specimensGrid.querySelectorAll('.specimen-card').forEach((card) => {
      card.addEventListener('click', () => {
        const flowerId = card.getAttribute('data-specimen-id');
        this.selectFlower(flowerId);
      });
    });
  }

  // --- Gesture Recognition Matrix Controls ---
  setupGestureMatrix() {
    if (this.sliderPointThreshold && this.valPointThreshold) {
      this.sliderPointThreshold.addEventListener('input', (e) => {
        this.valPointThreshold.textContent = parseFloat(e.target.value).toFixed(2);
      });
    }

    if (this.sliderPalmSpread && this.valPalmSpread) {
      this.sliderPalmSpread.addEventListener('input', (e) => {
        this.valPalmSpread.textContent = parseFloat(e.target.value).toFixed(2);
      });
    }

    if (this.sliderPeaceCooldown && this.valPeaceCooldown) {
      this.sliderPeaceCooldown.addEventListener('input', (e) => {
        this.valPeaceCooldown.textContent = `${e.target.value}ms`;
      });
    }

    if (this.sliderThumbHold && this.valThumbHold) {
      this.sliderThumbHold.addEventListener('input', (e) => {
        this.valThumbHold.textContent = `${e.target.value}ms`;
      });
    }

    if (this.resetGesturesBtn) {
      this.resetGesturesBtn.addEventListener('click', () => {
        if (this.sliderPointThreshold) this.sliderPointThreshold.value = '0.70';
        if (this.valPointThreshold) this.valPointThreshold.textContent = '0.70';
        if (this.sliderPalmSpread) this.sliderPalmSpread.value = '0.45';
        if (this.valPalmSpread) this.valPalmSpread.textContent = '0.45';
        if (this.sliderPeaceCooldown) this.sliderPeaceCooldown.value = '450';
        if (this.valPeaceCooldown) this.valPeaceCooldown.textContent = '450ms';
        if (this.sliderThumbHold) this.sliderThumbHold.value = '300';
        if (this.valThumbHold) this.valThumbHold.textContent = '300ms';
        this.showToast('⚙️', 'Gesture Sensitivity Matrix Reset');
      });
    }
  }

  // --- Studio Engine Settings ---
  setupSettingsView() {
    if (this.settingMinConfidence && this.valConfSetting) {
      this.settingMinConfidence.addEventListener('input', (e) => {
        this.valConfSetting.textContent = parseFloat(e.target.value).toFixed(2);
      });
    }

    if (this.settingFilterSmoothing && this.valFilterSetting) {
      this.settingFilterSmoothing.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.valFilterSetting.textContent = val.toFixed(2);
        this.flowerRenderer.smoothingWeight = val;
      });
    }

    if (this.settingMaxFlowers && this.valMaxFlowersSetting) {
      this.settingMaxFlowers.addEventListener('input', (e) => {
        this.valMaxFlowersSetting.textContent = e.target.value;
        this.flowerRenderer.maxFlowers = parseInt(e.target.value, 10);
      });
    }

    if (this.settingFlowerScale && this.valScaleSetting) {
      this.settingFlowerScale.addEventListener('input', (e) => {
        this.valScaleSetting.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
      });
    }

    if (this.settingMirrorVideo) {
      this.settingMirrorVideo.addEventListener('change', (e) => {
        this.isMirrored = e.target.checked;
        if (this.videoElement) {
          this.videoElement.style.transform = this.isMirrored ? 'scaleX(-1)' : 'none';
        }
      });
    }

    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', () => {
        this.showToast('✅', 'Preferences Saved Successfully');
      });
    }
  }

  // --- Export Modal & High-Res Snapshot ---
  setupExportModal() {
    if (this.exportSnapshotBtn) {
      this.exportSnapshotBtn.addEventListener('click', () => {
        this.openExportModal();
      });
    }

    if (this.exportModalClose) {
      this.exportModalClose.addEventListener('click', () => {
        this.closeExportModal();
      });
    }

    if (this.downloadExportBtn) {
      this.downloadExportBtn.addEventListener('click', () => {
        this.performArtworkDownload();
      });
    }
  }

  openExportModal() {
    if (!this.exportModal) return;
    this.exportModal.classList.remove('hidden');

    if (this.exportPreviewCanvas && this.drawingCanvas) {
      const pCtx = this.exportPreviewCanvas.getContext('2d');
      pCtx.clearRect(0, 0, this.exportPreviewCanvas.width, this.exportPreviewCanvas.height);
      pCtx.drawImage(this.drawingCanvas, 0, 0, this.exportPreviewCanvas.width, this.exportPreviewCanvas.height);
    }
  }

  closeExportModal() {
    if (this.exportModal) {
      this.exportModal.classList.add('hidden');
    }
  }

  performArtworkDownload() {
    const format = this.exportFormatSelect?.value || 'png';
    const backdrop = this.exportBackdropSelect?.value || 'transparent';

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.drawingCanvas.width || 1920;
    exportCanvas.height = this.drawingCanvas.height || 1080;
    const ctx = exportCanvas.getContext('2d');

    if (backdrop === 'backdrop' && this.videoElement && this.videoElement.videoWidth > 0) {
      ctx.save();
      if (this.isMirrored) {
        ctx.scale(-1, 1);
        ctx.drawImage(this.videoElement, -exportCanvas.width, 0, exportCanvas.width, exportCanvas.height);
      } else {
        ctx.drawImage(this.videoElement, 0, 0, exportCanvas.width, exportCanvas.height);
      }
      ctx.restore();
    } else if (backdrop !== 'transparent') {
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    ctx.drawImage(this.drawingCanvas, 0, 0);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `AuraBloom_Garden_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    a.click();

    this.closeExportModal();
    this.showToast('📥', 'Botanical Artwork Exported!');
  }

  // --- Keyboard Shortcuts Modal ---
  setupShortcutsModal() {
    if (this.shortcutsModalBtn) {
      this.shortcutsModalBtn.addEventListener('click', () => {
        this.shortcutsModal?.classList.remove('hidden');
      });
    }

    if (this.shortcutsModalClose) {
      this.shortcutsModalClose.addEventListener('click', () => {
        this.shortcutsModal?.classList.add('hidden');
      });
    }
  }

  // --- UI Event Listeners ---
  setupUIEventListeners() {
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.clearCanvas();
      });
    }

    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => {
        this.undoStroke();
      });
    }

    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', () => {
        this.toggleDrawingMode();
      });
    }

    if (this.skeletonBtn) {
      this.skeletonBtn.addEventListener('click', () => {
        const showLines = this.skeletonRenderer.toggleSkeletonLines();
        this.skeletonBtn.classList.toggle('active', showLines);
        this.showToast(showLines ? '👁️' : '✨', showLines ? 'Skeleton Lines On' : 'Clean Garden View');
      });
    }

    if (this.debugToggleBtn) {
      this.debugToggleBtn.addEventListener('click', () => {
        const isVisible = this.debugOverlay.toggle();
        this.debugToggleBtn.classList.toggle('active', isVisible);
      });
    }

    if (this.cameraFlipBtn) {
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
    }

    if (this.resetTelemetryBtn) {
      this.resetTelemetryBtn.addEventListener('click', () => {
        this.gestureCounts = { pointing: 0, open_palm: 0, peace: 0, thumbs_up: 0, fist: 0, pinch: 0 };
        this.recentEventsLog = [];
        this.renderTelemetryTable();
        this.showToast('📊', 'Telemetry History Reset');
      });
    }

    if (this.exportTelemetryCsvBtn) {
      this.exportTelemetryCsvBtn.addEventListener('click', () => {
        const csvContent = "data:text/csv;charset=utf-8," 
          + ["Timestamp,Hand,Gesture,Confidence,Action"].concat(
              this.recentEventsLog.map(e => `${e.time},${e.hand},${e.gesture},${e.conf},${e.action}`)
            ).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AuraBloom_Telemetry_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('📄', 'Telemetry CSV Exported');
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        this.dashboardToggleBtn?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        this.undoStroke();
      } else if (e.key.toLowerCase() === 'c') {
        this.clearCanvas();
      } else if (e.key.toLowerCase() === 's') {
        this.skeletonBtn?.click();
      } else if (e.key.toLowerCase() === 'd') {
        this.debugToggleBtn?.click();
      } else if (e.key.toLowerCase() === 'f') {
        this.cycleFlowerVariety();
      } else if (e.key.toLowerCase() === 'm') {
        this.toggleDrawingMode();
      } else if (e.key === '?') {
        this.shortcutsModal?.classList.remove('hidden');
      } else if (e.key === 'Escape') {
        this.closeExportModal();
        this.shortcutsModal?.classList.add('hidden');
        if (this.isDashboardOpen) {
          this.sidebarCloseBtn?.click();
        }
      }
    });
  }

  // --- Mouse / Touch Simulation for Fallback / Demo ---
  setupMouseSimulation() {
    const handlePointerDown = (e) => {
      if (e.target.closest('.control-dock') || e.target.closest('.glass-sidebar') || e.target.closest('.glass-navbar') || e.target.closest('.botanical-card-hud') || e.target.closest('.modal-overlay') || e.target.closest('.gesture-guide-banner') || e.target.closest('.debug-hud')) {
        return;
      }

      this.isMouseDown = true;
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      this.flowerRenderer.startStroke('mouse', { x, y });
      this.updateUndoState();
    };

    const handlePointerMove = (e) => {
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      if (this.isMouseDown) {
        this.flowerRenderer.addStrokePoint('mouse', { x, y });
      } else {
        const hit = this.flowerRenderer.setHoverPoint({ x, y });
        if (hit) {
          this.updateBotanicalCard(hit);
        }
      }
    };

    const handlePointerUp = () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        this.flowerRenderer.endStroke('mouse');
        this.updateUndoState();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    window.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
  }

  // --- Action Dispatcher Bindings ---
  setupActionBindings() {
    this.actionDispatcher.on('DRAW_START', ({ trackId, point }) => {
      this.flowerRenderer.startStroke(trackId, point);
      this.updateUndoState();
      this.logGestureEvent('Pointing', 'DRAW_START', 0.95);
    });

    this.actionDispatcher.on('DRAW_MOVE', ({ trackId, point }) => {
      this.flowerRenderer.addStrokePoint(trackId, point);
    });

    this.actionDispatcher.on('DRAW_END', ({ trackId }) => {
      this.flowerRenderer.endStroke(trackId);
      this.updateUndoState();
    });

    this.actionDispatcher.on('HOVER', ({ point }) => {
      const hit = this.flowerRenderer.setHoverPoint(point);
      if (hit) {
        this.updateBotanicalCard(hit);
      }
      this.logGestureEvent('Open Palm', 'HOVER_INSPECT', 0.92);
    });

    this.actionDispatcher.on('CYCLE_FLOWER', () => {
      this.cycleFlowerVariety();
      this.logGestureEvent('Peace Sign', 'CYCLE_FLOWER', 0.97);
    });

    this.actionDispatcher.on('CLEAR_CANVAS', () => {
      this.clearCanvas();
      this.logGestureEvent('Thumbs Up', 'CLEAR_CANVAS', 0.98);
    });
  }

  logGestureEvent(gesture, action, conf) {
    const timeStr = new Date().toLocaleTimeString();
    const eventObj = {
      time: timeStr,
      hand: 'Right',
      gesture,
      conf: `${Math.round(conf * 100)}%`,
      pos: 'Center Screen',
      action
    };

    this.recentEventsLog.unshift(eventObj);
    if (this.recentEventsLog.length > 15) {
      this.recentEventsLog.pop();
    }

    if (this.activeView === 'analytics') {
      this.renderTelemetryTable();
    }
  }

  renderTelemetryTable() {
    if (!this.telemetryEventTableBody) return;

    if (this.recentEventsLog.length === 0) {
      this.telemetryEventTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty-row">No gestures detected yet. Wave your hand in front of the camera to begin streaming.</td>
        </tr>
      `;
      return;
    }

    this.telemetryEventTableBody.innerHTML = this.recentEventsLog.map((item) => `
      <tr>
        <td style="font-family: monospace; font-size: 11px;">${item.time}</td>
        <td><span class="meta-tag">${item.hand}</span></td>
        <td><strong>${item.gesture}</strong></td>
        <td><span class="kpi-badge emerald">${item.conf}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${item.pos}</td>
        <td><span class="meta-tag active">${item.action}</span></td>
      </tr>
    `).join('');
  }

  clearCanvas() {
    this.flowerRenderer.clear();
    this.updateUndoState();
    this.showToast('🧹', 'Garden Canvas Cleared');
  }

  undoStroke() {
    const success = this.flowerRenderer.undo();
    if (success) {
      this.showToast('↩️', 'Reverted Last Bloom Stroke');
    }
    this.updateUndoState();
  }

  updateUndoState() {
    const flowerCount = this.flowerRenderer.flowers.length;
    const maxFlowers = this.flowerRenderer.maxFlowers;

    if (this.undoBtn) {
      const hasContent = flowerCount > 0 || this.flowerRenderer.completedStrokes.length > 0;
      this.undoBtn.disabled = !hasContent;
    }

    if (this.sidebarBloomsCount) {
      this.sidebarBloomsCount.textContent = `${flowerCount} / ${maxFlowers}`;
    }
    if (this.sidebarBloomsFill) {
      const pct = Math.min(100, Math.round((flowerCount / maxFlowers) * 100));
      this.sidebarBloomsFill.style.width = `${pct}%`;
    }
    if (this.analyticsBloomsVal) {
      this.analyticsBloomsVal.textContent = flowerCount;
    }
  }

  showToast(icon, text) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    if (this.toastIcon) this.toastIcon.textContent = icon;
    if (this.toastText) this.toastText.textContent = text;
    if (this.actionToast) {
      this.actionToast.classList.add('show');
      this.toastTimeout = setTimeout(() => {
        this.actionToast.classList.remove('show');
      }, 2000);
    }
  }

  setStatus(text, state = 'ready') {
    if (this.statusText) this.statusText.textContent = text;
    if (this.statusDot) this.statusDot.className = `status-dot ${state}`;
  }

  handleCameraReady() {
    this.hideModal();
    this.setStatus('Camera Active', 'ready');
  }

  handleCameraError(err) {
    this.setStatus('Camera Setup Needed', 'error');

    if (this.modalIconContainer) {
      this.modalIconContainer.className = 'modal-icon-ring error';
      this.modalIconContainer.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    }
    if (this.modalTitle) this.modalTitle.textContent = 'Camera Access Required';
    if (this.modalDesc) {
      this.modalDesc.textContent =
        err.message ||
        'Camera permission is required for real-time hand gesture tracking. Click Allow Camera Access below, or try Mouse Demo Mode.';
    }
    if (this.modalBtn) {
      this.modalBtn.style.display = 'inline-block';
      this.modalBtn.textContent = 'Allow Camera Access';
    }
    if (this.modalDemoBtn) this.modalDemoBtn.style.display = 'inline-block';
    if (this.modalHelpTip) this.modalHelpTip.style.display = 'block';
    this.showModal();
  }

  showModal() {
    this.modalOverlay?.classList.remove('hidden');
  }

  hideModal() {
    this.modalOverlay?.classList.add('hidden');
  }

  // --- Real-Time Telemetry Chart Rendering ---
  renderTelemetryChart() {
    if (!this.telemetryCanvas || this.activeView !== 'analytics') return;

    const ctx = this.telemetryCanvas.getContext('2d');
    const width = this.telemetryCanvas.width;
    const height = this.telemetryCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Latency Line
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    const step = width / (this.latencyHistory.length - 1);
    const maxVal = 20;

    this.latencyHistory.forEach((val, i) => {
      const x = i * step;
      const normalizedY = height - (Math.min(val, maxVal) / maxVal) * (height - 20) - 10;
      if (i === 0) {
        ctx.moveTo(x, normalizedY);
      } else {
        ctx.lineTo(x, normalizedY);
      }
    });
    ctx.stroke();

    // Area Fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fill();

    // Update Gesture Distribution Bars
    if (this.gestureBarsContainer) {
      const totalGestures = Object.values(this.gestureCounts).reduce((a, b) => a + b, 0) || 1;
      const gestureLabels = {
        pointing: 'Pointing / Drag',
        open_palm: 'Open Palm Hover',
        peace: 'Peace Sign (Cycle)',
        thumbs_up: 'Thumbs Up (Clear)',
        fist: 'Closed Fist'
      };

      this.gestureBarsContainer.innerHTML = Object.entries(gestureLabels).map(([key, label]) => {
        const count = this.gestureCounts[key] || 0;
        const pct = Math.round((count / totalGestures) * 100);
        return `
          <div class="gesture-bar-item">
            <div class="bar-meta">
              <span class="bar-name">${label}</span>
              <span class="bar-count">${count} (${pct}%)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
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

        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;
        const hRatio = cWidth / vWidth;
        const vRatio = cHeight / vHeight;
        const ratio = Math.max(hRatio, vRatio);
        const drawW = vWidth * ratio;
        const drawH = vHeight * ratio;
        const centerShiftX = (cWidth - drawW) / 2;
        const centerShiftY = (cHeight - drawH) / 2;

        const detectionResults = this.detector.detect(video, timestamp);

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
      const flowerCount = this.flowerRenderer.flowers.length;
      const maxFlowers = this.flowerRenderer.maxFlowers;

      if (this.cameraManager.isStreaming) {
        if (classifiedHands.length > 0) {
          const mainHand = classifiedHands[0];
          const mainGesture = mainHand.gestureResult.gesture.toUpperCase().replace('_', ' ');
          const conf = Math.round((mainHand.confidence || 0.9) * 100);

          if (this.detectionPill) {
            this.detectionPill.className = 'glass-pill-badge detected';
            this.detectionPillText.textContent = `🟢 ${classifiedHands.length} Hand (${mainHand.handedness} • ${mainGesture} • ${conf}%)`;
          }
          this.setStatus(`Garden Active • ${flowerCount}/${maxFlowers} Blooms`, 'ready');

          const gKey = mainHand.gestureResult.gesture;
          if (this.gestureCounts[gKey] !== undefined) {
            this.gestureCounts[gKey]++;
          }
        } else {
          if (this.detectionPill) {
            this.detectionPill.className = 'glass-pill-badge searching';
            this.detectionPillText.textContent = '👀 Searching for hands...';
          }
          this.setStatus(`Garden Ready • ${flowerCount}/${maxFlowers} Blooms`, 'ready');
        }
      } else if (this.isDemoMode) {
        if (this.detectionPill) {
          this.detectionPill.className = 'glass-pill-badge searching';
          this.detectionPillText.textContent = `🎨 Interactive Mode (${flowerCount}/${maxFlowers} Blooms)`;
        }
      }

      // 7. Stage 7: Action Dispatcher (Continuous drawing & gesture events)
      if (classifiedHands.length > 0) {
        this.actionDispatcher.process(classifiedHands, timestamp);
      }

      // 8. Stage 8: Real-Time Continuous Floral Trail & Botanical Rendering
      this.flowerRenderer.render();

      // 9. Overlay: Skeleton & Gestural Cursor
      this.skeletonCanvas.getContext('2d').clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
      this.skeletonRenderer.render(classifiedHands, { alwaysDraw: this.actionDispatcher.alwaysDraw });

      // 10. Telemetry & Diagnostics
      const inferenceTime = performance.now() - startTime;
      this.debugOverlay.updateMetrics(inferenceTime);
      this.debugOverlay.updateHands(classifiedHands);

      this.latencyHistory.push(parseFloat(inferenceTime.toFixed(1)));
      if (this.latencyHistory.length > 60) this.latencyHistory.shift();

      this.frameCountSinceFpsUpdate++;
      const now = performance.now();
      if (now - this.lastFpsUpdateTime >= 500) {
        this.currentFps = parseFloat(((this.frameCountSinceFpsUpdate * 1000) / (now - this.lastFpsUpdateTime)).toFixed(1));
        this.frameCountSinceFpsUpdate = 0;
        this.lastFpsUpdateTime = now;

        if (this.analyticsFpsVal) this.analyticsFpsVal.textContent = this.currentFps.toFixed(1);
        if (this.analyticsLatVal) this.analyticsLatVal.textContent = inferenceTime.toFixed(1);
      }

      if (this.activeView === 'analytics') {
        this.renderTelemetryChart();
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }
}

// Instantiate on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new AuraBloomApp();
});
