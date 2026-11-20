import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface CosmicBackdropProps {
  focusMode?: boolean;
}

export const CosmicBackdrop: React.FC<CosmicBackdropProps> = ({ focusMode = false }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || focusMode) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    let rafId = 0;
    let timerId = 0;
    let disposed = false;

    const width = Math.max(container.clientWidth || window.innerWidth, 1);
    const height = Math.max(container.clientHeight || window.innerHeight, 1);

    try {
      // Detect software WebGL before constructing renderer
      const probeCanvas = document.createElement('canvas');
      const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!probeGl) return;

      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      const gpuRenderer = dbg
        ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
        : '';
      const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuRenderer);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      });
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = false;

      const dom = renderer.domElement;
      dom.style.width = '100%';
      dom.style.height = '100%';
      dom.style.display = 'block';
      container.appendChild(dom);

      scene = new THREE.Scene();

      // Explicit environment reflections
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.75;
      roomEnv.dispose();
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
      camera.position.set(0, 0, 7.5);
      camera.lookAt(0, 0, 0);

      // Lighting rig: cool atmospheric skylight + warm gold key + cyan rim
      const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x090d1a, 0.65);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfef3c7, 2.2);
      keyLight.position.set(5, 6, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
      rimLight.position.set(-6, -3, 2);
      scene.add(rimLight);

      // --- 1. HERO COMPOSITE MODEL: ESTACA Orbital Astrolabe Gyroscope (10 parts) ---
      const astrolabeGroup = new THREE.Group();
      astrolabeGroup.position.set(3.25, 1.32, -1.35);
      astrolabeGroup.scale.setScalar(1.08);
      astrolabeGroup.rotation.set(0.32, -0.4, -0.24);
      scene.add(astrolabeGroup);

      // Part 1: Singularity Core
      const coreMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0x0b1120,
          roughness: 0.18,
          metalness: 0.92,
          emissive: 0x78350f,
          emissiveIntensity: 0.25,
        })
      );
      astrolabeGroup.add(coreMesh);

      // Part 2: Photon Inner Halo Ring
      const photonRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.018, 12, 48),
        new THREE.MeshStandardMaterial({
          color: 0xfde68a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.75,
          roughness: 0.22,
          metalness: 0.8,
        })
      );
      photonRing.rotation.x = Math.PI * 0.44;
      astrolabeGroup.add(photonRing);

      // Part 3: Brushed Gold Accretion Gimbal
      const amberRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.98, 0.03, 14, 64),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.3,
          metalness: 0.88,
          emissive: 0x92400e,
          emissiveIntensity: 0.22,
        })
      );
      amberRing.rotation.set(Math.PI * 0.36, 0.2, 0);
      astrolabeGroup.add(amberRing);

      // Part 4: Satin Titanium Middle Gimbal
      const titaniumGimbal = new THREE.Group();
      const titaniumRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.26, 0.016, 12, 64),
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.38,
          metalness: 0.84,
        })
      );
      titaniumGimbal.add(titaniumRing);

      // Parts 5 & 6: Calibration Gimbal Pivots
      const pivotGeo = new THREE.SphereGeometry(0.052, 12, 12);
      const pivotMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.25,
        metalness: 0.9,
      });
      const pivotEast = new THREE.Mesh(pivotGeo, pivotMat);
      pivotEast.position.set(1.26, 0, 0);
      const pivotWest = new THREE.Mesh(pivotGeo, pivotMat);
      pivotWest.position.set(-1.26, 0, 0);
      titaniumGimbal.add(pivotEast, pivotWest);
      titaniumGimbal.rotation.set(-0.35, 0.55, 0.2);
      astrolabeGroup.add(titaniumGimbal);

      // Part 7: Outer Cryogenic Cyan Telemetry Orbit
      const cyanRingGroup = new THREE.Group();
      const cyanRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.56, 0.014, 12, 72),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.45,
          roughness: 0.32,
          metalness: 0.78,
        })
      );
      cyanRingGroup.add(cyanRing);

      // Part 8 & 9: Orbiting Micro-Satellite (Capsule + Solar Array)
      const satelliteGroup = new THREE.Group();
      satelliteGroup.position.set(1.56, 0, 0);
      const satBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.4,
          roughness: 0.2,
          metalness: 0.9,
        })
      );
      const satPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.012, 0.075),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          roughness: 0.3,
          metalness: 0.85,
        })
      );
      satelliteGroup.add(satBody, satPanel);
      cyanRingGroup.add(satelliteGroup);
      cyanRingGroup.rotation.set(0.7, -0.45, 0.28);
      astrolabeGroup.add(cyanRingGroup);

      // Part 10: Precision North-South Axis Rod
      const axisRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 2.55, 10),
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.42,
          metalness: 0.86,
        })
      );
      astrolabeGroup.add(axisRod);

      // --- 2. LEFT-WING AEROSPACE POLYHEDRON BEACON (3 parts) ---
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(-3.35, -0.65, -1.75);
      beaconGroup.scale.setScalar(1.18);
      scene.add(beaconGroup);

      const beaconCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.25,
          metalness: 0.9,
          emissive: 0x0284c7,
          emissiveIntensity: 0.22,
        })
      );
      const beaconHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.015, 10, 48),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.55,
          roughness: 0.3,
          metalness: 0.82,
        })
      );
      beaconHalo.rotation.x = Math.PI * 0.35;
      const beaconInnerHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.01, 10, 40),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.45,
          roughness: 0.28,
          metalness: 0.86,
        })
      );
      beaconInnerHalo.rotation.y = Math.PI * 0.42;
      beaconGroup.add(beaconCore, beaconHalo, beaconInnerHalo);

      // --- 3. 3D STARFIELD INSTANCED MESH (160 faceted star motes) ---
      const STAR_COUNT = 160;
      const starGeo = new THREE.OctahedronGeometry(0.024, 0);
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.78,
      });
      const starField = new THREE.InstancedMesh(starGeo, starMat, STAR_COUNT);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const palette = [0xf8fafc, 0xbae6fd, 0xfde68a, 0xcbd5e1];

      for (let i = 0; i < STAR_COUNT; i++) {
        dummy.position.set(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 9,
          -2.5 - Math.random() * 11
        );
        const s = 0.45 + Math.random() * 1.15;
        dummy.scale.setScalar(s);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        starField.setMatrixAt(i, dummy.matrix);
        color.setHex(palette[i % palette.length]);
        starField.setColorAt(i, color);
      }
      starField.instanceMatrix.needsUpdate = true;
      if (starField.instanceColor) starField.instanceColor.needsUpdate = true;
      starField.computeBoundingSphere();
      scene.add(starField);

      const handleResize = () => {
        if (!container || !renderer || disposed) return;
        const w = Math.max(container.clientWidth || window.innerWidth, 1);
        const h = Math.max(container.clientHeight || window.innerHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener('resize', handleResize);

      const afterDraw = (fn: () => void) => {
        if (disposed) return;
        if (isSoftwareGl && renderer) {
          const gl = renderer.getContext() as WebGL2RenderingContext;
          if (typeof gl.fenceSync === 'function') {
            const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            const poll = () => {
              if (disposed) {
                if (sync) gl.deleteSync(sync);
                return;
              }
              if (!sync || gl.clientWaitSync(sync, 0, 0) !== gl.TIMEOUT_EXPIRED) {
                if (sync) gl.deleteSync(sync);
                timerId = window.setTimeout(fn, 80);
              } else {
                timerId = window.setTimeout(poll, 16);
              }
            };
            gl.flush();
            poll();
            return;
          }
          timerId = window.setTimeout(fn, 80);
          return;
        }
        rafId = requestAnimationFrame(fn);
      };

      const startTimeMs = performance.now();
      const tick = () => {
        if (disposed || !renderer || !scene) return;
        const t = (performance.now() - startTimeMs) * 0.001;

        astrolabeGroup.rotation.y = -0.4 + Math.sin(t * 0.25) * 0.14;
        astrolabeGroup.position.y = 1.32 + Math.sin(t * 0.45) * 0.09;

        photonRing.rotation.z = t * 0.55;
        amberRing.rotation.z = -t * 0.26;
        titaniumGimbal.rotation.y = 0.55 + t * 0.22;
        cyanRingGroup.rotation.z = 0.28 + t * 0.32;

        beaconGroup.rotation.y = t * 0.28;
        beaconGroup.rotation.x = Math.sin(t * 0.3) * 0.22;
        beaconGroup.position.y = -0.65 + Math.cos(t * 0.4) * 0.11;
        beaconInnerHalo.rotation.z = -t * 0.4;

        starField.rotation.y = t * 0.018;
        starField.rotation.x = Math.sin(t * 0.05) * 0.025;

        renderer.render(scene, camera);
        afterDraw(tick);
      };

      renderer.render(scene, camera);
      afterDraw(tick);

      return () => {
        disposed = true;
        window.removeEventListener('resize', handleResize);
        if (rafId) cancelAnimationFrame(rafId);
        if (timerId) clearTimeout(timerId);

        scene?.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });

        envRT?.dispose();
        if (renderer) {
          if (renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
          renderer.dispose();
        }
      };
    } catch {
      // Fallback gracefully if WebGL context cannot be acquired
      return () => {
        disposed = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (timerId) clearTimeout(timerId);
        envRT?.dispose();
        renderer?.dispose();
      };
    }
  }, [focusMode]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    >
      {/* Deep Space Obsidian & Distant Singularity Halo */}
      <div
        className="absolute inset-0"
        style={{
          background: focusMode
            ? 'radial-gradient(circle at 80% 15%, rgba(15, 23, 42, 0.28) 0%, #04060C 62%)'
            : 'radial-gradient(circle at 84% 16%, rgba(245, 158, 11, 0.09) 0%, rgba(15, 23, 42, 0.35) 28%, rgba(4, 6, 12, 0.96) 66%), radial-gradient(circle at 12% 88%, rgba(56, 189, 248, 0.06) 0%, transparent 45%)',
        }}
      />

      {!focusMode && (
        <div
          ref={mountRef}
          data-testid="cosmic-3d-canvas"
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
};
