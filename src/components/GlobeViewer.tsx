'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function GlobeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 450;

    // 1. Create Scene
    const scene = new THREE.Scene();

    // 2. Create Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    // 3. Create WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Globe Base: Solid dark inner sphere
    const innerSphereGeo = new THREE.SphereGeometry(2, 32, 32);
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: 0x07070a,
      transparent: true,
      opacity: 0.8
    });
    const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
    globeGroup.add(innerSphere);

    // Globe Shell: Dot Particle Grid (Futuristic Point Cloud)
    const pointsGeo = new THREE.SphereGeometry(2.02, 45, 30);
    const pointsMat = new THREE.PointsMaterial({
      color: 0xd946ef, // Hot Magenta Pink
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    const dotGlobe = new THREE.Points(pointsGeo, pointsMat);
    globeGroup.add(dotGlobe);

    // Globe Lat/Long Wireframe Lines
    const wireframeGeo = new THREE.SphereGeometry(2.01, 18, 12);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6, // Electric Purple
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const lineGlobe = new THREE.Mesh(wireframeGeo, wireframeMat);
    globeGroup.add(lineGlobe);

    // 5. Add Pulsing Tour Location Markers (Pinned global rooms)
    const markers: THREE.Mesh[] = [];
    const markerCoordinates = [
      { lat: 37.7749, lon: -122.4194 }, // San Francisco
      { lat: 40.7128, lon: -74.0060 },  // New York
      { lat: 51.5074, lon: -0.1278 },   // London
      { lat: 35.6762, lon: 139.6503 },  // Tokyo
      { lat: -33.8688, lon: 151.2093 }, // Sydney
      { lat: 19.0760, lon: 72.8777 }    // Mumbai
    ];

    // Helper to convert lat/long to 3D Cartesian vectors
    const convertCoords = (lat: number, lon: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      const x = -(radius * Math.sin(phi) * Math.sin(theta));
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.cos(theta);

      return new THREE.Vector3(x, y, z);
    };

    markerCoordinates.forEach((coord) => {
      const pos = convertCoords(coord.lat, coord.lon, 2.02);
      
      // Marker Sphere
      const markerGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e, // Rose pink
        transparent: true,
        opacity: 0.9
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      globeGroup.add(marker);
      markers.push(marker);
    });

    // 6. Draw Glowing Bezier Connection Arcs between markers
    const createArc = (start: THREE.Vector3, end: THREE.Vector3) => {
      // Calculate control point arched above sphere surface
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      const controlPoint = midPoint.clone().normalize().multiplyScalar(2.02 + distance * 0.4);

      const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
      const points = curve.getPoints(30);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      
      const arcMat = new THREE.LineBasicMaterial({
        color: 0xd946ef,
        transparent: true,
        opacity: 0.45
      });
      
      const arcLine = new THREE.Line(arcGeo, arcMat);
      globeGroup.add(arcLine);
    };

    // Link markers with curves
    for (let i = 0; i < markers.length - 1; i++) {
      createArc(markers[i].position, markers[i + 1].position);
    }
    createArc(markers[markers.length - 1].position, markers[0].position);

    // 7. Ambient Lighting and Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;

    let animationId: number;
    let pulseTime = 0;

    // 8. Render Loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      pulseTime += 0.05;

      // Pulse markers in size and glow
      const scale = 1 + Math.sin(pulseTime) * 0.15;
      markers.forEach((m) => {
        m.scale.set(scale, scale, scale);
      });

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      innerSphereGeo.dispose();
      innerSphereMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[450px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-purple-500/5 rounded-full blur-[80px] pointer-events-none"></div>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
