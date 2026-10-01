/**
 * Debug Overlay & Telemetry HUD
 * Monitors FPS, inference latency, tracking confidence, and active gestures.
 */

export class DebugOverlay {
  constructor(containerElement) {
    this.container = containerElement;
    this.visible = true;

    // Metrics
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.inferenceLatencyMs = 0;

    this.render();
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.container) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }

  toggle() {
    this.setVisible(!this.visible);
    return this.visible;
  }

  updateMetrics(inferenceTimeMs) {
    this.frameCount++;
    this.inferenceLatencyMs = inferenceTimeMs;

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  updateHands(hands = []) {
    if (!this.visible || !this.container) return;

    const hasHands = hands.length > 0;
    const statusChipColor = hasHands ? 'fps' : 'lat';
    const statusText = hasHands
      ? `<span class="debug-chip fps">🟢 ${hands.length} HAND${hands.length > 1 ? 'S' : ''} TRACKED</span>`
      : `<span class="debug-chip lat" style="background: rgba(251, 191, 36, 0.2); color: #fde68a; border-color: rgba(251, 191, 36, 0.4);">👀 NO HAND DETECTED</span>`;

    let handsHtml = '';
    if (!hasHands) {
      handsHtml = `
        <div class="debug-hand-empty">
          <div style="font-weight: 600; margin-bottom: 4px; color: #cbd5e1;">Camera is scanning for hands...</div>
          <div style="font-size: 11px;">Raise your hand facing the camera to begin.</div>
        </div>
      `;
    } else {
      handsHtml = hands
        .map((hand) => {
          const gesture = hand.gestureResult ? hand.gestureResult.gesture : 'neutral';
          const conf = Math.round((hand.confidence || 0.9) * 100);
          const gestureConf = hand.gestureResult ? Math.round((hand.gestureResult.confidence || 0.9) * 100) : 0;
          const isDraw = gesture === 'pointing' || gesture === 'pinch';

          return `
            <div class="debug-hand-card" style="border-color: ${isDraw ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.3)'}">
              <div class="debug-hand-header">
                <span class="debug-hand-title">✋ ${hand.handedness} Hand (${hand.trackId || 'H'})</span>
                <span class="debug-badge ${gesture}">${gesture.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div class="debug-stat-row">
                <span>Hand Detection:</span>
                <div class="debug-bar-wrap">
                  <div class="debug-bar" style="width: ${conf}%;"></div>
                </div>
                <span>${conf}%</span>
              </div>
              <div class="debug-stat-row">
                <span>Gesture Match:</span>
                <div class="debug-bar-wrap">
                  <div class="debug-bar gesture" style="width: ${gestureConf}%;"></div>
                </div>
                <span>${gestureConf}%</span>
              </div>
              <div class="debug-stat-row">
                <span>Index Pen Speed:</span>
                <span>${Math.round(hand.tipVelocity ? hand.tipVelocity.speed : 0)} px/s</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    this.container.innerHTML = `
      <div class="debug-header">
        <span class="debug-title">HAND TRACKING TELEMETRY</span>
        <div class="debug-chips">
          <span class="debug-chip fps">${this.fps} FPS</span>
          <span class="debug-chip lat">${this.inferenceLatencyMs.toFixed(1)}ms</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 0;">
        ${statusText}
      </div>
      <div class="debug-hands-list">
        ${handsHtml}
      </div>
    `;
  }

  render() {
    if (!this.container) return;
    this.updateHands([]);
  }
}
