
import React, { useState, useMemo } from 'react';
import { Layout, Sparkles, Layers, CopyPlus, Edit2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ViewMode, WindowData } from '../types';

interface SidebarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  windows: WindowData[];
  windowNames: Record<string, string>;
  activeWindowId: string | null;
  setActiveWindowId: (id: string | null) => void;
  onOrganize: () => void;
  isOrganizing: boolean;
  selectedWindowIds: string[];
  onToggleWindowSelection: (id: string) => void;
  onMergeSelected: () => void;
  focusedArea: 'sidebar' | 'tabs';
  sidebarFocusIndex: number;
  onRenameWindow: (id: string, newName: string) => void;
}

type WindowSortField = 'name' | 'count';
type SortDirection = 'asc' | 'desc';

export const Sidebar: React.FC<SidebarProps> = ({ 
  viewMode, 
  setViewMode, 
  windows, 
  windowNames,
  activeWindowId, 
  setActiveWindowId,
  onOrganize,
  isOrganizing,
  selectedWindowIds,
  onToggleWindowSelection,
  onMergeSelected,
  focusedArea,
  sidebarFocusIndex,
  onRenameWindow
}) => {
  const totalTabs = windows.reduce((acc, win) => acc + win.tabs.length, 0);
  
  // Renaming State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<WindowSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: WindowSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'count' ? 'desc' : 'asc'); // Default count to desc (high to low)
    }
  };

  const sortedWindows = useMemo(() => {
    return [...windows].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'name') {
        valA = (windowNames[a.id] || a.name).toLowerCase();
        valB = (windowNames[b.id] || b.name).toLowerCase();
      } else {
        valA = a.tabs.length;
        valB = b.tabs.length;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [windows, windowNames, sortField, sortDirection]);

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameWindow(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const getButtonStyle = (index: number, isActiveView: boolean) => {
    const isFocused = focusedArea === 'sidebar' && sidebarFocusIndex === index;
    let base = "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all min-w-0 ";
    
    if (isActiveView) {
      base += "bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 ";
    } else {
      base += "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 ";
    }

    if (isFocused) {
      base += "ring-1 ring-indigo-400 bg-indigo-50 dark:bg-indigo-600/10 ";
    }
    return base;
  };

  const SortIcon = ({ field }: { field: WindowSortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="text-indigo-600 dark:text-indigo-400" /> : <ArrowDown size={12} className="text-indigo-600 dark:text-indigo-400" />;
  };

  return (
    <div className={`w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 transition-colors duration-200 ${
       focusedArea === 'sidebar' ? 'border-r-indigo-500/50' : ''
    }`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
          <Layout className="w-6 h-6" />
          <span>TabMaster</span>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          {windows.length} Windows • {totalTabs} Tabs
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* Main Views */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">Views</p>
          
          <button
            onClick={() => { setViewMode(ViewMode.ALL); setActiveWindowId(null); }}
            className={getButtonStyle(0, viewMode === ViewMode.ALL)}
          >
            <Layers size={18} />
            All Tabs
          </button>

          <button
            onClick={() => { setViewMode(ViewMode.AI_GROUPED); setActiveWindowId(null); }}
            className={getButtonStyle(1, viewMode === ViewMode.AI_GROUPED)}
          >
            <Sparkles size={18} />
            AI Organized
          </button>
        </div>

        {/* Windows List */}
        <div className="px-3 space-y-1">
          {/* Header with Sort Controls */}
          <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 py-2 border-b border-transparent flex items-center justify-between px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider select-none shadow-sm">
            <button 
              onClick={() => handleSort('name')}
              className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            >
              Windows
              <SortIcon field="name" />
            </button>
            <button 
               onClick={() => handleSort('count')}
               className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
               title="Sort by tab count"
            >
              #
              <SortIcon field="count" />
            </button>
          </div>

          {sortedWindows.map((win, idx) => {
            const listIndex = idx + 2; 
            const isSelected = selectedWindowIds.includes(win.id);
            const isActive = viewMode === ViewMode.BY_WINDOW && activeWindowId === win.id;
            const displayName = windowNames[win.id] || win.name;
            const isEditing = editingId === win.id;

            return (
              <div key={win.id} className="flex items-center gap-2 group relative">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleWindowSelection(win.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    title="Select to merge"
                  />
                </div>

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                      className="w-full bg-white dark:bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { 
                      setViewMode(ViewMode.BY_WINDOW); 
                      setActiveWindowId(win.id); 
                    }}
                    onDoubleClick={() => startEditing(win.id, displayName)}
                    className={getButtonStyle(listIndex, isActive)}
                  >
                    <div className="flex-1 text-left truncate" title={`${displayName} (Double click to rename)`}>
                      {displayName}
                    </div>
                    
                    {/* Hover actions */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); startEditing(win.id, displayName); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all"
                      title="Rename Window"
                    >
                      <Edit2 size={12} />
                    </div>

                    <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-500 font-mono">
                      {win.tabs.length}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {selectedWindowIds.length > 1 && (
          <button
            onClick={onMergeSelected}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-lg text-sm font-medium shadow-lg transition-all animate-in slide-in-from-bottom-2 fade-in duration-300"
          >
            <CopyPlus size={16} />
            <span>Merge ({selectedWindowIds.length}) Windows</span>
          </button>
        )}

        <button
          onClick={onOrganize}
          disabled={isOrganizing}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOrganizing ? (
            <>
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <span>Organizing...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Group with Gemini</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
