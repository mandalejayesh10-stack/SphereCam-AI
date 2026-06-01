'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Hotspot } from '../lib/types';
import { HelpCircle, ArrowRight, Info, Plus } from 'lucide-react';

interface ThreeViewerProps {
  imageUrl: string;
  hotspots?: Hotspot[];
  onAddHotspot?: (yaw: number, pitch: number) => void;
  onHotspotClick?: (hotspot: Hotspot) => void;
  isEditMode?: boolean;
  brightness?: number; // percentage (default 100)
  contrast?: number;   // percentage (default 100)
  saturation?: number; // percentage (default 100)
}

export default function ThreeViewer({
  imageUrl,
  hotspots = [],
  onAddHotspot,
  onHotspotClick,
  isEditMode = false,
  brightness = 100,
  contrast = 100,
  saturation = 100
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projectedHotspots, setProjectedHotspots] = useState<Array<{
    hotspot: Hotspot;
    x: number;
    y: number;
    visible: boolean;
  }>>([]);

  // Store references for the animation loop
  const stateRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    controls: OrbitControls | null;
    sphereMaterial: THREE.MeshBasicMaterial | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    sphereMaterial: null
  });

  // Track image url changes to update sphere texture
  useEffect(() => {
    const { scene, sphereMaterial } = stateRef.current;
    if (scene && sphereMaterial) {
      const loader = new THREE.TextureLoader();
      loader.load(imageUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        sphereMaterial.map = texture;
        sphereMaterial.needsUpdate = true;
      });
    }
  }, [imageUrl]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    // 1. Create Scene
    const scene = new THREE.Scene();
    stateRef.current.scene = scene;

    // 2. Create Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // Position inside the sphere
    stateRef.current.camera = camera;

    // 3. Create Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stateRef.current.renderer = renderer;

    // 4. Create Inside-out Sphere Geometry
    const geometry = new THREE.SphereGeometry(10, 60, 40);
    geometry.scale(-1, 1, 1); // Invert sphere to map texture inside

    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    stateRef.current.sphereMaterial = sphereMaterial;

    // Initial texture load
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      sphereMaterial.map = texture;
      sphereMaterial.needsUpdate = true;
    });

    const mesh = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(mesh);

    // 5. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable zoom to maintain immersive feeling
    controls.rotateSpeed = -0.3; // Negative speed matches drag direction
    stateRef.current.controls = controls;

    // 6. Raycasting for Hotspot Placement
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasDoubleClick = (event: MouseEvent) => {
      if (!isEditMode || !onAddHotspot) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        // Convert 3D position to spherical coords (degrees)
        const radius = 10;
        const pitch = Math.asin(point.y / radius) * (180 / Math.PI);
        const yaw = Math.atan2(point.x, point.z) * (180 / Math.PI);
        
        onAddHotspot(yaw, pitch);
      }
    };

    renderer.domElement.addEventListener('dblclick', handleCanvasDoubleClick);

    // 7. Animation & Projecting Hotspots Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);

        // Map hotspots from 3D space to 2D Screen Space
        const currentContainer = containerRef.current;
        if (currentContainer && hotspots.length > 0) {
          const containerW = currentContainer.clientWidth;
          const containerH = currentContainer.clientHeight;

          const updated = hotspots.map((hs) => {
            // Convert spherical coords to 3D Cartesian coords
            const radius = 10;
            const pitchRad = (hs.pitch * Math.PI) / 180;
            const yawRad = (hs.yaw * Math.PI) / 180;

            const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
            const y = radius * Math.sin(pitchRad);
            const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);

            const hsVector = new THREE.Vector3(x, y, z);
            
            // Check if hotspot is behind the camera
            const tempCamera = camera.clone();
            const heading = new THREE.Vector3(0, 0, -1).applyQuaternion(tempCamera.quaternion);
            const toHotspot = hsVector.clone().normalize();
            const dot = heading.dot(toHotspot);

            hsVector.project(camera);

            const screenX = (hsVector.x * 0.5 + 0.5) * containerW;
            const screenY = (-(hsVector.y * 0.5) + 0.5) * containerH;

            return {
              hotspot: hs,
              x: screenX,
              y: screenY,
              visible: dot > 0.3 // Only show if in front cone of camera
            };
          });

          setProjectedHotspots(updated);
        } else {
          setProjectedHotspots([]);
        }
      }
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('dblclick', handleCanvasDoubleClick);
      }
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    };
  }, [imageUrl, hotspots, isEditMode, onAddHotspot]);

  // Combine CSS adjustments on canvas style
  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing transition-all duration-150"
        style={filterStyle}
      />

      {/* HTML Projected Overlays */}
      {projectedHotspots.map(({ hotspot, x, y, visible }) => {
        if (!visible) return null;

        return (
          <div
            key={hotspot.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {hotspot.type === 'scene' ? (
              // Scene navigation link
              <button
                onClick={() => onHotspotClick?.(hotspot)}
                className="group flex items-center gap-2 bg-indigo-600/90 text-white text-xs font-semibold py-2 px-3 rounded-full shadow-lg shadow-indigo-500/30 border border-indigo-400/40 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                <span>{hotspot.title}</span>
              </button>
            ) : (
              // Info Point card popup
              <div className="group relative flex items-center justify-center">
                <button
                  onClick={() => onHotspotClick?.(hotspot)}
                  className="w-8 h-8 rounded-full bg-violet-600/90 text-white border border-violet-400/40 shadow-lg shadow-violet-500/30 flex items-center justify-center hover:bg-violet-500 hover:scale-110 transition-all duration-200 cursor-help"
                >
                  <Info className="w-4 h-4" />
                </button>
                {/* Popover Card */}
                <div className="absolute bottom-10 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none w-56 p-3 rounded-xl bg-slate-900/95 border border-white/10 text-white shadow-xl shadow-black/40 text-left">
                  <h4 className="font-semibold text-xs text-indigo-300 mb-1">{hotspot.title}</h4>
                  {hotspot.description && (
                    <p className="text-[10px] text-slate-300 leading-relaxed">{hotspot.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Editor Guide Badge */}
      {isEditMode && (
        <div className="absolute top-4 left-4 z-40 bg-black/60 backdrop-blur-md border border-white/10 py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-medium text-slate-300 pointer-events-none select-none">
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Double-click canvas to place hotspot</span>
        </div>
      )}
    </div>
  );
}
