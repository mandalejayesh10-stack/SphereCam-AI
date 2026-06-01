# 🔮 SphereCam AI

> **Capturing, Stitching, and Customizing Immersive 360° Virtual Tours Directly From Your Smartphone Browser.**

SphereCam AI is a venture-scale spatial SaaS platform enabling real estate agents, architects, builders, hospitality venues, and photographers to generate high-fidelity 360° equirectangular panoramas and interactive tours without the need for expensive professional 360° cameras, specialized hardware, or proprietary apps.

🔗 **Live Production Deployment**: [https://sphere-cam-ai.vercel.app/](https://sphere-cam-ai.vercel.app/)

---

## 🌌 The Problem & Solution

### The Problem
* Most consumer smartphones do not support Google Photo Sphere natively.
* Existing panorama stitching software creates low-resolution seams or warping errors.
* Professional 360° cameras are prohibitively expensive for local agencies and business owners.

### The Solution
Users capture 12–24 overlapping photos in any room using their browser via a gyroscopically guided capture HUD. SphereCam AI's backend serverless system uses computer vision techniques to:
1. Detect features and alignment vectors.
2. Stitch frames into a continuous 360°×180° equirectangular projection.
3. Automatically adjust exposures and seaming boundaries.
4. Let users place spatial scene-to-scene portals and info hotspots, then download complete self-contained virtual tours.

---

## 🛠️ Technological Architecture

* **Core Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript, React)
* **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) with high-graphic Glassmorphic styles, custom violet-to-pink dark gradients, and micro-interactions.
* **Spatial 3D Rendering**: [Three.js](https://threejs.org/) (WebGL) powering inside-out panoramas, floating hotspot coordinates, and a interactive rotating desktop home globe.
* **Computer Vision stitching daemon**: Python SIFT (Scale-Invariant Feature Transform) keypoint detection and multi-band blending script.
* **Serverless Resiliency**: Built-in `EROFS` (Read-Only Filesystem) safeguards that fallback gracefully to direct in-memory cache synchronizations and static pre-rendered asset pipelines when deploying to read-only environments like Vercel.

---

## 🚀 Key Features

* **3D Glassmorphic Interface**: Fully dynamic dark/light mode toggle with persistent local storage.
* **Mobile Compass & Gyro HUD**: Guides users in real-time to align camera frames. Includes a **Desktop Simulator Mode** that uses a 3D orbit mouse-drag compass for fast developer debugging.
* **Interactive Hotspot Planner**: Raycast coordinate tracking. Double-click inside the panorama to add text pins, product specifications, or scene portal gates.
* **Offline Bundled ZIP Exporter**: Compile and download a fully standalone virtual tour package. Contains self-contained CDN-loaded HTML views and stitched assets so tours can run entirely offline or be uploaded to third-party CDNs.

---

## 💻 Getting Started (Local Development)

To run SphereCam AI locally on your machine:

### 1. Clone the Repository
```bash
git clone https://github.com/mandalejayesh10-stack/SphereCam-AI.git
cd SphereCam-AI
```

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to experience the dashboard, capture simulator, and 3D virtual tour editor.

---

## 📦 Vercel Deployment Configurations

The project has been optimized to compile seamlessly on Vercel:
* Next.js static and serverless paths are auto-configured.
* Database operations write to persistent storage on disk in development and gracefully utilize safe global memory caching fallbacks on production instances.
* Upload paths support direct base64 data URIs to bypass serverless upload constraints.

---

*Designed and engineered with ♥ by the SphereCam AI Team.*
