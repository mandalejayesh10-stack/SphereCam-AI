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
    controls.enableZoom = false; // Disable standard zoom to use custom FOV zooming
    controls.rotateSpeed = -0.3; // Negative speed matches drag direction
    stateRef.current.controls = controls;

    const handleWheel = (event: WheelEvent) => {
      if (camera) {
        camera.fov = Math.max(30, Math.min(95, camera.fov + event.deltaY * 0.05));
        camera.updateProjectionMatrix();
      }
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: true });

    // Touch pinch-to-zoom for mobile screens
    let touchStartDist = 0;
    let initialFov = 75;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        touchStartDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        if (camera) {
          initialFov = camera.fov;
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchStartDist > 0 && camera) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        if (dist > 0) {
          const factor = touchStartDist / dist;
          camera.fov = Math.max(30, Math.min(95, initialFov * factor));
          camera.updateProjectionMatrix();
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartDist = 0;
    };

    renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: true });


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
        renderer.domElement.removeEventListener('wheel', handleWheel);
        renderer.domElement.removeEventListener('touchstart', handleTouchStart);
        renderer.domElement.removeEventListener('touchmove', handleTouchMove);
        renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      }
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    };
  }, [imageUrl, hotspots, isEditMode, onAddHotspot]);

  const handleZoomIn = () => {
    const camera = stateRef.current.camera;
    if (camera) {
      camera.fov = Math.max(30, camera.fov - 5);
      camera.updateProjectionMatrix();
    }
  };

  const handleZoomOut = () => {
    const camera = stateRef.current.camera;
    if (camera) {
      camera.fov = Math.min(95, camera.fov + 5);
      camera.updateProjectionMatrix();
    }
  };

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

        const size = hotspot.size || 40; // Fallback to 40px default size

        return (
          <div
            key={hotspot.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 group"
            style={{ left: `${x}px`, top: `${y}px` }}
          >
            {/* The Circle with Dot Inside */}
            <div
              onClick={() => onHotspotClick?.(hotspot)}
              style={{ width: `${size}px`, height: `${size}px` }}
              className={`rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border-2 shadow-lg hover:scale-110 active:scale-95 ${
                hotspot.type === 'scene'
                  ? 'bg-pink-600/30 border-pink-400 shadow-pink-500/30'
                  : 'bg-indigo-600/30 border-indigo-400 shadow-indigo-500/30'
              }`}
            >
              {/* Inner Dot */}
              <div
                style={{ width: `${Math.max(4, size * 0.3)}px`, height: `${Math.max(4, size * 0.3)}px` }}
                className={`rounded-full ${
                  hotspot.type === 'scene' ? 'bg-pink-400' : 'bg-indigo-400'
                }`}
              />
            </div>

            {/* Hover Tooltip / Label */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 pointer-events-none w-48 p-2.5 rounded-xl bg-slate-900/95 border border-white/10 text-white shadow-xl shadow-black/40 text-center">
              <h4 className="font-bold text-[11px] text-pink-400 mb-0.5">{hotspot.title}</h4>
              {hotspot.type === 'scene' ? (
                <span className="text-[8px] text-indigo-300 uppercase tracking-widest font-bold">Room Portal</span>
              ) : (
                hotspot.description && (
                  <p className="text-[9px] text-slate-300 leading-normal mt-1">{hotspot.description}</p>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 transition-all text-base font-bold shadow-md cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 transition-all text-base font-bold shadow-md cursor-pointer"
          title="Zoom Out"
        >
          −
        </button>
      </div>

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
