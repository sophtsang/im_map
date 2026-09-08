import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// Analytically derived from public/models/computer/screen.gltf: the "Screen"
// node's glass-front primitive (the only transparent, alpha-blended
// material on that node) is a thin box in its own local space where Y is
// the (~1.5cm) depth/normal axis, X is the horizontal extent, and Z is the
// vertical extent. Height is negated so the iframe's local +Y (up) points
// the same way "up" reads in the model's local space.
const WIDTH_AXIS = new THREE.Vector3(1, 0, 0);
const HEIGHT_AXIS = new THREE.Vector3(0, 0, -1);
const NORMAL_AXIS = new THREE.Vector3(0, 1, 0);

const ANCHOR_NAME = "ScreenCSSAnchor";

// The gltf splits "Screen" into three primitives (glass + two bezel-color
// shells) that don't share vertex buffers, so GLTFLoader emits them as
// separate sibling meshes rather than one multi-material mesh. The glass
// primitive is the only one with alphaMode BLEND (material.transparent),
// which is a stable runtime signal for finding it without hardcoding a
// child index that could shift if the model is re-exported.
export function findScreenGlassMesh(scene) {
  const screenNode = scene.getObjectByName("Screen");
  if (!screenNode) return null;

  if (screenNode.isMesh) {
    return screenNode.material?.transparent ? screenNode : null;
  }

  let glass = null;
  screenNode.traverse((child) => {
    if (child.isMesh && child.material && child.material.transparent) {
      glass = child;
    }
  });
  return glass;
}

// Adds (or reuses) an invisible Object3D anchored to the glass mesh's own
// bounding box, oriented so its local basis is (width, height, normal).
// Because it's a real child in the scene graph, its matrixWorld tracks the
// mesh automatically, including the outer group transform/OrbitControls.
export function computeScreenAnchor(mesh) {
  const existing = mesh.getObjectByName(ANCHOR_NAME);
  if (existing) return existing;

  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);

  const posAttr = geometry.attributes.position;
  const v = new THREE.Vector3();
  let minW = Infinity, maxW = -Infinity, minH = Infinity, maxH = -Infinity;
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i).sub(center);
    const w = v.dot(WIDTH_AXIS);
    const h = v.dot(HEIGHT_AXIS);
    if (w < minW) minW = w;
    if (w > maxW) maxW = w;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }

  const anchor = new THREE.Object3D();
  anchor.name = ANCHOR_NAME;
  anchor.position.copy(center);
  const basis = new THREE.Matrix4().makeBasis(WIDTH_AXIS, HEIGHT_AXIS, NORMAL_AXIS);
  anchor.quaternion.setFromRotationMatrix(basis);
  anchor.userData.width = maxW - minW;
  anchor.userData.height = maxH - minH;
  mesh.add(anchor);
  return anchor;
}

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _offsetQuat = new THREE.Quaternion();
const _worldOffset = new THREE.Vector3();

// Owns the second (CSS3D) renderer that sits alongside the WebGL <Canvas>
// and projects an iframe of the 2D site onto the "Screen" mesh's world
// transform every frame, using the same camera as the WebGL scene.
export class CSS3DScreenController {
  constructor({ src, pixelWidth = 1024, pixelHeight = 720 }) {
    this.pixelWidth = pixelWidth;
    this.pixelHeight = pixelHeight;

    this.renderer = new CSS3DRenderer();
    Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
    });

    this.scene = new THREE.Scene();

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "im_map";
    iframe.style.width = `${pixelWidth}px`;
    iframe.style.height = `${pixelHeight}px`;
    iframe.style.border = "0";
    iframe.style.pointerEvents = "auto";
    iframe.style.backfaceVisibility = "hidden";
    iframe.style.WebkitBackfaceVisibility = "hidden";
    this.iframe = iframe;

    this.object = new CSS3DObject(iframe);
    this.scene.add(this.object);
  }

  mount(container) {
    if (this.renderer.domElement.parentNode !== container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  unmount(container) {
    if (this.renderer.domElement.parentNode === container) {
      container.removeChild(this.renderer.domElement);
    }
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }

  setVisible(visible) {
    this.object.visible = visible;
  }

  // offset: {x,y,z} in the anchor's local units, applied after rotation.
  // rotationOffset: {x,y,z} radians, for nudging orientation to taste.
  syncToAnchor(anchor, { offset, rotationOffset, flipX, flipY } = {}) {
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_position, _quaternion, _scale);

    this.object.position.copy(_position);
    this.object.quaternion.copy(_quaternion);

    if (rotationOffset) {
      _euler.set(rotationOffset.x || 0, rotationOffset.y || 0, rotationOffset.z || 0);
      _offsetQuat.setFromEuler(_euler);
      this.object.quaternion.multiply(_offsetQuat);
    }

    if (offset) {
      _worldOffset.set(offset.x || 0, offset.y || 0, offset.z || 0);
      _worldOffset.applyQuaternion(this.object.quaternion);
      this.object.position.add(_worldOffset);
    }

    const worldWidth = anchor.userData.width * _scale.x;
    const worldHeight = anchor.userData.height * _scale.y;
    this.object.scale.set(
      (worldWidth / this.pixelWidth) * (flipX ? -1 : 1),
      (worldHeight / this.pixelHeight) * (flipY ? -1 : 1),
      1
    );
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.iframe.remove();
  }
}