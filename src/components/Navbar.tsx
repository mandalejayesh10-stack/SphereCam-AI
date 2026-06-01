'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Layers, CreditCard, LayoutDashboard, Compass, Sun, Moon } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isCapturePage = pathname === '/capture';
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load persistent theme preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'light') {
          document.body.classList.add('light');
        } else {
          document.body.classList.remove('light');
        }
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  };

  // Do not show navigation bar on the active full-screen mobile camera capture page
  if (isCapturePage) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <nav className="max-w-6xl mx-auto glass-panel rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg shadow-black/20">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25 transition-transform duration-300 group-hover:scale-105">
            <Camera className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 opacity-20 blur-md group-hover:opacity-40 transition-opacity"></span>
          </div>
          <span className="font-semibold text-lg tracking-tight text-foreground transition-colors group-hover:text-pink-300">
            SphereCam <span className="font-bold text-pink-500">AI</span>
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <Link href="/#features" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-pink-400" /> Features
          </Link>
          <Link href="/#pricing" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-pink-400" /> Pricing
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4 text-pink-400" /> Dashboard
          </Link>
          <Link href="/dashboard?demo=true" className="hover:text-foreground transition-colors flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-lg border border-border-muted hover:bg-foreground/10">
            <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" /> Interactive Demo
          </Link>
        </div>

        {/* Action Panel: Theme Toggle + CTA */}
        <div className="flex items-center gap-3">
          {/* Working Light/Dark Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-foreground/5 border border-border-muted flex items-center justify-center text-foreground hover:bg-foreground/10 active:scale-95 transition-all duration-200"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-purple-600" />
            )}
          </button>

          <Link
            href="/dashboard"
            className="relative px-5 py-2 text-xs font-semibold tracking-wide text-white bg-pink-600 rounded-xl hover:bg-pink-500 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 active:scale-95"
          >
            Launch Console
          </Link>
        </div>
      </nav>
    </header>
  );
}
