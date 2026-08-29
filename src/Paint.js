import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const MAX_DROPLETS = 130;
const GROW_DURATION = 1.0; // seconds for a splatter to fully "land"

// Same shape as createRandomSplatter, but centered on a click point (in UV space, 0-1)
function spawnSplatterCluster(cx, cy, spread) {
  const droplets = [];
  for (let i = 0; i < 4; i++) {
    droplets.push({
      x: cx + (Math.random() * 0.05 - 0.025),
      y: cy + (Math.random() * 0.05 - 0.025),
      r: spread * 0.45
       + Math.random() * spread * 0.22,
    });
  }
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.1 + Math.random() * 0.1;
    droplets.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: spread * 0.1 + Math.random() * spread * 0.05,
    });
  }
  return droplets;
}

const revealVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const revealFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uDroplets[${MAX_DROPLETS}];
  uniform float uRadii[${MAX_DROPLETS}];
  uniform float uSpawnTimes[${MAX_DROPLETS}];
  uniform int uActiveCount;
  uniform float uGooeyness;
  uniform float uThreshold;
  uniform float uGrowDuration;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv;
    float energy = 0.0;

    for (int i = 0; i < uActiveCount; i++) {
      if (i >= uActiveCount) break;

      float age = uTime - uSpawnTimes[i];
      float growth = clamp(age / uGrowDuration, 0.0, 1.0);
      growth = 1.0 - pow(1.0 - growth, 3.0); // ease-out landing

      float r = uRadii[i] * growth;
      float dist = max(0.0001, distance(p, uDroplets[i])); // UV-space distance
      float cutoff = r * 30.0;
      
      float contribution = r / pow(dist, uGooeyness);
      float falloffMask = 1.0 - smoothstep(cutoff * 0.2, cutoff, dist);
      energy += contribution * falloffMask;
    }

    float k = 8.0;
    float alpha = clamp(1.0 - exp(-k * max(0.0, energy - uThreshold)), 0.0, 1.0);

    vec3 paintColor = vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(paintColor, 1.0 - alpha);
  }
`;

function Paint() {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const overlayMaterialRef = useRef(null);

    // Fixed-capacity droplet store, mutated directly (no React state / re-renders)
    const dropletStoreRef = useRef({
        positions: Array.from({ length: MAX_DROPLETS }, () => new THREE.Vector2(0, 0)),
        radii: new Array(MAX_DROPLETS).fill(0),
        spawnTimes: new Array(MAX_DROPLETS).fill(-1),
        count: 0,
    });

    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const clockStart = performance.now();

        // ---- Main scene (unchanged) ----
        const camera = new THREE.PerspectiveCamera(120, width / height, 0.1, 1000);
        camera.position.set(-10, 10, 10);
        cameraRef.current = camera;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x4C4444);

        const axes = new THREE.AxesHelper(25);
        const grid = new THREE.GridHelper(50, 10);
        grid.rotation.x = -Math.PI / 2;

        scene.add(grid);
        scene.add(axes);
        scene.rotation.x = -Math.PI / 2;
        sceneRef.current = scene;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.autoClear = false;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controls.enablePan = true;
        controlsRef.current = controls;

        // ---- Overlay scene: full-screen quad with the splatter shader ----
        const overlayScene = new THREE.Scene();
        const overlayCamera = new THREE.Camera();

        const dropletStore = dropletStoreRef.current;

        const uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(width, height) },
            uDroplets: { value: dropletStore.positions },
            uRadii: { value: dropletStore.radii },
            uSpawnTimes: { value: dropletStore.spawnTimes },
            uActiveCount: { value: 0 },
            uGooeyness: { value: 1.2 },
            uThreshold: { value: 2.5 },
            uGrowDuration: { value: GROW_DURATION },
        };

        const overlayMaterial = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: revealVertexShader,
            fragmentShader: revealFragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        overlayMaterialRef.current = overlayMaterial;

        const quadGeometry = new THREE.BufferGeometry();
        const quadVerts = new Float32Array([
            -1, -1, 0,   1, -1, 0,   1, 1, 0,
            -1, -1, 0,   1, 1, 0,   -1, 1, 0,
        ]);
        const quadUvs = new Float32Array([
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  0, 1,
        ]);
        quadGeometry.setAttribute('position', new THREE.BufferAttribute(quadVerts, 3));
        quadGeometry.setAttribute('uv', new THREE.BufferAttribute(quadUvs, 2));

        const quadMesh = new THREE.Mesh(quadGeometry, overlayMaterial);
        quadMesh.renderOrder = 999;
        quadMesh.raycast = () => null;
        overlayScene.add(quadMesh);

        // ---- Click handling: convert screen click to UV, spawn a splatter cluster ----
        let downPos = null;

        const handlePointerDown = (event) => {
            downPos = { x: event.clientX, y: event.clientY };
        };

        const handlePointerUp = (event) => {
            if (!downPos) return;
            const dx = event.clientX - downPos.x;
            const dy = event.clientY - downPos.y;
            downPos = null;

            // Ignore drags (orbiting) — only treat near-stationary presses as clicks
            if (Math.sqrt(dx * dx + dy * dy) > 4) return;

            const rect = renderer.domElement.getBoundingClientRect();
            const u = (event.clientX - rect.left) / rect.width;
            const v = 1.0 - (event.clientY - rect.top) / rect.height; // flip Y for UV convention

            const cluster = spawnSplatterCluster(u, v, 0.05);
            const now = (performance.now() - clockStart) / 1000;

            for (const d of cluster) {
                if (dropletStore.count >= MAX_DROPLETS) break;
                const idx = dropletStore.count;
                dropletStore.positions[idx].set(d.x, d.y);
                dropletStore.radii[idx] = d.r;
                dropletStore.spawnTimes[idx] = now;
                dropletStore.count++;
            }
        };

        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        renderer.domElement.addEventListener('pointerup', handlePointerUp);

        const handleResize = () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
            uniforms.uResolution.value.set(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Render loop
        let frameId;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            controls.update();

            uniforms.uTime.value = (performance.now() - clockStart) / 1000;
            uniforms.uActiveCount.value = dropletStore.count;

            renderer.clear();
            renderer.render(scene, camera);
            renderer.clearDepth();
            renderer.render(overlayScene, overlayCamera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
            renderer.domElement.removeEventListener('pointerup', handlePointerUp);
            cancelAnimationFrame(frameId);
            controls.dispose();
            quadGeometry.dispose();
            overlayMaterial.dispose();
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                marginTop: '20px',
                position: 'relative',
                overflow: 'hidden'
            }}
        />
    );
}

export default Paint;