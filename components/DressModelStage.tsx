"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Material, Mesh, Object3D, Texture, WebGLRenderer } from "three";

const DRESS_MODEL_URL = "/models/dress/red_cross-halter_dress.optimized.glb";

const DRESS_COLOR_OPTIONS = [
  { name: "Ruby", value: "#b1122c" },
  { name: "Wine", value: "#5f1234" },
  { name: "Emerald", value: "#087252" },
  { name: "Midnight", value: "#101522" },
  { name: "Champagne", value: "#d9b46f" },
] as const;

type ColorableMaterial = Material & {
  color?: {
    set: (color: string) => void;
  };
  map?: Texture | null;
  metalness?: number;
  roughness?: number;
};

function isMesh(object: Object3D): object is Mesh {
  return "isMesh" in object && object.isMesh === true;
}

function isDressMaterial(material: Material) {
  return material.name.startsWith("1_front");
}

function isColorableMaterial(material: Material): material is ColorableMaterial {
  return (
    "color" in material &&
    typeof (material as ColorableMaterial).color?.set === "function"
  );
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  Object.values(material).forEach((value) => {
    if (value && typeof value === "object" && "isTexture" in value) {
      (value as Texture).dispose();
    }
  });
  material.dispose();
}

export default function DressModelStage({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Object3D | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const dressMaterialsRef = useRef<ColorableMaterial[]>([]);
  const activeDressColorRef = useRef<string>(DRESS_COLOR_OPTIONS[0].value);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    baseX: 0,
    baseY: 0,
    pointerX: 0,
    pointerY: 0,
  });
  const pausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeDressColor, setActiveDressColor] = useState<string>(
    DRESS_COLOR_OPTIONS[0].value,
  );

  const applyDressColor = useCallback((color: string) => {
    activeDressColorRef.current = color;
    dressMaterialsRef.current.forEach((material) => {
      material.color?.set(color);
      material.needsUpdate = true;
    });
  }, []);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    applyDressColor(activeDressColor);
  }, [activeDressColor, applyDressColor]);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let cleanupScene: (() => void) | undefined;

    async function initScene() {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x080808, 0.08);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.42, 5.35);
      let cameraBaseY = 0.42;
      let cameraTargetX = 0.74;
      let cameraTargetY = 0.08;
      let modelBaseY = -0.5;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      rendererRef.current = renderer;
      mount.appendChild(renderer.domElement);

      const modelRoot = new THREE.Group();
      modelRoot.position.set(1.05, modelBaseY, 0);
      scene.add(modelRoot);

      const stageRoot = new THREE.Group();
      stageRoot.position.set(1.05, -0.94, 0);
      scene.add(stageRoot);

      const ambientLight = new THREE.HemisphereLight(0xfff2d0, 0x21101a, 1.7);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffdc9d, 3.2);
      keyLight.position.set(-3.2, 4.2, 4.8);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x7bd0c1, 2.25);
      rimLight.position.set(3.8, 3.2, -2.5);
      scene.add(rimLight);

      const runwayMaterial = new THREE.MeshBasicMaterial({
        color: 0xcaaa70,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      [1.15, 1.72, 2.35].forEach((radius, index) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius, radius + 0.012, 160),
          runwayMaterial.clone(),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.02 - index * 0.006;
        ring.scale.z = 0.42;
        stageRoot.add(ring);
      });

      const rayMaterial = new THREE.MeshBasicMaterial({
        color: 0xe6cb98,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      for (let index = 0; index < 10; index += 1) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 2.8), rayMaterial);
        ray.rotation.x = -Math.PI / 2;
        ray.rotation.z = (index / 10) * Math.PI * 2;
        ray.position.y = -0.015;
        stageRoot.add(ray);
      }

      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 160;
      const particlePositions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.4 + Math.random() * 3.8;
        particlePositions[index * 3] = Math.cos(angle) * radius + 0.85;
        particlePositions[index * 3 + 1] = -0.4 + Math.random() * 4.4;
        particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 1.3;
      }
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(particlePositions, 3),
      );
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({
          color: 0xf3d18b,
          size: 0.018,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        }),
      );
      scene.add(particles);

      const resize = () => {
        if (!mount.isConnected) return;
        const { width, height } = mount.getBoundingClientRect();
        const isMobile = width < 700;
        const modelX = isMobile ? 0.22 : 1.05;

        modelBaseY = isMobile ? -0.04 : -0.46;
        cameraBaseY = isMobile ? 0.34 : 0.52;
        cameraTargetX = isMobile ? 0.22 : 0.74;
        cameraTargetY = isMobile ? 0.18 : 0.16;
        camera.position.z = isMobile ? 5.8 : 5.45;
        modelRoot.position.x = modelX;
        modelRoot.scale.setScalar(isMobile ? 0.92 : 1);
        stageRoot.position.x = modelX;
        stageRoot.position.y = isMobile ? -0.62 : -0.92;

        camera.aspect = Math.max(width, 1) / Math.max(height, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      resize();
      window.addEventListener("resize", resize);

      const object = await new Promise<Object3D>((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(DRESS_MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
      });

      if (disposed) return;

      const dressMaterials: ColorableMaterial[] = [];
      object.traverse((child) => {
        if (!isMesh(child)) return;

        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const updatedMaterials = materials.map((material) => {
          if (!isDressMaterial(material)) return material;

          const clonedMaterial = material.clone();
          if (!isColorableMaterial(clonedMaterial)) return material;

          clonedMaterial.name = material.name;
          clonedMaterial.map = null;
          clonedMaterial.metalness =
            typeof clonedMaterial.metalness === "number"
              ? Math.min(clonedMaterial.metalness, 0.04)
              : 0.04;
          clonedMaterial.roughness =
            typeof clonedMaterial.roughness === "number"
              ? Math.max(clonedMaterial.roughness, 0.68)
              : 0.68;
          clonedMaterial.color?.set(activeDressColorRef.current);
          clonedMaterial.needsUpdate = true;
          dressMaterials.push(clonedMaterial);

          return clonedMaterial;
        });

        child.material = Array.isArray(child.material) ? updatedMaterials : updatedMaterials[0];
      });
      dressMaterialsRef.current = dressMaterials;
      applyDressColor(activeDressColorRef.current);

      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.scale.setScalar(2.85 / Math.max(size.y, 1));
      modelRoot.add(object);
      modelRef.current = modelRoot;
      setIsLoaded(true);

      const clock = new THREE.Clock();

      const render = () => {
        frameId = window.requestAnimationFrame(render);
        const delta = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.elapsedTime;

        if (!prefersReducedMotion && !pausedRef.current) {
          targetRotationRef.current.y += delta * 0.28;
        }

        currentRotationRef.current.x +=
          (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
        currentRotationRef.current.y +=
          (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;

        modelRoot.rotation.x = currentRotationRef.current.x + Math.sin(elapsed * 0.7) * 0.018;
        modelRoot.rotation.y = currentRotationRef.current.y;
        modelRoot.rotation.z = Math.sin(elapsed * 0.52) * 0.014;
        modelRoot.position.y = modelBaseY + Math.sin(elapsed * 0.85) * 0.035;

        stageRoot.rotation.z = elapsed * 0.08;
        particles.rotation.y = elapsed * 0.035;
        camera.position.x += (pointerRef.current.x * 0.28 - camera.position.x) * 0.035;
        camera.position.y +=
          (cameraBaseY - pointerRef.current.y * 0.12 - camera.position.y) * 0.035;
        camera.lookAt(cameraTargetX, cameraTargetY, 0);

        renderer.render(scene, camera);
      };

      render();

      cleanupScene = () => {
        window.removeEventListener("resize", resize);
        window.cancelAnimationFrame(frameId);
        scene.traverse((entry) => {
          if (!isMesh(entry)) return;
          entry.geometry.dispose();
          disposeMaterial(entry.material);
        });
        particleGeometry.dispose();
        runwayMaterial.dispose();
        rayMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        dressMaterialsRef.current = [];
      };
    }

    setIsLoaded(false);
    setHasError(false);
    initScene().catch(() => {
      if (!disposed) {
        setHasError(true);
      }
    });

    return () => {
      disposed = true;
      cleanupScene?.();
      modelRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerRef.current.x = x;
    pointerRef.current.y = y;

    if (dragRef.current.active) {
      targetRotationRef.current.y =
        dragRef.current.baseY + (event.clientX - dragRef.current.pointerX) * 0.008;
      targetRotationRef.current.x = Math.max(
        -0.26,
        Math.min(0.2, dragRef.current.baseX + (event.clientY - dragRef.current.pointerY) * 0.004),
      );
      return;
    }

    targetRotationRef.current.x = y * 0.16;
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      baseX: targetRotationRef.current.x,
      baseY: targetRotationRef.current.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
  }, []);

  const resetView = useCallback(() => {
    targetRotationRef.current.x = 0;
    targetRotationRef.current.y = 0;
  }, []);

  return (
    <div
      className={`dress-model-stage ${dragRef.current.active ? "is-dragging" : ""} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      ref={mountRef}
      aria-label="Interactive 3D dress model"
    >
      <div className="dress-model-grid" aria-hidden="true" />
      <div className="dress-model-vignette" aria-hidden="true" />

      {!isLoaded && !hasError && (
        <div className="dress-model-loader" aria-live="polite">
          Preparing atelier
        </div>
      )}
      {hasError && (
        <div className="dress-model-loader" aria-live="polite">
          Atelier preview unavailable
        </div>
      )}

      <div
        className="dress-stage-controls"
        aria-label="Dress model controls"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="dress-stage-swatch-group" aria-label="Dress colors">
          {DRESS_COLOR_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.name}
              className={`dress-color-swatch ${
                activeDressColor === option.value ? "is-active" : ""
              }`}
              style={{ backgroundColor: option.value }}
              aria-label={`Change dress color to ${option.name}`}
              aria-pressed={activeDressColor === option.value}
              title={option.name}
              onClick={() => setActiveDressColor(option.value)}
            />
          ))}
        </div>
        <button
          type="button"
          className="dress-stage-icon-button"
          aria-label={isPaused ? "Start rotation" : "Pause rotation"}
          title={isPaused ? "Start rotation" : "Pause rotation"}
          onClick={() => setIsPaused((value) => !value)}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className="dress-stage-icon-button"
          aria-label="Reset model view"
          title="Reset model view"
          onClick={resetView}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
