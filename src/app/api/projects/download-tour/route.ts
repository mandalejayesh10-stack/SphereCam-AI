import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { getProject } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const zip = new JSZip();

    // 1. Package images folder
    const imagesFolder = zip.folder('images');
    const updatedPanoramas = [];

    for (const pano of project.panoramas) {
      if (pano.status === 'completed' && pano.stitchedUrl) {
        let imageBuffer: Buffer | null = null;

        if (pano.stitchedUrl.startsWith('data:image/')) {
          try {
            const base64Data = pano.stitchedUrl.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
          } catch (e) {
            console.error(`Failed to decode base64 for panorama ${pano.id}`, e);
          }
        } else {
          // Resolve path to the stitched image (supports public/uploads and public/samples)
          let sourcePath = '';
          if (pano.stitchedUrl.startsWith('/samples/')) {
            sourcePath = path.join(process.cwd(), 'public', 'samples', path.basename(pano.stitchedUrl));
          } else if (pano.stitchedUrl.startsWith('/uploads/')) {
            sourcePath = path.join(process.cwd(), 'public', 'uploads', projectId, path.basename(pano.stitchedUrl));
          }

          if (sourcePath && fs.existsSync(sourcePath)) {
            imageBuffer = fs.readFileSync(sourcePath);
          }
        }

        if (imageBuffer) {
          const zipImageFilename = `${pano.id}.jpg`;
          
          // Add to ZIP images/ folder
          imagesFolder?.file(zipImageFilename, imageBuffer);

          // Determine the correct mime type
          let mimeType = 'image/jpeg';
          if (pano.stitchedUrl.endsWith('.png') || pano.stitchedUrl.startsWith('data:image/png')) {
            mimeType = 'image/png';
          }

          // Inline base64 URL inside the offline HTML to bypass browser CORS file:// policy!
          const base64Url = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

          // Update URL in offline JS bundle to point to inline base64 string
          updatedPanoramas.push({
            ...pano,
            stitchedUrl: base64Url
          });
        }
      }
    }

    // 2. Generate premium self-contained index.html template
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>SphereCam AI Offline Virtual Tour - ${project.name}</title>
  
  <!-- CDN Dependencies -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #030303;
      color: #f5f5f7;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
    
     /* Dynamic projected Hotspots overlay container */
    .hotspot {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 10;
      transition: transform 0.15s ease-out;
    }
    
    /* Clean Circle with Dot Hotspots */
    .hotspot-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hotspot-circle {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, background-color 0.2s;
      border: 2px solid;
    }
    .hotspot-circle:hover {
      transform: scale(1.1);
    }
    .hotspot-circle-scene {
      background: rgba(219, 39, 119, 0.3); /* pink-600 */
      border-color: rgba(244, 114, 182, 0.8); /* pink-400 */
    }
    .hotspot-circle-info {
      background: rgba(79, 70, 229, 0.3); /* indigo-600 */
      border-color: rgba(129, 140, 248, 0.8); /* indigo-400 */
    }
    .hotspot-dot {
      border-radius: 50%;
    }
    .hotspot-dot-scene {
      background: #f472b6;
    }
    .hotspot-dot-info {
      background: #818cf8;
    }
    
    /* Popover Tooltip */
    .hotspot-popover {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%) scale(0.95);
      width: 200px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s;
      text-align: center;
      z-index: 100;
    }
    .hotspot-container:hover .hotspot-popover {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    .popover-title {
      font-weight: bold;
      font-size: 11px;
      color: #f472b6;
      margin-bottom: 2px;
    }
    .popover-desc {
      font-size: 9px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    
    /* Sidebar Room Directory */
    #sidebar {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 20;
      background: rgba(10, 10, 12, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 20px;
      border-radius: 18px;
      width: 240px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h2 {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 2px;
      color: #ffffff;
    }
    .proj-desc {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .room-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      margin-bottom: 8px;
    }
    .room-item {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
      cursor: pointer;
      margin-bottom: 6px;
      transition: all 0.2s;
    }
    .room-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
    }
    .room-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }
    
    /* Compass Navigation Guide */
    #compass-badge {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      background: rgba(10, 10, 12, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 16px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    
    /* Branding watermarks */
    #branding-watermark {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 20;
      font-size: 10px;
      font-weight: 600;
      color: #475569;
    }
    #branding-watermark span {
      color: #6366f1;
      font-weight: 800;
    }
  </style>
