/**
 * Stage 3: Keypoint Extraction & Coordinate Transforms
 * Normalizes MediaPipe raw landmark coordinates to canvas pixel space,
 * handling mirroring and aspect-ratio scaling for seamless visual alignment.
 */

export const LANDMARK_INDICES = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
};

export const HAND_CONNECTIONS = [
  // Palm base & perimeter
  [0, 1], [1, 2], [2, 5], [5, 9], [9, 13], [13, 17], [17, 0],
  // Thumb
  [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20]
];

export class KeypointExtractor {
  constructor() {}

  /**
   * Transforms raw MediaPipe detection results into structured Hand objects
   * with accurate canvas-space pixel coordinates.
   *
   * @param {Object} detectionResults - Raw MediaPipe output
   * @param {number} canvasWidth - Target canvas width in pixels
   * @param {number} canvasHeight - Target canvas height in pixels
   * @param {boolean} mirrored - Whether coordinate mirroring is active
   * @param {Object} transform - { offsetX, offsetY, drawWidth, drawHeight }
   * @returns {Array<Object>} Array of processed hand objects
   */
  process(detectionResults, canvasWidth, canvasHeight, mirrored = true, transform = null) {
    if (!detectionResults || !detectionResults.landmarks || detectionResults.landmarks.length === 0) {
      return [];
    }

    const hands = [];
    const numDetected = detectionResults.landmarks.length;

    // Viewport transform mapping
    const offsetX = transform ? transform.offsetX : 0;
    const offsetY = transform ? transform.offsetY : 0;
    const drawWidth = transform ? transform.drawWidth : canvasWidth;
    const drawHeight = transform ? transform.drawHeight : canvasHeight;

    const handednessArray = detectionResults.handedness || detectionResults.handednesses || [];

    for (let h = 0; h < numDetected; h++) {
      const rawLandmarks = detectionResults.landmarks[h];
      const handednessData = handednessArray[h] && handednessArray[h][0] ? handednessArray[h][0] : null;

      const rawCategory = handednessData ? (handednessData.categoryName || handednessData.displayName || 'Unknown') : 'Unknown';
      const confidence = handednessData ? (handednessData.score || 0.9) : 0.9;

      // In mirrored user-facing video, left/right label is visually flipped
      const displayName = mirrored
        ? (rawCategory === 'Left' ? 'Right' : rawCategory === 'Right' ? 'Left' : rawCategory)
        : rawCategory;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      const landmarks = rawLandmarks.map((lm, idx) => {
        // Mirrored coordinate mapping with aspect cover transform
        const normX = mirrored ? (1.0 - lm.x) : lm.x;
        const pixelX = offsetX + normX * drawWidth;
        const pixelY = offsetY + lm.y * drawHeight;
        const pixelZ = (lm.z || 0) * drawWidth;

        if (pixelX < minX) minX = pixelX;
        if (pixelY < minY) minY = pixelY;
        if (pixelX > maxX) maxX = pixelX;
        if (pixelY > maxY) maxY = pixelY;

        return {
          id: idx,
          x: pixelX,
          y: pixelY,
          z: pixelZ,
          rawX: lm.x,
          rawY: lm.y,
          rawZ: lm.z || 0
        };
      });

      // Compute palm center (weighted midpoint between Wrist, Index MCP, and Pinky MCP)
      const wrist = landmarks[LANDMARK_INDICES.WRIST];
      const indexMcp = landmarks[LANDMARK_INDICES.INDEX_FINGER_MCP];
      const pinkyMcp = landmarks[LANDMARK_INDICES.PINKY_MCP];
      const palmCenter = {
        x: (wrist.x + indexMcp.x + pinkyMcp.x) / 3,
        y: (wrist.y + indexMcp.y + pinkyMcp.y) / 3,
        z: (wrist.z + indexMcp.z + pinkyMcp.z) / 3
      };

      // Compute hand span / scale (wrist to middle MCP distance in pixels)
      const middleMcp = landmarks[LANDMARK_INDICES.MIDDLE_FINGER_MCP];
      const handScale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);

      hands.push({
        rawIndex: h,
        handedness: displayName,
        rawHandedness: rawCategory,
        confidence,
        landmarks,
        palmCenter,
        handScale: Math.max(handScale, 20),
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        }
      });
    }

    return hands;
  }
}
