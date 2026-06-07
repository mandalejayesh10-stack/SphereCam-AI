'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { 
  Camera, Eye, Layers, Settings, Compass, Sliders, 
  Download, Code, Share2, Plus, ArrowLeft, Terminal, 
  Sparkles, Save, CheckCircle2, AlertCircle, Trash2, Edit, X 
} from 'lucide-react';
import { Project, Panorama, Hotspot } from '@/lib/types';
import HotspotModal from '@/components/HotspotModal';

// Dynamically import WebGL ThreeViewer
const ThreeViewer = nextDynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-2xl border border-card-border animate-pulse min-h-[450px]">
      <Compass className="w-10 h-10 text-pink-500 animate-spin mb-3" />
      <span className="text-xs text-text-muted font-semibold tracking-wider">Loading Spatial Canvas...</span>
    </div>
  )
});

function EditorPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const isStitchingUrlTrigger = searchParams.get('stitching') === 'true';

  const [project, setProject] = useState<Project | null>(null);
  const [activePanoIndex, setActivePanoIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Sliders for image adjustment
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);

  // Hotspot addition states
  const [showHotspotModal, setShowHotspotModal] = useState<boolean>(false);
  const [pendingHotspotCoords, setPendingHotspotCoords] = useState<{ yaw: number; pitch: number } | null>(null);

  // Room additions
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [showAddRoom, setShowAddRoom] = useState<boolean>(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState<string>('');

  // Stitching process logs state
  const [isStitching, setIsStitching] = useState<boolean>(false);
  const [stitchLogs, setStitchLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Export Drawer State
  const [showExportDrawer, setShowExportDrawer] = useState<boolean>(false);
  const [downloadingTour, setDownloadingTour] = useState<boolean>(false);
  const [downloadingHtml, setDownloadingHtml] = useState<boolean>(false);

  const fetchProject = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data: Project[] = await res.json();
        const found = data.find((p) => p.id === projectId);
        if (found) {
          setProject(found);
          if (found.panoramas.length > 0) {
            setActivePanoIndex(0);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load project details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (project && isStitchingUrlTrigger && !isStitching && project.panoramas[activePanoIndex]?.status === 'pending') {
      handleStitchPanorama();
    }
  }, [project, isStitchingUrlTrigger]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [stitchLogs]);

  const activePano = project?.panoramas[activePanoIndex];

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newRoomName.trim()) return;

    const newPano: Panorama = {
      id: 'pano-' + Math.random().toString(36).substr(2, 9),
      projectId: project.id,
      name: newRoomName.trim(),
      rawImages: [],
      status: 'pending',
      hotspots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedProject = {
      ...project,
      panoramas: [...project.panoramas, newPano]
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (res.ok) {
        setProject(updatedProject);
        setActivePanoIndex(updatedProject.panoramas.length - 1);
        setNewRoomName('');
        setShowAddRoom(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameRoom = async (panoId: string, newName: string) => {
    if (!project || !newName.trim()) return;

    const updatedPanoramas = project.panoramas.map((p) => {
      if (p.id === panoId) {
        return { ...p, name: newName.trim(), updatedAt: new Date().toISOString() };
      }
      return p;
    });

    const updatedProject = {
      ...project,
      panoramas: updatedPanoramas
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (res.ok) {
        setProject(updatedProject);
        setEditingRoomId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoom = async (panoId: string) => {
    if (!project) return;
    if (project.panoramas.length <= 1) {
      alert('A virtual tour project must contain at least one room panorama.');
      return;
    }
    if (!confirm('Are you sure you want to delete this room?')) return;

    const filteredPanos = project.panoramas.filter(p => p.id !== panoId);
    const updatedProject = {
      ...project,
      panoramas: filteredPanos
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (res.ok) {
        setProject(updatedProject);
        setActivePanoIndex(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddHotspot = (yaw: number, pitch: number) => {
    setPendingHotspotCoords({ yaw, pitch });
    setShowHotspotModal(true);
  };

  const handleSaveHotspot = async (data: {
    type: 'info' | 'scene';
    title: string;
    description?: string;
    targetPanoramaId?: string;
    size: number;
  }) => {
    if (!project || !activePano || !pendingHotspotCoords) return;

    const newHotspot: Hotspot = {
      id: 'hotspot-' + Math.random().toString(36).substr(2, 9),
      panoramaId: activePano.id,
      type: data.type,
      pitch: pendingHotspotCoords.pitch,
      yaw: pendingHotspotCoords.yaw,
      title: data.title,
      description: data.description,
      targetPanoramaId: data.targetPanoramaId,
      size: data.size
    };

    const updatedPanoramas = project.panoramas.map((p, idx) => {
      if (idx === activePanoIndex) {
        return {
          ...p,
          hotspots: [...p.hotspots, newHotspot]
        };
      }
      return p;
    });

    const updatedProject = {
      ...project,
      panoramas: updatedPanoramas
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (res.ok) {
        setProject(updatedProject);
        setShowHotspotModal(false);
        setPendingHotspotCoords(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHotspotClick = (hs: Hotspot) => {
    if (hs.type === 'scene' && hs.targetPanoramaId) {
      const targetIndex = project?.panoramas.findIndex(p => p.id === hs.targetPanoramaId);
      if (targetIndex !== undefined && targetIndex !== -1) {
        setActivePanoIndex(targetIndex);
      }
    } else {
      alert(`[Info Marker]: ${hs.title}\n\n${hs.description || 'No description provided.'}`);
    }
  };

  const handleDeleteHotspot = async (hotspotId: string) => {
    if (!project || !activePano) return;

    const updatedHotspots = activePano.hotspots.filter(h => h.id !== hotspotId);

    const updatedPanoramas = project.panoramas.map((p, idx) => {
      if (idx === activePanoIndex) {
        return {
          ...p,
          hotspots: updatedHotspots
        };
      }
      return p;
    });

    const updatedProject = {
      ...project,
      panoramas: updatedPanoramas
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (res.ok) {
        setProject(updatedProject);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStitchPanorama = async () => {
    if (!project || !activePano) return;

    setIsStitching(true);
    setStitchLogs([
      '🚀 SphereCam AI Offline Python Stitching Worker Initialized.',
      `📂 Input Project Directory: uploads/${project.id}`,
      `📷 Detecting raw camera captures: ${activePano.rawImages.length} frames found.`,
      '⚙️ Launching Computer Vision homography warp model...'
    ]);

    try {
      const res = await fetch('/api/projects/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          panoramaId: activePano.id
        })
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value);
            const logLines = textChunk.split('\n').filter(Boolean);
            
            setStitchLogs(prev => [...prev, ...logLines]);
          }
        }

        await fetchProject();
      } else {
        setStitchLogs(prev => [...prev, '❌ Error: Backend stitching service execution failed.']);
      }
    } catch (e) {
      console.error(e);
      setStitchLogs(prev => [...prev, '❌ Error: Failed to establish network handshake with Python engine.']);
    } finally {
      setIsStitching(false);
    }
  };

  const handleDownloadOfflineHtml = async () => {
    if (!project) return;

    setDownloadingHtml(true);
    try {
      const res = await fetch(`/api/projects/download-tour?projectId=${project.id}&format=html`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `spherecam-tour-${project.name.toLowerCase().replace(/\s+/g, '-')}.html`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else {
        alert('Failed to compile standalone HTML virtual tour.');
      }
    } catch (err) {
      console.error(err);
      alert('HTML compiler encountered a packaging failure.');
    } finally {
      setDownloadingHtml(false);
    }
  };

  const handleDownloadOfflineTour = async () => {
    if (!project) return;

    setDownloadingTour(true);
    try {
      const res = await fetch(`/api/projects/download-tour?projectId=${project.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `spherecam-tour-${project.name.toLowerCase().replace(/\s+/g, '-')}.zip`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } else {
        alert('Failed to pack standalone virtual tour.');
      }
    } catch (err) {
      console.error(err);
      alert('ZIP builder encountered a packaging failure.');
    } finally {
      setDownloadingTour(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-9 h-9 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-4"></div>
        <span className="text-text-muted text-xs font-semibold tracking-widest uppercase">Opening 3D Workspace...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-foreground mb-2">Project Workspace Not Found</h3>
        <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
          The requested virtual tour workspace does not exist or has been deleted from this console.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="py-2.5 px-6 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const otherRooms = project.panoramas
    .filter((p) => p.id !== activePano?.id)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="min-h-screen bg-background flex flex-col pt-24 px-4 md:px-8 pb-10 transition-colors duration-300">
      
      {/* Editor Header Bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 text-left">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-foreground/5 border border-border-muted flex items-center justify-center text-text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-1.5 animate-fade-in">
              {project.name}
            </h1>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{project.description || 'Virtual tour planner'}</p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="bg-foreground/5 border border-border-muted p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setIsEditMode(false)}
              className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                !isEditMode
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => setIsEditMode(true)}
              className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                isEditMode
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-text-muted hover:text-foreground'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Edit Hotspots
            </button>
          </div>

          <button
            onClick={() => setShowExportDrawer(true)}
            className="py-2.5 px-4 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-600/10 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export Tour
          </button>
        </div>
      </div>

      {/* Editor Working Grid */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        
        {/* Left Hand Room manager Column */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          
          {/* Room Directory List */}
          <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between border-card-border text-left">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Tour Room Folders</span>
                
                <button
                  onClick={() => setShowAddRoom(!showAddRoom)}
                  className="p-1 rounded-lg bg-foreground/5 text-text-muted border border-border-muted hover:text-foreground hover:bg-foreground/10 transition-colors"
                  title="Add Room Folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add Room inline Form */}
              {showAddRoom && (
                <form onSubmit={handleAddRoom} className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <input
                    type="text"
                    required
                    placeholder="Room name (e.g. Patio)"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-foreground/5 border border-border-muted rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-pink-500/50"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(false)}
                      className="px-2 py-1.5 text-[10px] font-semibold text-text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold rounded-lg"
                    >
                      Add Room
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {project.panoramas.map((pano, index) => {
                  const isEditing = pano.id === editingRoomId;
                  return (
                    <div
                      key={pano.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        index === activePanoIndex
                          ? 'border-pink-500 bg-pink-600/10'
                          : 'border-border-muted bg-foreground/3 hover:bg-foreground/5 hover:border-card-border'
                      }`}
                      onClick={() => setActivePanoIndex(index)}
                    >
                      <div className="flex-1 mr-2 text-left">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingRoomName}
                            onChange={(e) => setEditingRoomName(e.target.value)}
                            className="w-full bg-background border border-pink-500/50 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameRoom(pano.id, editingRoomName);
                              }
                            }}
                          />
                        ) : (
                          <>
                            <span className="text-xs font-bold text-foreground block">{pano.name}</span>
                            <span className="text-[9px] font-bold text-text-muted tracking-wider block mt-1 uppercase">
                              {pano.status === 'completed' 
                                ? '360 Active' 
                                : pano.rawImages.length > 0 
                                ? `${pano.rawImages.length} Captured` 
                                : 'Empty Draft'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameRoom(pano.id, editingRoomName);
                              }}
                              className="text-emerald-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                              title="Save Name"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRoomId(null);
                              }}
                              className="text-text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRoomId(pano.id);
                                setEditingRoomName(pano.name);
                              }}
                              className="text-text-muted hover:text-pink-500 p-1.5 rounded-lg hover:bg-pink-500/10 transition-colors"
                              title="Rename Room"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoom(pano.id);
                              }}
                              className="text-text-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Delete Room Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border-muted pt-4 mt-6">
              <span className="text-[9px] uppercase font-bold text-text-muted tracking-widest block mb-3">Room Source Captured</span>
              
              <Link
                href={`/capture?projectId=${project.id}&panoId=${activePano?.id || ''}`}
                className="w-full py-3 bg-foreground/5 border border-border-muted hover:bg-foreground/10 text-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4 text-pink-500" />
                <span>Open Phone HUD</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Center Canvas 360 Viewer Columns */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Main 360 View panel */}
          <div className="glass-panel p-3 rounded-3xl border-card-border flex-1 relative min-h-[460px] flex flex-col bg-card transition-colors">
            {activePano?.status === 'completed' && activePano?.stitchedUrl ? (
              <div className="w-full flex-1 min-h-[440px] relative">
                <ThreeViewer
                  imageUrl={activePano.stitchedUrl}
                  hotspots={activePano.hotspots}
                  onAddHotspot={handleOpenAddHotspot}
                  onHotspotClick={handleHotspotClick}
                  isEditMode={isEditMode}
                  brightness={brightness}
                  contrast={contrast}
                  saturation={saturation}
                />
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-8 bg-foreground/3 rounded-2xl border border-border-muted min-h-[440px]">
                <Layers className="w-14 h-14 text-pink-500/30 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-foreground mb-2">No Stitched Panorama Visible</h3>
                <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                  {activePano?.rawImages && activePano.rawImages.length > 0 
                    ? `You have successfully captured ${activePano.rawImages.length} overlapping frame images! Ready to blend them into a complete spherical 360° panorama.`
                    : 'This room is currently empty. Open the mobile smartphone camera to capture overlapping frame photos, or choose a preloaded demo.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  {activePano?.rawImages && activePano.rawImages.length > 0 ? (
                    <button
                      onClick={handleStitchPanorama}
                      disabled={isStitching}
                      className="w-full py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Stitch via Cloud AI</span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/capture?projectId=${project.id}&panoId=${activePano?.id || ''}`}
                        className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-pink-600/10"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Launch Camera Capture</span>
                      </Link>
                      <button
                        onClick={async () => {
                          if (project && activePano) {
                            const updatedProject = { ...project };
                            const idx = updatedProject.panoramas.findIndex(p => p.id === activePano.id);
                            if (idx !== -1) {
                              updatedProject.panoramas[idx].rawImages = Array.from({ length: 12 }, (_, i) => `frame_${i}.jpg`);
                              setProject(updatedProject);
                              await fetch('/api/projects', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedProject)
                              });
                            }
                          }
                        }}
                        className="w-full py-3 bg-foreground/5 border border-border-muted text-foreground/80 hover:bg-foreground/10 text-xs font-semibold rounded-xl"
                      >
                        Seed Mock Captures
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Subsystem: Logs console vs Sliders adjustment */}
          <div className="grid md:grid-cols-2 gap-6 text-left">
            
            {/* Stitching worker console */}
            <div className="glass-panel p-5 rounded-2xl border-card-border flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center justify-between mb-3 border-b border-border-muted pb-2">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-pink-400" /> Stitcher System Console
                </span>
                {isStitching && (
                  <span className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-ping"></span>
                )}
              </div>

              <div className="flex-1 bg-black/90 rounded-xl p-3.5 font-mono text-[10px] text-slate-300 overflow-y-auto max-h-36 border border-border-muted leading-relaxed">
                {stitchLogs.length === 0 ? (
                  <span className="text-slate-500 italic">Console idle. Awaiting stitching execution...</span>
                ) : (
                  <div className="space-y-1">
                    {stitchLogs.map((log, idx) => (
                      <div key={idx} className={log.startsWith('❌') ? 'text-rose-400' : log.startsWith('✓') || log.startsWith('🚀') ? 'text-emerald-400' : 'text-slate-300'}>
                        {log}
                      </div>
                    ))}
                    <div ref={terminalEndRef}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Sliders adjustments */}
            <div className="glass-panel p-5 rounded-2xl border-card-border flex flex-col justify-between min-h-[220px]">
              <div className="flex items-center gap-1.5 mb-3 border-b border-border-muted pb-2">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Image Filter Sliders</span>
              </div>

              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Brightness</span>
                    <span className="text-pink-500 font-bold">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-pink-500 bg-foreground/10"
                    disabled={!activePano?.stitchedUrl}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Contrast</span>
                    <span className="text-pink-500 font-bold">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-pink-500 bg-foreground/10"
                    disabled={!activePano?.stitchedUrl}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Hotspots management lists */}
          {isEditMode && activePano && activePano.hotspots.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border-card-border text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-3">Hotspots in this scene</span>
              <div className="grid md:grid-cols-2 gap-3">
                {activePano.hotspots.map((hs) => (
                  <div key={hs.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/3 border border-border-muted">
                    <div>
                      <span className="text-xs font-bold text-foreground block">{hs.title}</span>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5 block">
                        {hs.type === 'scene' ? 'Walk to other room' : 'Detail Card info'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteHotspot(hs.id)}
                      className="text-text-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete Hotspot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      <HotspotModal
        isOpen={showHotspotModal}
        onClose={() => setShowHotspotModal(false)}
        onSave={handleSaveHotspot}
        availableRooms={otherRooms}
      />

      {showExportDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowExportDrawer(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"></div>
          
          <div className="relative glass-panel-heavy max-w-lg w-full p-6 rounded-3xl shadow-2xl border border-card-border animate-in fade-in zoom-in-95 duration-150 text-left">
            <button
              onClick={() => setShowExportDrawer(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-foreground mb-2">Publish & Export Options</h3>
            <p className="text-xs text-text-muted mb-6">Distribute your immersive tour across websites, client listings, or compile a complete self-contained offline package.</p>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-foreground/3 border border-border-muted hover:border-pink-500/20 transition-all flex items-start gap-4">
                <div className="w-10 h-10 bg-pink-600/10 border border-pink-500/20 text-pink-500 rounded-xl flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">Standalone Offline Bundle</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Compiles all stitched high-res rooms, hotspots, and WebGL viewer code into a self-contained player.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3.5">
                    <button
                      onClick={handleDownloadOfflineHtml}
                      disabled={downloadingHtml}
                      className="py-2 px-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {downloadingHtml ? (
                        <>
                          <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin"></div>
                          <span>Compiling HTML...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Single HTML File</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDownloadOfflineTour}
                      disabled={downloadingTour}
                      className="py-2 px-4 bg-foreground/10 hover:bg-foreground/15 text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded-xl border border-border-muted transition-all flex items-center gap-1.5"
                    >
                      {downloadingTour ? (
                        <>
                          <div className="w-3 h-3 rounded-full border border-foreground border-t-transparent animate-spin font-semibold"></div>
                          <span>Packing ZIP...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download ZIP Package</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-foreground/3 border border-border-muted hover:border-pink-500/20 transition-all flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-600/10 border border-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                  <Code className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">HTML Embed Code (Iframe)</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Embed the interactive 360 viewer directly on your real estate blogs, listing feeds, or corporate portal.
                  </p>
                  <div className="mt-3 bg-black/90 p-2.5 rounded-xl border border-border-muted font-mono text-[9px] text-pink-500 break-all select-all">
                    {`<iframe src="http://localhost:3000/editor/${project.id}?embed=true" width="100%" height="450px" style="border:none;border-radius:12px;" allow="gyroscope;accelerometer"></iframe>`}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-foreground/3 border border-border-muted hover:border-pink-500/20 transition-all flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-600/10 border border-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-foreground">Public Share Link</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Send this URL directly to home buyers or clients to walk around the property interactively.
                  </p>
                  <div className="mt-3 bg-black/90 p-2.5 rounded-xl border border-border-muted font-mono text-[9px] text-foreground/80 select-all">
                    {`http://localhost:3000/editor/${project.id}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportDrawer(false)}
                className="py-2 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-xl"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function EditorPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-3"></div>
        <span className="text-xs font-semibold">Opening 3D Workspace...</span>
      </div>
    }>
      <EditorPageContent />
    </React.Suspense>
  );
}
