import RevealOverlay from "./RevealOverlay";
import * as THREE from "three";
import {
  OrbitControls,
  OrthographicCamera,
  useFBO,
  useTexture,
  Effects,
} from "@react-three/drei";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { useControls, folder } from "leva";
import { Suspense, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Village, Tokyo } from "./Models";
import { TensorPass, KuwaharaPass, FinalPass } from "./PostProcessing";

extend({ TensorPass, KuwaharaPass, FinalPass });

const Painting = () => {
  const materialRef = useRef();
  const tensorPassRef = useRef();
  const kuwaharaPassRef = useRef();
  const finalPassRef = useRef();

  const { tensorPass, kuwaharaPass, finalPass, radius, model } = useControls({
    passes: folder({
      tensorPass: { value: true },
      kuwaharaPass: { value: true },
      finalPass: { value: true },
    }),
    radius: { value: 6, min: 1, max: 10, step: 1 },
    model: {
        value: "tokyo",
        options: ["ham village", "tokyo"],
    }
  });

  const paintNormalTexture = useTexture(
    "https://cdn.maximeheckel.com/textures/paint-normal.jpg"
  );
  paintNormalTexture.minFilter = THREE.LinearMipmapLinearFilter;
  paintNormalTexture.magFilter = THREE.LinearFilter;
  paintNormalTexture.generateMipmaps = true;

  const watercolorTexture = useTexture(
    "https://cdn.maximeheckel.com/textures/paper/watercolor.png"
  );
  watercolorTexture.minFilter = THREE.LinearMipmapLinearFilter;
  watercolorTexture.magFilter = THREE.LinearFilter;
  watercolorTexture.generateMipmaps = true;

  const originalSceneTarget = useFBO(
    window.innerWidth * Math.min(window.devicePixelRatio, 2),
    window.innerHeight * Math.min(window.devicePixelRatio, 2)
  );

  useFrame((state) => {
    const { gl, scene, camera } = state;

    if (materialRef.current) {
      materialRef.current.uniforms.uPaintNormalMap.value = paintNormalTexture;
    }

    // Render once to the FBO with all passes disabled (the "clean" pass
    // KuwaharaPass reads back as its originalSceneTarget)...
    tensorPassRef.current.enabled = false;
    kuwaharaPassRef.current.enabled = false;
    finalPassRef.current.enabled = false;
    gl.setRenderTarget(originalSceneTarget);
    gl.render(scene, camera);

    // // ...then render again to the screen with the actual pass toggles applied.
    tensorPassRef.current.enabled = tensorPass;
    kuwaharaPassRef.current.enabled = kuwaharaPass;
    finalPassRef.current.enabled = finalPass;
    gl.setRenderTarget(null);
    // gl.render(scene, camera);

    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* <mesh receiveShadow castShadow>
        <torusKnotGeometry args={[0.5, 0.2, 256, 256]} />
        <Outlines thickness={0.0} transparent />
        <Edges />
      </mesh> */}

      <group scale={0.70}>
        {model === "tokyo" ? <Tokyo /> : <Village />}
      </group>

      <Effects>
        <tensorPass ref={tensorPassRef} />
        <kuwaharaPass
          ref={kuwaharaPassRef}
          args={[
            {
              radius,
              originalSceneTarget: originalSceneTarget,
            },
          ]}
        />
        <finalPass
          ref={finalPassRef}
          args={[
            {
              watercolorTexture: watercolorTexture,
            },
          ]}
        />
      </Effects>
    </>
  );
};

const Paint = () => {
  const overlayRef = useRef(null);

  // Tracked on the wrapping div rather than the Canvas's synthetic events,
  // so coordinates line up with the overlay's own canvas.getBoundingClientRect().
  const downPosRef = useRef(null);
  const downTimeRef = useRef(null);
  const containerRef = useRef(null);

  const handlePointerDown = useCallback((event) => {
    downPosRef.current = { x: event.clientX, y: event.clientY };
    downTimeRef.current = performance.now();
  }, []);

  const handlePointerUp = useCallback((event) => {
    const downPos = downPosRef.current;
    if (!downPos) return;

    const dx = event.clientX - downPos.x;
    const dy = event.clientY - downPos.y;
    const holdDuration = (performance.now() - downTimeRef.current) / 1000;

    downPosRef.current = null;
    downTimeRef.current = null;

    // Same drag-vs-click threshold RevealOverlay used to apply itself —
    // lets OrbitControls' drags pass through without also painting.
    if (Math.sqrt(dx * dx + dy * dy) > 4) return;

    const rect = containerRef.current.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = 1.0 - (event.clientY - rect.top) / rect.height; // flip Y to match shader UV convention

    overlayRef.current?.spawnSplatter(u, v, holdDuration);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100vw", height: "100vh" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas dpr={[1, 2]} style={{ position: "absolute", inset: 0 }}>
        <Suspense fallback="Loading">
          <ambientLight intensity={1.25} />
          <directionalLight position={[-5, 5, 5]} intensity={7} />
          <color attach="background" args={["#3386E0"]} />
          <Painting />
          <OrbitControls />
          <OrthographicCamera
            makeDefault
            position={[5, 0, 10]}
            zoom={200}
            near={0.01}
            far={500}
          />
        </Suspense>
      </Canvas>

      {/* Click-through overlay: paints on top, but pointer events fall through
          to the Canvas above (and OrbitControls attached to it) */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
      >
        <RevealOverlay ref={overlayRef} />
      </div>
    </div>
  );
};

export default Paint;