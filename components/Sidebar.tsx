import React from 'react';
import { Layout, Sparkles, Layers } from 'lucide-react';
import { ViewMode, WindowData } from '../types';

interface SidebarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  windows: WindowData[];
  activeWindowId: string | null;
  setActiveWindowId: (id: string | null) => void;
  onOrganize: () => void;
  isOrganizing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  viewMode, 
  setViewMode, 
  windows, 
  activeWindowId, 
  setActiveWindowId,
  onOrganize,
  isOrganizing
}) => {
  const totalTabs = windows.reduce((acc, win) => acc + win.tabs.length, 0);

  // Helper to format window name (remove "Window " prefix)
  const formatWindowName = (name: string) => {
    return name.replace(/Window\s*/i, '').replace('Current', 'Current Win');
  };

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
          <Layout className="w-6 h-6" />
          <span>TabMaster</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {windows.length} Windows • {totalTabs} Tabs
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* Main Views */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Views</p>
          
          <button
            onClick={() => { setViewMode(ViewMode.ALL); setActiveWindowId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === ViewMode.ALL 
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers size={18} />
            All Tabs
          </button>

          <button
            onClick={() => { setViewMode(ViewMode.AI_GROUPED); setActiveWindowId(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === ViewMode.AI_GROUPED 
                ? 'bg-purple-600/10 text-purple-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles size={18} />
            AI Organized
          </button>
        </div>

        {/* Windows List */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Window #</p>
          {windows.map((win) => (
            <button
              key={win.id}
              onClick={() => { 
                setViewMode(ViewMode.BY_WINDOW); 
                setActiveWindowId(win.id); 
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === ViewMode.BY_WINDOW && activeWindowId === win.id
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex-1 text-left truncate pl-1">{formatWindowName(win.name)}</div>
              <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                {win.tabs.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Action */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onOrganize}
          disabled={isOrganizing}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white p-2.5 rounded-lg text-sm font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOrganizing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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