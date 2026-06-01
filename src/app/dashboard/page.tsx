'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, Camera, Eye, Trash2, Calendar, Layout, 
  Settings, User, Folder, Compass, Layers, 
  HelpCircle, BarChart3, AlertCircle, HardDrive, CheckCircle2 
} from 'lucide-react';
import { Project } from '@/lib/types';

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch projects from local API
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });

      if (res.ok) {
        const createdProject = await res.json();
        setProjects([createdProject, ...projects]);
        setShowCreateModal(false);
        setNewProjectName('');
        setNewProjectDesc('');
        
        // Auto navigate to capture or editor
        router.push(`/editor/${createdProject.id}`);
      }
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project and all its virtual tours?')) return;

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // Calculate metrics
  const totalProjects = projects.length;
  const activePanos = projects.reduce((acc, p) => acc + p.panoramas.length, 0);
  const stitchedPanos = projects.reduce((acc, p) => 
    acc + p.panoramas.filter(pano => pano.status === 'completed').length, 0
  );

  return (
    <div className="min-h-screen bg-background grid-bg pt-28 pb-16 px-4 md:px-8 relative z-10 transition-colors duration-300">
      {/* Page Container */}
      <div className="max-w-6xl mx-auto">
        
        {/* Welcome Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 text-left">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              Workspace Console
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Manage your 360° virtual tours, review camera capture feeds, and customize tour hotspots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation Premium Plan Badge */}
            <div className="glass-panel py-2 px-4 rounded-xl border-pink-500/20 text-xs font-semibold text-pink-500 flex items-center gap-1.5 shadow-lg shadow-purple-950/20">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              <span>Pro Plan Active</span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-pink-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Tour
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
          <div className="glass-panel p-5 rounded-2xl border-border-muted">
            <Folder className="w-5 h-5 text-pink-500 mb-3" />
            <div className="text-2xl font-black text-foreground">{totalProjects}</div>
            <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mt-0.5">Total Projects</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border-border-muted">
            <Compass className="w-5 h-5 text-purple-500 mb-3 animate-spin-slow" />
            <div className="text-2xl font-black text-foreground">{activePanos}</div>
            <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mt-0.5">Total Rooms</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border-border-muted">
            <CheckCircle2 className="w-5 h-5 text-fuchsia-500 mb-3" />
            <div className="text-2xl font-black text-foreground">{stitchedPanos}</div>
            <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mt-0.5">Stitched Spheres</div>
          </div>
          <div className="glass-panel p-5 rounded-2xl border-border-muted">
            <HardDrive className="w-5 h-5 text-amber-500 mb-3" />
            <div className="text-2xl font-black text-foreground">41.8 MB</div>
            <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mt-0.5">Storage Used</div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-3"></div>
            <span className="text-text-muted text-xs font-semibold tracking-wider">Syncing Cloud Database...</span>
          </div>
        ) : projects.length === 0 ? (
          // Empty State
          <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-border-muted max-w-xl mx-auto">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground/80">No Projects Found</h3>
            <p className="text-text-muted text-xs max-w-xs mx-auto mt-2 leading-relaxed">
              Create your very first project folder to upload panoramas, activate mobile cameras, or stitch scenes.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 py-2 px-5 bg-foreground/5 border border-border-muted hover:bg-foreground/10 text-foreground text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Set Up Initial Project
            </button>
          </div>
        ) : (
          // Projects Grid List
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const finishedPano = project.panoramas.find(pano => pano.status === 'completed');
              const backgroundStyle = finishedPano?.stitchedUrl 
                ? { backgroundImage: `linear-gradient(to bottom, rgba(12,8,18,0.3), var(--background)), url(${finishedPano.stitchedUrl})` }
                : undefined;

              return (
                <div
                  key={project.id}
                  className="glass-panel rounded-2xl border-border-muted flex flex-col justify-between overflow-hidden shadow-xl hover:border-pink-500/30 transition-all duration-300 group"
                >
                  {/* Card Thumbnail Header */}
                  <div 
                    className="h-36 bg-card bg-cover bg-center p-5 flex flex-col justify-between relative"
                    style={backgroundStyle}
                  >
                    {!finishedPano && (
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/10 to-background pointer-events-none"></div>
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[9px] font-bold tracking-widest uppercase py-1 px-2.5 rounded-full bg-black/60 text-pink-300 border border-pink-500/20 backdrop-blur-md">
                        {project.id === 'demo-living-room' ? 'Sample Demo' : 'Draft Project'}
                      </span>

                      {/* Delete action */}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="w-8 h-8 rounded-lg bg-black/60 text-slate-400 border border-border-muted flex items-center justify-center hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-500/20 transition-all duration-200"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative z-10 text-left">
                      <h3 className="font-extrabold text-white text-lg tracking-tight group-hover:text-pink-200 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between text-left bg-card transition-colors duration-350">
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-6">
                      {project.description || 'No description provided for this virtual tour project.'}
                    </p>

                    <div className="space-y-4">
                      {/* Panoramas status list */}
                      <div className="border-t border-border-muted pt-4">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-text-muted tracking-wider mb-2">
                          <span>Panorama Rooms</span>
                          <span>{project.panoramas.length} Scene(s)</span>
                        </div>

                        <div className="space-y-1.5">
                          {project.panoramas.map((pano) => (
                            <div 
                              key={pano.id} 
                              className="flex items-center justify-between bg-foreground/5 py-1.5 px-3 rounded-lg border border-border-muted"
                            >
                              <span className="text-xs font-semibold text-foreground/80 truncate max-w-[120px]">{pano.name}</span>
                              <div className="flex items-center gap-1.5">
                                {pano.status === 'completed' && (
                                  <span className="text-[9px] font-bold bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/25 px-2 py-0.5 rounded-md">Stitched</span>
                                )}
                                {pano.status === 'processing' && (
                                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded-md animate-pulse">Processing...</span>
                                )}
                                {pano.status === 'pending' && (
                                  <span className="text-[9px] font-bold bg-foreground/5 text-text-muted border border-border-muted px-2 py-0.5 rounded-md">Empty Draft</span>
                                )}
                                {pano.status === 'failed' && (
                                  <span className="text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/25 px-2 py-0.5 rounded-md">Failed</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {/* Access Phone Camera Button */}
                        <Link
                          href={`/capture?projectId=${project.id}&panoId=${project.panoramas[0]?.id || ''}`}
                          className="py-2.5 px-3 bg-foreground/5 border border-border-muted text-foreground/80 text-xs font-bold rounded-xl hover:bg-foreground/10 hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5 text-pink-500" />
                          <span>Capture Phone</span>
                        </Link>

                        {/* Open editor button */}
                        <Link
                          href={`/editor/${project.id}`}
                          className="py-2.5 px-3 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl hover:bg-pink-500 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/15"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Interactive Editor</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Creation Modal Popup Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => !actionLoading && setShowCreateModal(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
          ></div>

          <div className="relative glass-panel-heavy max-w-md w-full p-6 rounded-2xl shadow-2xl border border-card-border animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-foreground mb-2">Create New Tour Project</h3>
            <p className="text-xs text-text-muted mb-6">Initialize a virtual tour directory. Once initialized, you can upload overlapping photos or capture from your phone.</p>

            <form onSubmit={handleCreateProject} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] uppercase font-bold text-text-muted tracking-wider mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cozy Bedroom, Sunset Balcony"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-foreground/5 border border-border-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none focus:border-pink-500/50"
                  disabled={actionLoading}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-text-muted tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Provide property details, address, or space comments..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-foreground/5 border border-border-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none focus:border-pink-500/50 resize-none"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-muted">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2 px-4 bg-transparent text-text-muted hover:text-foreground text-xs font-semibold transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-pink-500/10"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create & Open Editor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
