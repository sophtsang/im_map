import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

const VILLAGE_MODEL_URL = `${process.env.PUBLIC_URL}/models/ham/scene.gltf`;
const TOKYO_MODEL_URL = `${process.env.PUBLIC_URL}/models/tokyo/scene.gltf`;
const COMPUTER_MODEL_URL = `${process.env.PUBLIC_URL}/models/computer/screen.gltf`;

export function Village(props) {
  const { scene } = useGLTF(VILLAGE_MODEL_URL);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} {...props} />;
}

export function Tokyo(props) {
  const { scene } = useGLTF(TOKYO_MODEL_URL);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} {...props} />;
}

export function Computer(props) {
  const { scene } = useGLTF(COMPUTER_MODEL_URL);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === "Cube") {
          child.visible = false;
          return;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} {...props} />;
}

useGLTF.preload(VILLAGE_MODEL_URL);
useGLTF.preload(TOKYO_MODEL_URL);
useGLTF.preload(COMPUTER_MODEL_URL);