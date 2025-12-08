import React, { useState, useEffect } from 'react';
import { WindowData } from '../types';
import { Layers, X, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface MergeModalProps {
  windows: WindowData[];
  windowNames: Record<string, string>;
  selectedWindowIds: string[];
  onMerge: (sourceWindowIdsOrdered: string[], targetWindowId: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export const MergeModal: React.FC<MergeModalProps> = ({ 
  windows, 
  windowNames,
  selectedWindowIds, 
  onMerge, 
  onClose, 
  isProcessing 
}) => {
  const [targetId, setTargetId] = useState<string>('');
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  useEffect(() => {
    // 1. Identify valid selected windows
    const validIds = selectedWindowIds.filter(id => windows.find(w => w.id === id));
    
    if (validIds.length === 0) return;

    // 2. Sort them alphabetically by name to find the Target
    // The "First Alphabetical" window is the Target.
    const sortedIds = [...validIds].sort((a, b) => {
      const nameA = windowNames[a] || '';
      const nameB = windowNames[b] || '';
      return nameA.localeCompare(nameB);
    });

    const primaryId = sortedIds[0];
    const others = sortedIds.slice(1);

    setTargetId(primaryId);
    setSourceIds(others); // Initial order is alphabetical, user can change
  }, [selectedWindowIds, windows, windowNames]);

  const moveSource = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sourceIds];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setSourceIds(newOrder);
  };

  const handleSubmit = () => {
    if (!targetId) return;
    onMerge(sourceIds, targetId);
  };

  const getWindowLabel = (id: string) => windowNames[id] || 'Unknown Window';
  const getTabCount = (id: string) => windows.find(w => w.id === id)?.tabs.length || 0;

  if (selectedWindowIds.length < 2) return null;

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
          <p className="text-sm text-slate-400">
            Tabs will be gathered into the first alphabetically named window. 
            You can arrange the order in which tabs from other windows are added.
          </p>

          {/* Target Display */}
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
             <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              Destination Window (Fixed)
            </label>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-lg">{getWindowLabel(targetId)}</span>
              <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded-full">
                Currently has {getTabCount(targetId)} tabs
              </span>
            </div>
            <p className="text-xs text-indigo-300/60 mt-1">Tabs from the lists below will be added here.</p>
          </div>

          {/* Source Reordering */}
          <div>
             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Windows to Merge (Order determines tab sequence)
            </label>
            <div className="space-y-2">
              {sourceIds.map((id, index) => (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800">
                  {/* Reorder Controls */}
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveSource(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-20"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveSource(index, 'down')}
                      disabled={index === sourceIds.length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-20"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-slate-200">{getWindowLabel(id)}</div>
                    <div className="text-xs text-slate-500">Contains {getTabCount(id)} tabs</div>
                  </div>
                  
                  <div className="text-slate-600">
                    <ArrowRight size={16} />
                  </div>
                </div>
              ))}
            </div>
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
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            {isProcessing ? 'Merging...' : (
              <>
                <span>Confirm Merge</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};