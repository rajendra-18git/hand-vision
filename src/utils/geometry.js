/**
 * Vector and geometric calculation utilities for landmark analysis and curve interpolation
 */

export function dist2D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

export function dist3D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.hypot(dx, dy, dz);
}

export function midpoint(p1, p2) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: ((p1.z || 0) + (p2.z || 0)) / 2
  };
}

/**
 * Calculates the angle (in degrees) at joint B formed by points A, B, and C
 */
export function angleBetweenPoints(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (c.z || 0) };

  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.hypot(ab.x, ab.y, ab.z);
  const magCB = Math.hypot(cb.x, cb.y, cb.z);

  if (magAB === 0 || magCB === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Returns a smooth Catmull-Rom interpolated point given 4 control points and t in [0, 1]
 */
export function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3
  };
}

/**
 * Calculates CSS object-fit: cover draw dimensions and offsets for exact canvas alignment
 */
export function getCoverTransform(videoWidth, videoHeight, containerWidth, containerHeight) {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return { offsetX: 0, offsetY: 0, drawWidth: containerWidth, drawHeight: containerHeight };
  }
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;
  let drawWidth, drawHeight, offsetX, offsetY;

  if (containerAspect > videoAspect) {
    // Container is wider than video: fit width, crop height
    drawWidth = containerWidth;
    drawHeight = containerWidth / videoAspect;
    offsetX = 0;
    offsetY = (containerHeight - drawHeight) / 2;
  } else {
    // Container is taller than video: fit height, crop width
    drawHeight = containerHeight;
    drawWidth = containerHeight * videoAspect;
    offsetX = (containerWidth - drawWidth) / 2;
    offsetY = 0;
  }

  return { offsetX, offsetY, drawWidth, drawHeight };
}

