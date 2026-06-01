'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Camera, Sparkles, Smartphone, Share2, Eye, Compass, 
  ArrowRight, Check, X, ShieldAlert, CheckCircle2, ShieldCheck, 
  HelpCircle, ChevronRight, Play, Flame, CheckCircle, Globe 
} from 'lucide-react';

// Dynamically import ThreeViewer to prevent Next.js SSR crashes
const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-2xl border border-card-border animate-pulse min-h-[450px]">
      <Compass className="w-10 h-10 text-pink-500 animate-spin mb-3" />
      <span className="text-xs text-text-muted font-medium tracking-wide">Initializing 360° WebGL Renderer...</span>
    </div>
  )
});

// Dynamically import GlobeViewer
const GlobeViewer = dynamic(() => import('@/components/GlobeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex flex-col items-center justify-center bg-transparent rounded-full animate-pulse">
      <Globe className="w-16 h-16 text-purple-500 animate-spin mb-3" />
      <span className="text-xs text-text-muted font-semibold tracking-wider">Compiling 3D Wireframe Globe...</span>
    </div>
  )
});

export default function LandingPage() {
  const [currentScene, setCurrentScene] = useState<'living' | 'balcony'>('living');

  // Pre-packaged demo hotspots for the landing page hero
  const livingHotspots = [
    {
      id: 'hs-balcony',
      panoramaId: 'pano-living',
      type: 'scene' as const,
      pitch: 0,
      yaw: 135,
      title: 'Walk to Sunset Balcony'
    },
    {
      id: 'hs-tv-info',
      panoramaId: 'pano-living',
      type: 'info' as const,
      pitch: -5,
      yaw: -45,
      title: 'Integrated 8K OLED TV',
      description: 'Connected smart automation screen controlled completely through local Wi-Fi.'
    }
  ];

  const balconyHotspots = [
    {
      id: 'hs-living',
      panoramaId: 'pano-balcony',
      type: 'scene' as const,
      pitch: 0,
      yaw: -45,
      title: 'Return to Living Room'
    },
    {
      id: 'hs-view-info',
      panoramaId: 'pano-balcony',
      type: 'info' as const,
      pitch: 10,
      yaw: 180,
      title: 'Direct Sunset Ocean Views',
      description: 'Spectacular wide-angle visual sight from the penthouse master balcony.'
    }
  ];

  const handleHotspotClick = (hs: any) => {
    if (hs.id === 'hs-balcony') {
      setCurrentScene('balcony');
    } else if (hs.id === 'hs-living') {
      setCurrentScene('living');
    }
  };

  return (
    <div className="relative min-h-screen grid-bg overflow-x-hidden pt-28 bg-background text-foreground transition-colors duration-300">
      {/* Pink/Purple Glow Orbs in Background */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-80 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center text-left">
          
          {/* Left Column: Heading Copy & CTA */}
          <div className="space-y-8">
            {/* Banner Pill */}
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/25 px-4 py-1.5 rounded-full text-xs font-semibold text-pink-500">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Venture Scale Spatial AI Platform</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-foreground">
              <span className="block">Global 360° Tours</span>
              <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent block mt-2">
                Captured on your Phone.
              </span>
            </h1>

            <p className="text-base md:text-lg text-text-muted max-w-xl leading-relaxed font-light">
              No hardware constraints. No expensive cameras. Stitch, map, and publish fully interactive spherical walk-throughs globally using only your standard mobile browser.
            </p>

            {/* Hero Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-pink-600 text-sm font-semibold text-white rounded-2xl hover:bg-pink-500 hover:shadow-xl hover:shadow-pink-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Launch Console <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 bg-foreground/5 border border-border-muted text-sm font-semibold text-foreground rounded-2xl hover:bg-foreground/10 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 text-purple-500 animate-pulse" /> Try Interactive Tour
              </a>
            </div>
          </div>

          {/* Right Column: High-Graphics 3D Globe */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-transparent to-purple-500/5 rounded-full filter blur-xl"></div>
            <div className="w-full max-w-md h-[450px]">
              <GlobeViewer />
            </div>
            
            {/* Float HUD card */}
            <div className="absolute bottom-6 right-4 glass-panel p-3.5 rounded-2xl border-card-border max-w-[180px] pointer-events-none text-left">
              <span className="text-[9px] uppercase font-black text-pink-500 tracking-widest block">Spatial Mapping</span>
              <span className="text-xs font-bold text-foreground mt-1 block">Procedural SIFT alignment active globally</span>
            </div>
          </div>

        </div>
      </section>

      {/* Embedded Interactive 360 Scene Demo */}
      <section id="demo" className="max-w-6xl mx-auto px-4 py-20 scroll-mt-24 relative z-10">
        <div className="text-center mb-10">
          <span className="text-[10px] tracking-widest uppercase font-bold text-purple-500 border border-card-border py-1 px-3 bg-purple-500/5 rounded-full">Interactive Scene Sandbox</span>
          <h2 className="text-3xl font-extrabold text-foreground mt-4">Stitched Output Quality</h2>
        </div>

        <div className="relative max-w-5xl mx-auto glass-panel p-3.5 rounded-3xl shadow-2xl border border-card-border mb-20">
          <div className="absolute top-6 left-6 z-40 bg-pink-600/90 text-white font-bold text-[10px] tracking-widest uppercase py-1 px-2.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
            <span>Live Interactive WebGL Render</span>
          </div>

          <div className="w-full h-[520px]">
            {currentScene === 'living' ? (
              <ThreeViewer
                imageUrl="/samples/luxury_living_room.jpg"
                hotspots={livingHotspots}
                onHotspotClick={handleHotspotClick}
              />
            ) : (
              <ThreeViewer
                imageUrl="/samples/luxury_balcony.jpg"
                hotspots={balconyHotspots}
                onHotspotClick={handleHotspotClick}
              />
            )}
          </div>

          {/* Viewer Floating Guide */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 glass-panel py-2 px-5 rounded-full text-xs font-semibold text-foreground/90 border border-card-border flex items-center gap-2 pointer-events-none">
            <Compass className="w-4 h-4 text-pink-500 animate-spin-slow" />
            <span>Drag mouse to look 360° • Click circular nodes to navigate</span>
          </div>
        </div>
      </section>

      {/* Problem & Solution Table Section */}
      <section className="bg-card/40 py-24 border-y border-border-muted relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Why SphereAI is the Future</h2>
            <p className="text-text-muted max-w-2xl mx-auto font-light">
              Traditional virtual tour setups are slow, complex, and cost thousands. SphereAI gives you identical quality for free.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {/* The Old Way */}
            <div className="glass-panel p-8 rounded-2xl border-rose-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground/90">The Hard, Expensive Way</h3>
              </div>
              <ul className="space-y-4 text-sm text-text-muted">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Buy hardware starting from $400 (Ricoh Theta) to $3,500 (Matterport Pro2).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Carry heavy tripods, charging packs, and bulky cases to listings.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Forces native app downloads and mandatory hardware linking.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Expensive subscription lock-ins ($50/mo minimum) just to host listings.</span>
                </li>
              </ul>
            </div>

            {/* The SphereAI Way */}
            <div className="glass-panel p-8 rounded-2xl border-pink-500/20 relative">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold tracking-wide uppercase py-1 px-3 rounded-full shadow-lg shadow-pink-500/20 flex items-center gap-1">
                <Flame className="w-3 h-3 animate-pulse" /> Recommended
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center border border-pink-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">The SphereAI Way</h3>
              </div>
              <ul className="space-y-4 text-sm text-foreground/90">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="font-semibold text-foreground">Zero hardware costs. Use the smartphone camera already in your pocket.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Browser-based spatial HUD acts as a real-time smart levelling guide.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Cloud AI arranges, warps, and stitches images in under 60 seconds.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Fully integrated hotspot tour designer, embed codes, and white-labeling.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-24 relative z-10 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Complete Virtual Tour Ecosystem</h2>
          <p className="text-text-muted max-w-2xl mx-auto font-light">
            Everything you need to capture, stitch, enrich, host, and export gorgeous 360° spaces.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center border border-pink-500/20 mb-6">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">WebRTC HUD Capture</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              No app store downloads. Accesses the camera via standard WebRTC and guides captures using gyroscopic device alignment nodes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center border border-purple-500/20 mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">OpenCV AI Stitcher</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Calculates overlapping features, warps perspectives, adjusts exposures, and stitches frames into perfectly flat 360x180 projections.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center border border-pink-500/20 mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">360° Hotspot Editor</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Double-click to drop interactive spatial hotspots. Link rooms together, write details, or showcase media components in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-card/30 py-24 border-t border-border-muted relative z-10 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Honest, Scale-Friendly Pricing</h2>
            <p className="text-text-muted max-w-2xl mx-auto font-light">
              Choose the package tailored to your commercial virtual tour and project scaling demands.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
            {/* Free Plan */}
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-border-muted">
              <div>
                <h3 className="text-lg font-semibold text-foreground/80 mb-2">Hobby Free</h3>
                <p className="text-text-muted text-xs mb-6">Perfect for listing testing and non-commercial developers.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-text-muted text-sm font-medium">/ month</span>
                </div>
                <ul className="space-y-4 text-sm text-text-muted mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>1 Active Project</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Standard SD resolution stitch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>SphereAI Watermarked tour</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold rounded-xl text-center border border-border-muted transition-colors"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-pink-500/40 relative shadow-xl shadow-pink-500/5">
              <div className="absolute -top-3.5 left-6 bg-pink-600 text-white text-[10px] font-bold tracking-widest uppercase py-1 px-3.5 rounded-full border border-pink-400/30">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Professional</h3>
                <p className="text-text-muted text-xs mb-6">Ideal for active real estate brokers and local photographers.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold text-foreground">$29</span>
                  <span className="text-text-muted text-sm font-medium">/ month</span>
                </div>
                <ul className="space-y-4 text-sm text-foreground/90 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="font-semibold text-foreground">Unlimited Projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>8K Ultra-HD AI stiches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Remove all watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Custom corporate branding</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl text-center shadow-lg shadow-pink-500/20 transition-all active:scale-95"
              >
                Go Pro (7-Day Trial)
              </Link>
            </div>

            {/* Agency Plan */}
            <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-border-muted">
              <div>
                <h3 className="text-lg font-semibold text-foreground/80 mb-2">Agency Suite</h3>
                <p className="text-text-muted text-xs mb-6">For virtual tour agencies, builders, and hotels.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold text-foreground">$89</span>
                  <span className="text-text-muted text-sm font-medium">/ month</span>
                </div>
                <ul className="space-y-4 text-sm text-text-muted mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span className="font-semibold text-foreground">100% White-Labeled Tours</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Deploy on custom domains</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Multi-User team accounts</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/dashboard"
                className="w-full py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold rounded-xl text-center border border-border-muted transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-border-muted text-center text-xs text-text-muted relative z-10">
        <p className="mb-2">© 2026 SphereAI Inc. Built for venture-scale spatial computing.</p>
        <p>Smartphone 360° Equirectangular Stitching Engine • Powered by Next.js & OpenCV</p>
      </footer>
    </div>
  );
}
