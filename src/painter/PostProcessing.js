import { Pass, FullScreenQuad } from "three-stdlib";
import * as THREE from "three";
import tensorFragmentShader from "../shaders/tensorFragmentShader.js";
import kuwaharaFragmentShader from "../shaders/kuwaharaFragmentShader.js";
import finalFragmentShader from "../shaders/finalFragmentShader.js";
import miniKuwaharaFragmentShader from "../shaders/miniKuwaharaFragmentShader.js";

const miniKuwaharaShader = {
  uniforms: {
    inputBuffer: { value: null },
    resolution: {
      value: new THREE.Vector4(),
    },
    originalTexture: { value: null },
    radius: { value: 15.0 },
  },
  vertexShader: `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // FullScreenQuad's geometry is already in clip space, so skip the
    // model/view/projection transform used for scene geometry.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
  `,
  fragmentShader: miniKuwaharaFragmentShader,
};

class MiniKuwaharaPass extends Pass {
  constructor(args) {
    super();

    this.material = new THREE.ShaderMaterial(miniKuwaharaShader);
    this.fsQuad = new FullScreenQuad(this.material);
    this.resolution = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.radius = args.radius;
    this.originalSceneTarget = args.originalSceneTarget;
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  // assuming that readBuffer is the image
  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.resolution.value = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.material.uniforms.inputBuffer.value = readBuffer.texture;
    this.material.uniforms.originalTexture.value = this.originalSceneTarget.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }
}

const tensorShader = {
  uniforms: {
    inputBuffer: { value: null },
    resolution: {
      value: new THREE.Vector4(),
    },
  },
  vertexShader: `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // FullScreenQuad's geometry is already in clip space, so skip the
    // model/view/projection transform used for scene geometry.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
  `,
  fragmentShader: tensorFragmentShader,
};

class TensorPass extends Pass {
  constructor(args) {
    super();

    this.material = new THREE.ShaderMaterial(tensorShader);
    this.fsQuad = new FullScreenQuad(this.material);
    this.resolution = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  // assuming that readBuffer is the image
  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.inputBuffer.value = readBuffer.texture;
    this.material.uniforms.resolution.value = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }
}

const kuwaharaShader = {
  uniforms: {
    inputBuffer: { value: null },
    resolution: {
      value: new THREE.Vector4(),
    },
    originalTexture: { value: null },
    radius: { value: 10.0 },
  },
  vertexShader: `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // FullScreenQuad's geometry is already in clip space, so skip the
    // model/view/projection transform used for scene geometry.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
  `,
  fragmentShader: kuwaharaFragmentShader,
};

class KuwaharaPass extends Pass {
  constructor(args) {
    super();

    this.material = new THREE.ShaderMaterial(kuwaharaShader);
    this.fsQuad = new FullScreenQuad(this.material);
    this.resolution = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.radius = args.radius;
    this.originalSceneTarget = args.originalSceneTarget;
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.resolution.value = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.material.uniforms.radius.value = this.radius;
    this.material.uniforms.inputBuffer.value = readBuffer.texture;
    this.material.uniforms.originalTexture.value = this.originalSceneTarget.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }
}

const finalShader = {
  uniforms: {
    inputBuffer: { value: null },
    resolution: {
      value: new THREE.Vector4(),
    },
    watercolorTexture: { value: null },
  },
  vertexShader: `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // FullScreenQuad's geometry is already in clip space, so skip the
    // model/view/projection transform used for scene geometry.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
  `,
  fragmentShader: finalFragmentShader,
};

class FinalPass extends Pass {
  constructor(args) {
    super();

    this.material = new THREE.ShaderMaterial(finalShader);
    this.fsQuad = new FullScreenQuad(this.material);
    this.material.uniforms.resolution.value = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );
    this.resolution = new THREE.Vector4(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      1 / (window.innerWidth * Math.min(window.devicePixelRatio, 2)),
      1 / (window.innerHeight * Math.min(window.devicePixelRatio, 2))
    );

    // Add the watercolor texture to the uniforms
    this.material.uniforms.watercolorTexture = {
      value: args.watercolorTexture,
    };
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }

  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.inputBuffer.value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }
}

export { MiniKuwaharaPass, TensorPass, KuwaharaPass, FinalPass };

