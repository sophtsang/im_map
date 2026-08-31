import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

const MAX_DROPLETS = 130;
const GROW_DURATION = 1.5; // seconds for a splatter to fully "land"

function spawnSplatterCluster(cx, cy, spread, clockStart, multiplier = 1.0) {
  const droplets = [];
  const scale = Math.max(1.0, 0.75 * multiplier);
  for (let i = 0; i < 4; i++) {
    droplets.push({
      x: cx + (Math.random() * 0.05 - 0.025) * scale,
      y: cy + (Math.random() * 0.05 - 0.025) * scale,
      r: (spread * 0.45
       + Math.random() * spread * 0.22) * multiplier,
    });
  }
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.1 + Math.random() * 0.1 * scale;
    droplets.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: (spread * 0.1 + Math.random() * spread * 0.05),
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
  uniform float uProgress;
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

      float timeGrowth = clamp(age / uGrowDuration, 0.0, 1.0);
      timeGrowth = 1.0 - pow(1.0 - timeGrowth, 4.0);

      float growth = timeGrowth;

      float r = uRadii[i] * growth;
      float dist = max(0.0001, distance(p, uDroplets[i])); // UV-space distance
      float cutoff = r * 20.0;
      if (dist > cutoff) continue;

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

// ---------------------------------------------------------------------------
// Manual progress scrollbar
// ---------------------------------------------------------------------------
function ProgressScrollbar({ progressRef, onChange }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [thumbPct, setThumbPct] = useState(0);

  const setFromClientY = useCallback((clientY) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const raw = (clientY - rect.top) / rect.height;
    const clamped = Math.min(1, Math.max(0, raw));
    progressRef.current = clamped;
    onChange(clamped);
    setThumbPct(clamped * 100);
  }, [onChange, progressRef]);

  useEffect(() => {
    setThumbPct(progressRef.current * 100);
  }, [progressRef]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setFromClientY(clientY);
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [setFromClientY]);

  const handleTrackPointerDown = (e) => {
    draggingRef.current = true;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setFromClientY(clientY);
  };

  return (
    <div
      ref={trackRef}
      onMouseDown={handleTrackPointerDown}
      onTouchStart={handleTrackPointerDown}
      style={{
        position: 'absolute',
        top: '50%',
        right: '18px',
        transform: 'translateY(-50%)',
        width: '10px',
        height: '260px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.25)',
        cursor: 'pointer',
        zIndex: 20,
        touchAction: 'none',
        pointerEvents: 'auto', // the overlay wrapper is click-through; opt this back in
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${thumbPct}%`,
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.35)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${thumbPct}%`,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

const RevealOverlay = forwardRef(function RevealOverlay(props, ref) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const overlayMaterialRef = useRef(null);
    const progressRef = useRef(0);
    const lastTimestampRef = useRef(0);
    const pauseAccumRef = useRef(0);

    // Populated inside the effect; spawnSplatter (exposed via ref) reads from here
    // so callers (e.g. the R3F Canvas's own pointer handlers) can trigger a splatter
    // without needing to know about the droplet store or clock internals.
    const spawnFnRef = useRef(() => {});

    const dropletStoreRef = useRef({
        positions: Array.from({ length: MAX_DROPLETS }, () => new THREE.Vector2(0, 0)),
        radii: new Array(MAX_DROPLETS).fill(0),
        spawnTimes: new Array(MAX_DROPLETS).fill(-1),
        count: 0,
    });

    const handleManualProgress = useCallback((value) => {
        if (overlayMaterialRef.current) {
            overlayMaterialRef.current.uniforms.uProgress.value = value;
        }
    }, []);

    // Exposes spawnSplatter(u, v, holdDuration) — u/v are 0-1 UV coords
    // (v=0 at bottom, matching the shader's convention), holdDuration in seconds.
    useImperativeHandle(ref, () => ({
        spawnSplatter: (u, v, holdDuration = 0) => {
            spawnFnRef.current(u, v, holdDuration);
        },
    }), []);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // Size off the container's own box, not the window — this is what
        // lets the overlay match the R3F <Canvas> it sits on top of.
        const initialRect = container.getBoundingClientRect();
        let width = Math.max(1, Math.round(initialRect.width));
        let height = Math.max(1, Math.round(initialRect.height));
        const clockStart = performance.now();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setClearAlpha(0); // so untouched areas stay fully transparent
        renderer.autoClear = false;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.inset = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.pointerEvents = 'none';

        const overlayScene = new THREE.Scene();
        const overlayCamera = new THREE.Camera();

        const dropletStore = dropletStoreRef.current;

        const uniforms = {
            uTime: { value: 0 },
            uProgress: { value: 1.0 },
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

        const compressedNow = (realElapsed) => {
            return Math.min(realElapsed - pauseAccumRef.current, lastTimestampRef.current);
        };

        // ---- Splatter spawning, driven externally via the exposed ref ----
        // The overlay itself is pointer-events: none (so drags reach OrbitControls
        // on the R3F canvas underneath); the parent wires its own pointerdown/up
        // on the R3F <Canvas> and calls ref.current.spawnSplatter(u, v, holdDuration).
        spawnFnRef.current = (u, v, holdDuration) => {
            const multiplier = Math.min(1.5, 1.0 + holdDuration);
            const cluster = spawnSplatterCluster(u, v, 0.05, clockStart, multiplier);

            const realElapsed = (performance.now() - clockStart) / 1000;
            const spawnTime = compressedNow(realElapsed);

            pauseAccumRef.current += (realElapsed - pauseAccumRef.current) - spawnTime;
            lastTimestampRef.current = spawnTime + GROW_DURATION;

            for (const d of cluster) {
                if (dropletStore.count >= MAX_DROPLETS) break;
                const idx = dropletStore.count;
                dropletStore.positions[idx].set(d.x, d.y);
                dropletStore.radii[idx] = d.r;
                dropletStore.spawnTimes[idx] = spawnTime;
                dropletStore.count++;
            }
        };

        const handleScroll = () => {
            const maxScroll =
                document.documentElement.scrollHeight - window.innerHeight;

            const progress =
                maxScroll > 0
                    ? window.scrollY / maxScroll
                    : 0;

            const clamped = Math.min(1, Math.max(0, progress));
            uniforms.uProgress.value = clamped;
            progressRef.current = clamped;
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        // Resize off the container's own box via ResizeObserver, not window resize.
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            const newWidth = Math.max(1, Math.round(entry.contentRect.width));
            const newHeight = Math.max(1, Math.round(entry.contentRect.height));
            width = newWidth;
            height = newHeight;
            renderer.setSize(newWidth, newHeight);
            uniforms.uResolution.value.set(newWidth, newHeight);
        });
        resizeObserver.observe(container);

        // Render loop
        let frameId;
        const animate = () => {
            frameId = requestAnimationFrame(animate);

            const realElapsed = (performance.now() - clockStart) / 1000;
            uniforms.uTime.value = (1.0 - uniforms.uProgress.value) * compressedNow(realElapsed);
            uniforms.uActiveCount.value = dropletStore.count;

            renderer.clear();
            renderer.clearDepth();
            renderer.render(overlayScene, overlayCamera);
        };
        animate();

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(frameId);
            quadGeometry.dispose();
            overlayMaterial.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none', // click-through so orbit/pan drags reach the R3F canvas beneath
            }}
        >
            <ProgressScrollbar progressRef={progressRef} onChange={handleManualProgress} />
        </div>
    );
});

export default RevealOverlay;
