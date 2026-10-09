/**
 * Hologram 3D Engine (Three.js WebGL)
 * Inspired by threejs-handtracking-101 and 3D-editor
 * 
 * Features:
 * - 3D Wireframe / Shaded Holograms (Quantum Cube, Icosahedron Gem, DNA Helix, Torus Knot)
 * - Real-time spatial manipulation with natural hand tracking:
 *   - Palm Hover: 3D object follows palm position in 3D space smoothly
 *   - Pinch & Grab: Locks 3D object to pinch point and scales by hand span
 *   - Hand Tilt / Roll: Rotates 3D object with physical hand angle
 *   - Two-Hand Span: Distance between both hands zooms / scales the hologram
 *   - Mouse / Touch fallback: Drag to rotate/move, wheel to zoom
 */

import * as THREE from 'three';

export const HOLOGRAM_MODELS = {
  gem: 'Quantum Diamond',
  cube: 'Hypercube Matrix',
  dna: 'DNA Double Helix',
  torus: 'Cyber Torus'
};

export class Hologram3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.activeModel = 'gem';
    this.pointerPos = null;

    // Three.js Core Components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, (window.innerWidth || 800) / (window.innerHeight || 600), 0.1, 1000);
    this.camera.position.z = 6.5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth || 800, window.innerHeight || 600);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 3.0);
    dirLight1.position.set(5, 5, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 2.5);
    dirLight2.position.set(-5, -5, 3);
    this.scene.add(dirLight2);

    // Hologram Object Root Group
    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    // Manipulation State
    this.isGrabbing = false;
    this.scaleTarget = 1.3;
    this.rotVelocity = new THREE.Vector3(0.006, 0.009, 0.002);

    this.buildModel(this.activeModel);
  }

  resize(w, h) {
    if (this.camera && this.renderer) {
      this.camera.aspect = (w || window.innerWidth) / (h || window.innerHeight);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w || window.innerWidth, h || window.innerHeight);
    }
  }

  setPointer(point) {
    this.pointerPos = point;
  }

  setModel(type) {
    if (HOLOGRAM_MODELS[type]) {
      this.activeModel = type;
      this.buildModel(type);
    }
  }

  buildModel(type) {
    // Clear previous mesh
    while (this.objectGroup.children.length > 0) {
      const obj = this.objectGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
      this.objectGroup.remove(obj);
    }

    const holoMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.8,
      transmission: 0.6,
      opacity: 0.9,
      transparent: true,
      wireframe: false
    });

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    if (type === 'gem') {
      const geom = new THREE.IcosahedronGeometry(1.5, 0);
      const mesh = new THREE.Mesh(geom, holoMaterial);
      const wire = new THREE.Mesh(geom, wireframeMat);
      this.objectGroup.add(mesh);
      this.objectGroup.add(wire);
    } else if (type === 'cube') {
      const geom = new THREE.BoxGeometry(1.7, 1.7, 1.7);
      const mesh = new THREE.Mesh(geom, holoMaterial);
      const wire = new THREE.Mesh(geom, wireframeMat);
      this.objectGroup.add(mesh);
      this.objectGroup.add(wire);
    } else if (type === 'torus') {
      const geom = new THREE.TorusKnotGeometry(1.1, 0.38, 100, 16);
      const mesh = new THREE.Mesh(geom, holoMaterial);
      const wire = new THREE.Mesh(geom, wireframeMat);
      this.objectGroup.add(mesh);
      this.objectGroup.add(wire);
    } else if (type === 'dna') {
      const helixGroup = new THREE.Group();
      const rungs = 26;
      for (let i = 0; i < rungs; i++) {
        const y = (i - rungs / 2) * 0.16;
        const a = i * 0.42;
        const x1 = Math.cos(a) * 0.85;
        const z1 = Math.sin(a) * 0.85;
        const x2 = -x1;
        const z2 = -z1;

        const spGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const sp1 = new THREE.Mesh(spGeom, holoMaterial);
        sp1.position.set(x1, y, z1);
        const sp2 = new THREE.Mesh(spGeom, holoMaterial);
        sp2.position.set(x2, y, z2);

        const cylGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6);
        const cyl = new THREE.Mesh(cylGeom, wireframeMat);
        cyl.position.set(0, y, 0);
        cyl.rotation.z = Math.PI / 2;
        cyl.rotation.y = -a;

        helixGroup.add(sp1);
        helixGroup.add(sp2);
        helixGroup.add(cyl);
      }
      this.objectGroup.add(helixGroup);
    }
  }

  resize(w, h) {
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(gestureResult, timestamp = performance.now()) {
    const primaryHand = gestureResult?.primaryHand;
    const hands = gestureResult?.hands || [];

    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;

    if (primaryHand && (primaryHand.palmCenter || primaryHand.indexTip)) {
      const targetPoint = primaryHand.palmCenter || primaryHand.indexTip;

      // Map screen coords (0 -> canvasWidth, 0 -> canvasHeight) to 3D Three.js space
      const normX = (targetPoint.x / w) * 2 - 1;
      const normY = -(targetPoint.y / h) * 2 + 1;

      const target3DX = normX * 3.4;
      const target3DY = normY * 2.3;

      const isPinching = primaryHand.isPinching || (primaryHand.pinchData && primaryHand.pinchData.isTightPinch);

      if (isPinching) {
        this.isGrabbing = true;
        // Follow hand tightly
        this.objectGroup.position.x += (target3DX - this.objectGroup.position.x) * 0.35;
        this.objectGroup.position.y += (target3DY - this.objectGroup.position.y) * 0.35;

        // Hand roll rotation
        if (primaryHand.rotation && primaryHand.rotation.angleRad !== undefined) {
          this.objectGroup.rotation.z += (primaryHand.rotation.angleRad - this.objectGroup.rotation.z) * 0.2;
        }

        // Scale by hand span or two-hand span
        let targetScale = Math.max(0.7, Math.min(2.8, (primaryHand.handScale || 60) / 45));
        if (hands.length >= 2 && hands[0].palmCenter && hands[1].palmCenter) {
          const twoHandDist = Math.hypot(hands[0].palmCenter.x - hands[1].palmCenter.x, hands[0].palmCenter.y - hands[1].palmCenter.y);
          targetScale = Math.max(0.6, Math.min(3.2, twoHandDist / 180));
        }

        this.scaleTarget += (targetScale - this.scaleTarget) * 0.15;
        this.objectGroup.scale.set(this.scaleTarget, this.scaleTarget, this.scaleTarget);
      } else {
        this.isGrabbing = false;
        // Smoothly follow hand hovering in space
        this.objectGroup.position.x += (target3DX - this.objectGroup.position.x) * 0.15;
        this.objectGroup.position.y += (target3DY - this.objectGroup.position.y) * 0.15;

        // Gentle idle rotation
        this.objectGroup.rotation.x += this.rotVelocity.x;
        this.objectGroup.rotation.y += this.rotVelocity.y;

        const defaultScale = 1.35;
        this.scaleTarget += (defaultScale - this.scaleTarget) * 0.1;
        this.objectGroup.scale.set(this.scaleTarget, this.scaleTarget, this.scaleTarget);
      }
    } else if (this.pointerPos) {
      // Follow mouse cursor
      const normX = (this.pointerPos.x / w) * 2 - 1;
      const normY = -(this.pointerPos.y / h) * 2 + 1;
      this.objectGroup.position.x += (normX * 3.4 - this.objectGroup.position.x) * 0.2;
      this.objectGroup.position.y += (normY * 2.3 - this.objectGroup.position.y) * 0.2;
      this.objectGroup.rotation.x += 0.01;
      this.objectGroup.rotation.y += 0.015;
    } else {
      // Idle animation when no hand is in view
      this.objectGroup.position.x += (0 - this.objectGroup.position.x) * 0.05;
      this.objectGroup.position.y += (0 - this.objectGroup.position.y) * 0.05;
      this.objectGroup.rotation.x += 0.008;
      this.objectGroup.rotation.y += 0.012;
      this.objectGroup.scale.set(1.3, 1.3, 1.3);
    }

    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    if (this.renderer) {
      this.renderer.clear();
    }
  }

  dispose() {
    this.renderer?.dispose();
  }
}
