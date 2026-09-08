import RevealOverlay from "./RevealOverlay";
import * as THREE from "three";
import {
  OrbitControls,
  OrthographicCamera,
  useFBO,
  useTexture,
  Effects,
} from "@react-three/drei";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useControls, folder } from "leva";
import { Suspense, useRef, useCallback, useEffect } from "react";
import { Computer } from "./Models";
import { MiniKuwaharaPass, TensorPass, KuwaharaPass, FinalPass } from "./PostProcessing";
import { CSS3DScreenController } from "./CSS3DScreen";

extend({ MiniKuwaharaPass, TensorPass, KuwaharaPass, FinalPass });

function getModel(model, onScreenAnchor, hideScreen) {
  if (model === "computer") {
    return <Computer onScreenAnchor={onScreenAnchor} hideScreen={hideScreen} />
  } 
  // else if (model === "village") {
  //   return <Village />
  // } else if (model === "tokyo") {
  //   return <Tokyo />
  // }
}

const Painting = ({ cssContainerRef }) => {
  const materialRef = useRef();
  const miniKuwaharaPassRef = useRef();
  const tensorPassRef = useRef();
  const kuwaharaPassRef = useRef();
  const finalPassRef = useRef();
  const cssControllerRef = useRef(null);
  const screenAnchorRef = useRef(null);
  const { size } = useThree();

  const { miniKuwaharaPass, tensorPass, kuwaharaPass, finalPass, radius, model } = useControls({
    passes: folder({
      miniKuwaharaPass: { value: false },
      tensorPass: { value: false },
      kuwaharaPass: { value: true },
      finalPass: { value: false },
    }),
    radius: { value: 9, min: 1, max: 15, step: 1 },
    model: {
        value: "computer",
        // options: ["computer", "tokyo"],
    }
  });

  const {
    cssScreen,
    cssOffsetX,
    cssOffsetY,
    cssOffsetZ,
    cssRotX,
    cssRotY,
    cssRotZ,
    cssFlipX,
    cssFlipY,
  } = useControls({
    screenOverlay: folder({
      cssScreen: { value: true, label: "enabled" },
      cssOffsetX: { value: 0, min: -0.2, max: 0.2, step: 0.001 },
      cssOffsetY: { value: 0, min: -0.2, max: 0.2, step: 0.001 },
      cssOffsetZ: { value: 0, min: -0.2, max: 0.2, step: 0.001 },
      cssRotX: { value: 0, min: -180, max: 180, step: 1 },
      cssRotY: { value: 0, min: -180, max: 180, step: 1 },
      cssRotZ: { value: 0, min: -180, max: 180, step: 1 },
      cssFlipX: { value: false },
      cssFlipY: { value: false },
    }),
  });

  const handleScreenAnchor = useCallback((anchor) => {
    screenAnchorRef.current = anchor;
  }, []);

  useEffect(() => {
    if (!cssControllerRef.current) {
      cssControllerRef.current = new CSS3DScreenController({ src: "/im_map_flat" });
    }
    const controller = cssControllerRef.current;
    const container = cssContainerRef.current;
    if (container) controller.mount(container);
    return () => {
      if (container) controller.unmount(container);
    };
  }, [cssContainerRef]);

  useEffect(() => {
    cssControllerRef.current?.setSize(size.width, size.height);
  }, [size]);

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
    miniKuwaharaPassRef.current.enabled = false;
    tensorPassRef.current.enabled = false;
    kuwaharaPassRef.current.enabled = false;
    finalPassRef.current.enabled = false;
    gl.setRenderTarget(originalSceneTarget);
    gl.render(scene, camera);

    // // ...then render again to the screen with the actual pass toggles applied.
    miniKuwaharaPassRef.current.enabled = miniKuwaharaPass;
    tensorPassRef.current.enabled = tensorPass;
    kuwaharaPassRef.current.enabled = kuwaharaPass;
    finalPassRef.current.enabled = finalPass;
    gl.setRenderTarget(null);
    // gl.render(scene, camera);

    camera.lookAt(0, 0, 0);

    const cssController = cssControllerRef.current;
    const screenAnchor = screenAnchorRef.current;
    if (cssController && model === "computer" && screenAnchor) {
      cssController.setVisible(cssScreen);
      if (cssScreen) {
        cssController.syncToAnchor(screenAnchor, {
          offset: { x: cssOffsetX, y: cssOffsetY, z: cssOffsetZ },
          rotationOffset: {
            x: (cssRotX * Math.PI) / 180,
            y: (cssRotY * Math.PI) / 180,
            z: (cssRotZ * Math.PI) / 180,
          },
          flipX: cssFlipX,
          flipY: cssFlipY,
        });
        cssController.render(camera);
      }
    } else if (cssController) {
      cssController.setVisible(false);
    }
  });

  return (
    <>
      <group
        scale={1.0}
        rotation={[0, -95*Math.PI/180, 7*Math.PI/180]}
      >
        {getModel(model, handleScreenAnchor, cssScreen)}
      </group>

      <Effects>
        <miniKuwaharaPass 
          ref={miniKuwaharaPassRef}
          args={[
            {
              radius,
              originalSceneTarget: originalSceneTarget,
            },
          ]}
        />
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
  const cssContainerRef = useRef(null);

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
      <Canvas dpr={[1, 2]} style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Suspense fallback="Loading">
          <ambientLight intensity={1.0} />
          <directionalLight position={[-5, 5, 5]} intensity={4} />
          <color attach="background" args={["#55737a"]} />
          <Painting cssContainerRef={cssContainerRef} />
          <OrbitControls />
          <OrthographicCamera
            makeDefault
            position={[0, 0, 10]}
            zoom={300}
            near={0.01}
            far={1000}
          />
        </Suspense>
      </Canvas>

      {/* Houses the CSS3DRenderer's DOM output (the "Screen" mesh's iframe
          overlay). It sits above the Canvas so the iframe is visible without
          punching a transparency hole through the WebGL/postprocessing
          pipeline; only the iframe itself takes pointer events (set in
          CSS3DScreenController) so drags elsewhere still reach OrbitControls. */}
      <div
        ref={cssContainerRef}
        style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "hidden", pointerEvents: "none" }}
      />

      {/* Click-through overlay: paints on top, but pointer events fall through
          to the Canvas above (and OrbitControls attached to it) */}
      {/* <div
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
      >
        <RevealOverlay ref={overlayRef} />
      </div> */}
    </div>
  );
};

export default Paint;