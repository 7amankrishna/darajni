"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  WebGLRenderer,
} from "three";
import type { MTLLoader as MTLLoaderNamespace } from "three/examples/jsm/loaders/MTLLoader.js";

const FABRICS = [
  { name: "Ruby silk", color: "#8f2435", glow: "#2a050b" },
  { name: "Ivory zari", color: "#e7cf9c", glow: "#3a2910" },
  { name: "Emerald satin", color: "#2f746a", glow: "#05201b" },
  { name: "Midnight velvet", color: "#151823", glow: "#080b17" },
] as const;

type Fabric = (typeof FABRICS)[number];
type MaterialCreator = MTLLoaderNamespace.MaterialCreator;

type SwatchStyle = CSSProperties & {
  "--fabric-color": string;
};

function isMesh(object: Object3D): object is Mesh {
  return "isMesh" in object && object.isMesh === true;
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

export default function DressModelStage({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Object3D | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const dressMaterialsRef = useRef<MeshStandardMaterial[]>([]);
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
  const fabricRef = useRef<Fabric>(FABRICS[0]);
  const pausedRef = useRef(false);
  const [fabricIndex, setFabricIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const fabric = FABRICS[fabricIndex];
    fabricRef.current = fabric;

    dressMaterialsRef.current.forEach((material) => {
      material.color.set(fabric.color);
      material.emissive.set(fabric.glow);
      material.needsUpdate = true;
    });
  }, [fabricIndex]);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let cleanupScene: (() => void) | undefined;

    async function initScene() {
      const THREE = await import("three");
      const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");

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
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
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

      const keyLight = new THREE.DirectionalLight(0xffdc9d, 2.9);
      keyLight.position.set(-3.2, 4.2, 4.8);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x7bd0c1, 2.15);
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
        const modelX = isMobile ? 0.62 : 1.05;

        modelBaseY = isMobile ? -0.82 : -0.5;
        cameraBaseY = isMobile ? 0.36 : 0.42;
        cameraTargetX = isMobile ? 0.52 : 0.74;
        cameraTargetY = isMobile ? 0 : 0.08;
        camera.position.z = isMobile ? 5.85 : 5.25;
        modelRoot.position.x = modelX;
        stageRoot.position.x = modelX;
        stageRoot.position.y = isMobile ? -1.08 : -0.94;

        camera.aspect = Math.max(width, 1) / Math.max(height, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      resize();
      window.addEventListener("resize", resize);

      const createMaterial = (name: string) => {
        const fabric = fabricRef.current;
        const base =
          name === "Skin"
            ? { color: "#bd9162", roughness: 0.62, metalness: 0.02 }
            : name === "Hair"
              ? { color: "#4b3217", roughness: 0.58, metalness: 0.03 }
              : name === "Eyes"
                ? { color: "#151515", roughness: 0.35, metalness: 0.05 }
                : name === "Shoes"
                  ? { color: "#2b1110", roughness: 0.44, metalness: 0.12 }
                  : { color: fabric.color, roughness: 0.34, metalness: 0.1 };

        const material = new THREE.MeshStandardMaterial({
          color: base.color,
          roughness: base.roughness,
          metalness: base.metalness,
          emissive: name === "Dress" ? fabric.glow : "#000000",
          emissiveIntensity: name === "Dress" ? 0.22 : 0,
        });
        material.name = name;
        return material;
      };

      const materialCreator = await new Promise<MaterialCreator>((resolve, reject) => {
        const loader = new MTLLoader();
        loader.setPath("/models/dress/");
        loader.load("Smooth_Female_Dress.mtl", resolve, undefined, reject);
      });
      materialCreator.preload();

      const object = await new Promise<Object3D>((resolve, reject) => {
        const loader = new OBJLoader();
        loader.setMaterials(materialCreator);
        loader.setPath("/models/dress/");
        loader.load("Smooth_Female_Dress.obj", resolve, undefined, reject);
      });

      if (disposed) return;

      dressMaterialsRef.current = [];
      object.traverse((child) => {
        if (!isMesh(child)) return;

        child.castShadow = true;
        child.receiveShadow = true;
        const sourceMaterials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const nextMaterials = sourceMaterials.map((material) => {
          const nextMaterial = createMaterial(material.name || "Dress");
          if (nextMaterial.name === "Dress") {
            dressMaterialsRef.current.push(nextMaterial);
          }
          return nextMaterial;
        });

        child.material = Array.isArray(child.material) ? nextMaterials : nextMaterials[0];
      });

      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.scale.setScalar(2.65 / Math.max(size.y, 1));
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
      dressMaterialsRef.current = [];
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

      <div className="dress-stage-controls" aria-label="Dress material controls">
        <div className="dress-swatch-list" aria-label="Fabric color">
          {FABRICS.map((fabric, index) => (
            <button
              type="button"
              key={fabric.name}
              aria-label={fabric.name}
              aria-pressed={fabricIndex === index}
              title={fabric.name}
              onClick={() => setFabricIndex(index)}
              className={`dress-swatch ${fabricIndex === index ? "is-active" : ""}`}
              style={{ "--fabric-color": fabric.color } as SwatchStyle}
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
