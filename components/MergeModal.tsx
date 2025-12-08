
import React, { useState, useEffect } from 'react';
import { WindowData } from '../types';
import { Layers, X, ArrowRight, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';

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
  const [validSelectedIds, setValidSelectedIds] = useState<string[]>([]);

  // Initialize
  useEffect(() => {
    // 1. Identify valid selected windows
    const validIds = selectedWindowIds.filter(id => windows.find(w => w.id === id));
    setValidSelectedIds(validIds);
    
    if (validIds.length === 0) return;

    // 2. Default target: First Alphabetical
    const sortedIds = [...validIds].sort((a, b) => {
      const nameA = windowNames[a] || '';
      const nameB = windowNames[b] || '';
      return nameA.localeCompare(nameB);
    });

    if (!targetId || !validIds.includes(targetId)) {
      setTargetId(sortedIds[0]);
    }
  }, [selectedWindowIds, windows, windowNames]);

  // Update source IDs when target changes
  useEffect(() => {
    if (!targetId) return;
    
    const others = validSelectedIds.filter(id => id !== targetId);
    // Maintain existing order if possible, or sort alphabetically
    const sortedOthers = others.sort((a, b) => {
      const nameA = windowNames[a] || '';
      const nameB = windowNames[b] || '';
      return nameA.localeCompare(nameB);
    });
    setSourceIds(sortedOthers);
  }, [targetId, validSelectedIds, windowNames]);

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
            <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
            Merge Windows
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Select the destination window. Tabs from other selected windows will be moved into it.
          </p>

          {/* Target Selection */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4">
             <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
              Destination Window
            </label>
            
            <div className="relative">
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 text-slate-800 dark:text-slate-200 rounded-lg p-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {validSelectedIds.map(id => (
                  <option key={id} value={id}>
                    {getWindowLabel(id)} ({getTabCount(id)} tabs)
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400">
                <CheckCircle size={16} />
              </div>
            </div>

            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/60 mt-2">
              Result: {getWindowLabel(targetId)} will contain tabs from {sourceIds.length} other window{sourceIds.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Source Reordering */}
          <div>
             <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Windows to Merge (Order determines tab sequence)
            </label>
            <div className="space-y-2">
              {sourceIds.length === 0 && <p className="text-sm text-slate-500 italic">No other windows selected.</p>}
              {sourceIds.map((id, index) => (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  {/* Reorder Controls */}
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveSource(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white disabled:opacity-20"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveSource(index, 'down')}
                      disabled={index === sourceIds.length - 1}
                      className="text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white disabled:opacity-20"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-slate-800 dark:text-slate-200">{getWindowLabel(id)}</div>
                    <div className="text-xs text-slate-500">Contains {getTabCount(id)} tabs</div>
                  </div>
                  
                  <div className="text-slate-400 dark:text-slate-600">
                    <ArrowRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
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