</head>
<body>

  <div id="canvas-container">
    <canvas id="webgl-canvas"></canvas>
    
    <!-- Hotspots are populated here dynamically -->
    <div id="hotspot-overlay"></div>
    
    <!-- Sidebar Directory -->
    <div id="sidebar">
      <h2>${project.name}</h2>
      <p className="proj-desc">${project.description || 'Offline Virtual Tour'}</p>
      
      <div className="room-title">Tour Rooms</div>
      <div id="rooms-list"></div>
    </div>
    
    <!-- Compass instruction -->
    <div id="compass-badge">Drag screen to explore room 360°</div>
    
    <!-- Branding Watermark -->
    <div id="branding-watermark">Powered by <span>SphereCam AI</span></div>
  </div>

  <script>
    // 1. Serialize all virtual tour database entities
    const tourData = ${JSON.stringify(updatedPanoramas)};
    let activePanoIndex = 0;
    
    // 2. Setup Three.js Globals
    let scene, camera, renderer, controls, sphereMesh, sphereMaterial;
    const canvas = document.getElementById('webgl-canvas');
    const container = document.getElementById('canvas-container');
    const overlay = document.getElementById('hotspot-overlay');
    const roomsList = document.getElementById('rooms-list');
    
    function init() {
      if (tourData.length === 0) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Scene
      scene = new THREE.Scene();
      
      // Camera
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 0, 0.1);
      
      // Renderer
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Inside-out Sphere geometry
      const geometry = new THREE.SphereGeometry(10, 60, 40);
      geometry.scale(-1, 1, 1);
      
      sphereMaterial = new THREE.MeshBasicMaterial();
      sphereMesh = new THREE.Mesh(geometry, sphereMaterial);
      scene.add(sphereMesh);
      
      // Controls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = false;
      controls.rotateSpeed = -0.35;
      
      // Setup window resize listener
      window.addEventListener('resize', handleResize);
      
      // Render rooms list directory
      renderRoomsList();
      
      // Set initial room
      loadRoom(0);
      
      // Run animation frames
      animate();
    }
    
    function loadRoom(index) {
      activePanoIndex = index;
      const room = tourData[index];
      if (!room) return;
      
      // Update sidebar active highlights
      const items = document.querySelectorAll('.room-item');
      items.forEach((it, idx) => {
        if (idx === index) it.classList.add('active');
        else it.classList.remove('active');
      });
      
      // Load and map new texture
      const loader = new THREE.TextureLoader();
      loader.load(room.stitchedUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        sphereMaterial.map = texture;
        sphereMaterial.needsUpdate = true;
      });
      
      // Reset camera
      camera.position.set(0, 0, 0.1);
      controls.update();
    }
    
    function renderRoomsList() {
      roomsList.innerHTML = '';
      tourData.forEach((room, idx) => {
        const div = document.createElement('div');
        div.className = 'room-item';
        if (idx === activePanoIndex) div.className += ' active';
        div.textContent = room.name;
        div.onclick = () => loadRoom(idx);
        roomsList.appendChild(div);
      });
    }
    
    function animate() {
      requestAnimationFrame(animate);
      
      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
        
        // Project spatial Hotspots
        renderHotspots();
      }
    }
    
    function renderHotspots() {
      overlay.innerHTML = '';
      const room = tourData[activePanoIndex];
      if (!room || !room.hotspots) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      room.hotspots.forEach((hs) => {
        // Convert yaw/pitch back to 3D Cartesian coordinates
        const radius = 10;
        const pitchRad = (hs.pitch * Math.PI) / 180;
        const yawRad = (hs.yaw * Math.PI) / 180;
        
        const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
        const y = radius * Math.sin(pitchRad);
        const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);
        
        const hsVector = new THREE.Vector3(x, y, z);
        
        // Dot check (ensure it is in front of camera lens)
        const tempCamera = camera.clone();
        const heading = new THREE.Vector3(0, 0, -1).applyQuaternion(tempCamera.quaternion);
        const toHotspot = hsVector.clone().normalize();
        const dot = heading.dot(toHotspot);
        
        if (dot > 0.3) {
          hsVector.project(camera);
          
          const screenX = (hsVector.x * 0.5 + 0.5) * width;
          const screenY = (-(hsVector.y * 0.5) + 0.5) * height;
          
          const div = document.createElement('div');
          div.className = 'hotspot';
          div.style.left = screenX + 'px';
          div.style.top = screenY + 'px';
          
          const size = hs.size || 40;
          
          const hsContainer = document.createElement('div');
          hsContainer.className = 'hotspot-container';
          
          const circle = document.createElement('div');
          circle.className = 'hotspot-circle ' + (hs.type === 'scene' ? 'hotspot-circle-scene' : 'hotspot-circle-info');
          circle.style.width = size + 'px';
          circle.style.height = size + 'px';
          
          const innerDot = document.createElement('div');
          innerDot.className = 'hotspot-dot ' + (hs.type === 'scene' ? 'hotspot-dot-scene' : 'hotspot-dot-info');
          const dotSize = Math.max(4, size * 0.3);
          innerDot.style.width = dotSize + 'px';
          innerDot.style.height = dotSize + 'px';
          
          circle.appendChild(innerDot);
          hsContainer.appendChild(circle);
          
          // Add Popover Tooltip
          const popover = document.createElement('div');
          popover.className = 'hotspot-popover';
          
          const title = document.createElement('div');
          title.className = 'popover-title';
          title.textContent = hs.title;
          popover.appendChild(title);
          
          if (hs.type === 'info' && hs.description) {
            const desc = document.createElement('div');
            desc.className = 'popover-desc';
            desc.textContent = hs.description;
            popover.appendChild(desc);
          } else if (hs.type === 'scene') {
            const desc = document.createElement('div');
            desc.className = 'popover-desc';
            desc.style.fontSize = '8px';
            desc.style.color = '#818cf8';
            desc.style.fontWeight = 'bold';
            desc.textContent = 'ROOM PORTAL';
            popover.appendChild(desc);
          }
          
          hsContainer.appendChild(popover);
          
          circle.onclick = () => {
            if (hs.type === 'scene') {
              const targetIdx = tourData.findIndex(p => p.id === hs.targetPanoramaId);
              if (targetIdx !== -1) {
                loadRoom(targetIdx);
              }
            }
          };
          
          div.appendChild(hsContainer);
          overlay.appendChild(div);
        }
      });
    }
    
    function handleResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    
    // Initialize WebGL layout
    init();
  </script>

</body>
</html>`;

    zip.file('index.html', htmlTemplate);

    // 3. Compress ZIP in memory
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 4. Return as attachment stream download
    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="virtual-tour-${projectId}.zip"`
      }
    });

  } catch (error) {
    console.error('API Error: GET download-tour zip archive', error);
    return NextResponse.json({ error: 'Failed to compile and package virtual tour zip archive' }, { status: 500 });
  }
}
