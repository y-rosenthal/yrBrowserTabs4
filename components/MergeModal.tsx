import React, { useState } from 'react';
import { WindowData } from '../types';
import { Layers, X, ArrowRight } from 'lucide-react';

interface MergeModalProps {
  windows: WindowData[];
  onMerge: (sourceWindowIds: string[], targetWindowId: string | 'new') => void;
  onClose: () => void;
  isProcessing: boolean;
}

export const MergeModal: React.FC<MergeModalProps> = ({ windows, onMerge, onClose, isProcessing }) => {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [targetWindowId, setTargetWindowId] = useState<string>('new');

  const handleSourceToggle = (id: string) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selectedSourceIds.length === 0) return;
    onMerge(selectedSourceIds, targetWindowId);
  };

  const getWindowLabel = (w: WindowData) => w.name.replace(/Window\s*/i, 'Win ').replace('Current', '(Current)');

  // Filter out windows that are selected as sources from being the target (unless merging into self, which is redundant but handled)
  // Actually, if a window is a source, it can't be a target if we are moving ALL tabs out of it.
  // But for "Merge A and B into B", B is both source (technically keeps its tabs) and target.
  // Simplification: Source means "Take tabs FROM here". Target means "Put tabs HERE".
  // You can take tabs from A and put into B.
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Layers className="text-indigo-400" size={20} />
            Merge Windows
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Source Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Select Windows to Merge (Tabs will be moved)
            </label>
            <div className="space-y-2">
              {windows.map(win => (
                <label key={win.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800 cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={selectedSourceIds.includes(win.id)}
                    onChange={() => handleSourceToggle(win.id)}
                    className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{getWindowLabel(win)}</div>
                    <div className="text-xs text-slate-500">{win.tabs.length} tabs</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Target Selection */}
          <div>
             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Destination Window
            </label>
            <select 
              value={targetWindowId}
              onChange={(e) => setTargetWindowId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="new">✨ Create New Window</option>
              {windows.map(win => (
                <option key={win.id} value={win.id} disabled={selectedSourceIds.includes(win.id) && selectedSourceIds.length === 1}>
                  Merge into: {getWindowLabel(win)}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={selectedSourceIds.length === 0 || isProcessing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            {isProcessing ? 'Merging...' : (
              <>
                <span>Merge Tabs</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};