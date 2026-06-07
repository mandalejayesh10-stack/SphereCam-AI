'use client';

import React, { useState } from 'react';
import { X, Info, ArrowRight, Save } from 'lucide-react';

interface HotspotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    type: 'info' | 'scene';
    title: string;
    description?: string;
    targetPanoramaId?: string;
    size: number;
  }) => void;
  availableRooms: Array<{ id: string; name: string }>;
}

export default function HotspotModal({
  isOpen,
  onClose,
  onSave,
  availableRooms
}: HotspotModalProps) {
  const [type, setType] = useState<'info' | 'scene'>('info');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetPanoramaId, setTargetPanoramaId] = useState('');
  const [size, setSize] = useState<number>(40);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      type,
      title: title.trim(),
      description: type === 'info' ? description.trim() : undefined,
      targetPanoramaId: type === 'scene' ? targetPanoramaId : undefined,
      size
    });

    // Reset fields
    setTitle('');
    setDescription('');
    setTargetPanoramaId('');
    setSize(40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"></div>

      {/* Modal Content */}
      <div className="relative glass-panel-heavy max-w-md w-full p-6 rounded-2xl shadow-2xl border border-white/12 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-2">Add Interactive Hotspot</h3>
        <p className="text-xs text-slate-400 mb-6">Attach interactive data points or create walk-through links to other rooms inside your virtual tour.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Switch Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Hotspot Type</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setType('info')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'info'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" /> Info Marker
              </button>
              <button
                type="button"
                onClick={() => setType('scene')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'scene'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Room Transition
              </button>
            </div>
          </div>

          {/* Hotspot Title */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              {type === 'info' ? 'Info Marker Title' : 'Transition Link Text'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'info' ? 'e.g. Master Granite Fireplace' : 'e.g. Walk to Kitchen Patio'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Conditional details based on selection */}
          {type === 'info' ? (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Description Text</label>
              <textarea
                placeholder="Describe this item or location in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Target Room Panorama</label>
              {availableRooms.length === 0 ? (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-1.5">
                  <span>No other rooms exist in this project yet. Please add another room folder from the editor dashboard first.</span>
                </div>
              ) : (
                <select
                  required
                  value={targetPanoramaId}
                  onChange={(e) => setTargetPanoramaId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="" disabled>Select target room...</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Hotspot Size Slider */}
          <div>
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
              <span>Visual Hotspot Size</span>
              <span className="text-indigo-400 font-bold">{size}px</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
            />
            {/* Visual Real-time Preview */}
            <div className="flex justify-center items-center mt-3 p-4 bg-slate-900/40 rounded-xl border border-white/5 min-h-[60px]">
              <div
                style={{ width: `${size}px`, height: `${size}px` }}
                className={`rounded-full flex items-center justify-center border-2 transition-all duration-150 ${
                  type === 'scene'
                    ? 'bg-pink-500/20 border-pink-400'
                    : 'bg-indigo-500/20 border-indigo-400'
                }`}
              >
                <div
                  style={{ width: `${Math.max(4, size * 0.3)}px`, height: `${Math.max(4, size * 0.3)}px` }}
                  className={`rounded-full ${
                    type === 'scene' ? 'bg-pink-400' : 'bg-indigo-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-transparent text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={type === 'scene' && availableRooms.length === 0}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/10"
            >
              <Save className="w-3.5 h-3.5" /> Save Hotspot
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
