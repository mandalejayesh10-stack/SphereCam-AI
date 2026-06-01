'use client';

export const dynamic = 'force-dynamic';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Camera, ArrowLeft, RefreshCw, Sparkles, Check, 
  HelpCircle, Compass, RotateCcw, AlertTriangle, CloudUpload 
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

interface CaptureNode {
  yaw: number;
  pitch: number;
  captured: boolean;
  thumbnail: string | null;
}

function CapturePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const panoId = searchParams.get('panoId');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string>('');

  // Gyroscope tracking states
  const [pitch, setPitch] = useState<number>(0);
  const [yaw, setYaw] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [gyroGranted, setGyroGranted] = useState<boolean>(false);

  // Desktop Simulator states
  const [simYaw, setSimYaw] = useState<number>(0);
  const [simPitch, setSimPitch] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseStart = useRef({ x: 0, y: 0 });

  // Shutter flash effect state
  const [isFlashing, setIsFlashing] = useState(false);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);

  // Nodes to capture (12 shots covering 360 degrees horizontal field)
  const [nodes, setNodes] = useState<CaptureNode[]>([
    { yaw: 0, pitch: 0, captured: false, thumbnail: null },
    { yaw: 30, pitch: 0, captured: false, thumbnail: null },
    { yaw: 60, pitch: 0, captured: false, thumbnail: null },
    { yaw: 90, pitch: 0, captured: false, thumbnail: null },
    { yaw: 120, pitch: 0, captured: false, thumbnail: null },
    { yaw: 150, pitch: 0, captured: false, thumbnail: null },
    { yaw: 180, pitch: 0, captured: false, thumbnail: null },
    { yaw: 210, pitch: 0, captured: false, thumbnail: null },
    { yaw: 240, pitch: 0, captured: false, thumbnail: null },
    { yaw: 270, pitch: 0, captured: false, thumbnail: null },
    { yaw: 300, pitch: 0, captured: false, thumbnail: null },
    { yaw: 330, pitch: 0, captured: false, thumbnail: null }
  ]);

  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
  const [lockProgress, setLockProgress] = useState<number>(0); // 0 to 100%
  const [isLocking, setIsLocking] = useState<boolean>(false);
  
  // Track continuous alignment duration
  const alignTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Synthesize camera shutter sound using Web Audio API
  const playShutterSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      
      filter.frequency.setValueAtTime(8000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
    } catch (e) {
      console.error('Audio synthesis failed', e);
    }
  };

  // 2. Initialize Camera WebRTC
  useEffect(() => {
    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // Rear mobile camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        setHasCameraAccess(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Camera access denied:', err);
        setHasCameraAccess(false);
        setCameraError(err.message || 'Permissions denied');
      }
    }

    startCamera();

    // Detect mobile orientation capabilities
    if (typeof window !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 3. Handle Mobile Device Orientation (Gyroscope)
  useEffect(() => {
    if (!isMobileDevice) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setYaw(Math.round(e.alpha));
      if (e.beta !== null) setPitch(Math.round(e.beta));
      if (e.gamma !== null) setRoll(Math.round(e.gamma));
      setGyroGranted(true);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isMobileDevice]);

  // Request iOS Gyro Permissions
  const requestGyroAccess = async () => {
    const doc = window as any;
    if (doc.DeviceOrientationEvent && typeof doc.DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await doc.DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setGyroGranted(true);
        } else {
          alert('Gyroscope permission was denied.');
        }
      } catch (err) {
        console.error('DeviceOrientation permissions request error', err);
      }
    } else {
      setGyroGranted(true);
    }
  };

  // 4. Capture Frame helper
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    playShutterSound();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.6);

      setNodes(prevNodes => {
        const updated = [...prevNodes];
        updated[activeNodeIndex] = {
          ...updated[activeNodeIndex],
          captured: true,
          thumbnail
        };

        const allDone = updated.every(n => n.captured);
        if (allDone) {
          canvasConfetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }

        return updated;
      });

      setNodes(prev => {
        const nextIndex = prev.findIndex((n, idx) => !n.captured && idx !== activeNodeIndex);
        if (nextIndex !== -1) {
          setActiveNodeIndex(nextIndex);
        } else {
          const remaining = prev.findIndex(n => !n.captured);
          if (remaining !== -1) {
            setActiveNodeIndex(remaining);
          }
        }
        return prev;
      });

      setLockProgress(0);
      setIsLocking(false);
    }
  };

  // 5. Desktop drag-simulator controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobileDevice) return;
    setIsMouseDown(true);
    mouseStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown) return;
    const deltaX = e.clientX - mouseStart.current.x;
    const deltaY = e.clientY - mouseStart.current.y;

    let nextYaw = (simYaw - deltaX * 0.15) % 360;
    if (nextYaw < 0) nextYaw += 360;
    
    let nextPitch = Math.max(-45, Math.min(45, simPitch + deltaY * 0.15));

    setSimYaw(Math.round(nextYaw));
    setSimPitch(Math.round(nextPitch));

    setYaw(Math.round(nextYaw));
    setPitch(Math.round(nextPitch));

    mouseStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  // 6. Gyroscopic Target Tracking & Auto-Lock Logic
  const activeNode = nodes[activeNodeIndex];
  const targetYaw = activeNode?.yaw || 0;
  const targetPitch = activeNode?.pitch || 0;

  let diffYaw = targetYaw - yaw;
  if (diffYaw > 180) diffYaw -= 360;
  if (diffYaw < -180) diffYaw += 360;

  let diffPitch = targetPitch - pitch;
  const angularDistance = Math.sqrt(diffYaw * diffYaw + diffPitch * diffPitch);

  useEffect(() => {
    if (angularDistance < 3.5) {
      if (!isLocking) {
        setIsLocking(true);
        setLockProgress(0);

        let progress = 0;
        alignTimer.current = setInterval(() => {
          progress += 10;
          setLockProgress(progress);
          
          if (progress >= 100) {
            if (alignTimer.current) clearInterval(alignTimer.current);
            captureFrame();
          }
        }, 80);
      }
    } else {
      if (isLocking) {
        if (alignTimer.current) {
          clearInterval(alignTimer.current);
        }
        setIsLocking(false);
        setLockProgress(0);
      }
    }

    return () => {
      if (alignTimer.current) clearInterval(alignTimer.current);
    };
  }, [angularDistance, isLocking, activeNodeIndex]);

  // Handle final mock finish and upload images list
  const handleFinishCapture = async () => {
    const capturedImages = nodes
      .filter(n => n.captured && n.thumbnail)
      .map(n => n.thumbnail as string);

    if (capturedImages.length === 0) {
      alert('Please capture at least 1-2 overlapping frames to stitch a panorama!');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          panoId,
          images: capturedImages
        })
      });

      if (res.ok) {
        router.push(`/editor/${projectId}?stitching=true`);
      } else {
        alert('Failed to upload captured files to Next server.');
      }
    } catch (e) {
      console.error(e);
      alert('Server upload pipeline encountered an error.');
    } finally {
      setIsUploading(false);
    }
  };

  const capturedCount = nodes.filter(n => n.captured).length;
  const progressPercent = Math.round((capturedCount / nodes.length) * 100);

  const maxOffset = 120;
  const indicatorX = Math.max(-maxOffset, Math.min(maxOffset, diffYaw * 8));
  const indicatorY = Math.max(-maxOffset, Math.min(maxOffset, -diffPitch * 8)); // invert Y

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Fullscreen Shutter Blink Flash Overlay */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 shutter-flash pointer-events-none"></div>
      )}

      {/* 2. WebRTC Live Camera Stream */}
      {hasCameraAccess && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
      )}

      {/* Camera Access Block */}
      {hasCameraAccess === false && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            SphereCam AI needs direct browser permissions to access your mobile rear camera and stream live feed coordinates.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-Request Permissions
            </button>
            <button
              onClick={() => router.back()}
              className="w-full py-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
            >
              Go Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* 3. Space Cockpit HUD Elements Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
        
        {/* Top Control Bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400 block">Capture Sphere Room</span>
            <span className="text-xs font-bold text-pink-300 mt-0.5 block">Yaw: {yaw}° • Pitch: {pitch}°</span>
          </div>

          <div className="w-9 h-9"></div>
        </div>

        {/* HUD Center Target crosshairs & Alignment bubble */}
        <div className="relative flex-1 flex items-center justify-center">
          
          {/* Main Grid Compass Ring */}
          <div className="w-56 h-56 rounded-full border border-white/5 flex items-center justify-center relative">
            <div className="w-40 h-40 rounded-full border border-white/10 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-pink-500/20 flex items-center justify-center">
                
                {/* Center Crosshair Aim */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute w-4 h-0.5 bg-white/60"></div>
                  <div className="absolute h-4 w-0.5 bg-white/60"></div>
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                </div>

              </div>
            </div>

            {/* Radar swept lines */}
            <div className="absolute w-full h-0.5 bg-white/5 top-1/2 -translate-y-1/2"></div>
            <div className="absolute h-full w-0.5 bg-white/5 left-1/2 -translate-x-1/2"></div>
            
            {/* Spinning Radar Sweep */}
            <div className="absolute inset-0 border-r border-pink-500/10 rounded-full radar-sweep"></div>

            {/* 4. Active Alignment Target Dot */}
            <div 
              className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-75 z-20 ${
                isLocking 
                  ? 'border-green-400 bg-green-500/20 pulse-glow scale-105' 
                  : 'border-pink-400 bg-pink-500/10'
              }`}
              style={{
                transform: `translate(${indicatorX}px, ${indicatorY}px)`
              }}
            >
              {isLocking ? (
                <span className="text-[8px] font-black text-green-300 tracking-tighter">
                  {lockProgress}%
                </span>
              ) : (
                <div className="w-2.5 h-2.5 bg-pink-400 rounded-full"></div>
              )}
            </div>

            {/* Simulated Desktop drag guide */}
            {!isMobileDevice && (
              <div className="absolute -bottom-16 w-56 text-center text-[10px] text-pink-300 font-medium bg-black/60 py-1 px-3.5 rounded-lg border border-white/10">
                DRAG MOUSE to rotate camera simulator and point at target circles
              </div>
            )}
          </div>

          {/* HUD Level Line indicators */}
          <div 
            className="absolute left-6 right-6 h-0.5 border-t border-dashed transition-transform duration-75"
            style={{ 
              borderColor: Math.abs(roll) > 3 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.2)',
              transform: `rotate(${roll}deg)` 
            }}
          ></div>
        </div>

        {/* Bottom Control and Gallery panel */}
        <div className="bg-gradient-to-t from-black/90 via-black/85 to-transparent pt-12 pb-6 px-4 pointer-events-auto text-center flex flex-col items-center">
          
          {/* Progress gauge */}
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-pink-400" />
                <span>Coverage Grid</span>
              </span>
              <span>{capturedCount} / {nodes.length} Photos Captured ({progressPercent}%)</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Captures Thumbnails Slider list */}
          <div className="w-full max-w-sm flex gap-2.5 overflow-x-auto pb-4 mb-6 scrollbar-thin select-none">
            {nodes.map((node, index) => (
              <div
                key={index}
                onClick={() => !node.captured && setActiveNodeIndex(index)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border relative cursor-pointer overflow-hidden transition-all ${
                  index === activeNodeIndex
                    ? 'border-pink-400 bg-pink-500/10 ring-2 ring-pink-500/20'
                    : node.captured
                    ? 'border-emerald-500/30 bg-emerald-950/20'
                    : 'border-white/5 bg-slate-900/60'
                }`}
              >
                {node.captured && node.thumbnail ? (
                  <img src={node.thumbnail} alt={`Shot ${index}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-slate-500">{node.yaw}°</span>
                )}

                {node.captured && (
                  <div className="absolute bottom-1 right-1 bg-emerald-500 rounded-full p-0.5 text-white">
                    <Check className="w-2 h-2" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Primary capture controls */}
          <div className="w-full max-w-sm flex items-center justify-between gap-4">
            {isMobileDevice && !gyroGranted ? (
              <button
                onClick={requestGyroAccess}
                className="py-2.5 px-4 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl flex-1 transition-colors flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Initialize Gyro</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Clear captured grid images and start fresh?')) {
                    setNodes(nodes.map(n => ({ ...n, captured: false, thumbnail: null })));
                    setActiveNodeIndex(0);
                  }
                }}
                className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset captures"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Manual Shutter Override Button */}
            <button
              onClick={captureFrame}
              className="w-16 h-16 rounded-full border-4 border-pink-500 bg-white hover:bg-pink-100 flex items-center justify-center transition-transform active:scale-95 duration-100 shadow-xl shadow-pink-500/20 shrink-0"
              title="Manual Trigger"
            >
              <div className="w-8 h-8 rounded-full bg-pink-600"></div>
            </button>

            {/* Finish & Process Button */}
            <button
              onClick={handleFinishCapture}
              disabled={isUploading || capturedCount === 0}
              className={`py-3 px-5 rounded-xl text-xs font-bold transition-all duration-200 flex-1 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 ${
                capturedCount > 0
                  ? 'bg-pink-600 text-white hover:bg-pink-500 shadow-pink-500/15'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Stitch Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function CapturePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-3"></div>
        <span className="text-xs font-semibold">Initializing Camera Stream...</span>
      </div>
    }>
      <CapturePageContent />
    </React.Suspense>
  );
}
