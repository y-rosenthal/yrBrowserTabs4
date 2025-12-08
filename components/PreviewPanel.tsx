import React from 'react';
import { Tab, WindowData } from '../types';
import { ExternalLink, X, Clock, Copy, Globe } from 'lucide-react';

interface PreviewPanelProps {
  tab: Tab | null;
  windows: WindowData[];
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
  onClosePanel: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  tab, 
  windows, 
  onActivate, 
  onClose,
  onClosePanel
}) => {
  if (!tab) {
    return (
      <div className="w-80 border-l border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-slate-500 text-center h-full">
        <Globe size={48} className="mb-4 opacity-20" />
        <p className="text-sm">Select a tab to view details</p>
      </div>
    );
  }

  const windowName = windows.find(w => w.id === tab.windowId)?.name || 'Unknown Window';
  const domain = new URL(tab.url).hostname;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(tab.url);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  };

  return (
    <div className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col h-full shrink-0 shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-200">Tab Preview</h3>
        <button onClick={onClosePanel} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Large Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-800 rounded-2xl shadow-lg border border-slate-700">
            <img 
              src={tab.favIconUrl} 
              alt="Icon" 
              className="w-16 h-16"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=?'; }}
            />
          </div>
        </div>

        {/* Title & Domain */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-bold text-slate-100 mb-2 leading-snug">{tab.title}</h2>
          <p className="text-indigo-400 text-sm font-medium">{domain}</p>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 bg-slate-800/50 rounded-lg p-4 border border-slate-800">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Window</span>
            <p className="text-sm text-slate-300 mt-1">{windowName.replace(/Window\s*/i, '').replace('Current', 'Current Window')}</p>
          </div>
          
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Last Accessed</span>
            <div className="flex items-center gap-1 text-sm text-slate-300 mt-1">
              <Clock size={12} />
              <span>{getRelativeTime(tab.lastAccessed)}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Full URL</span>
            <div className="flex items-center gap-2 mt-1 bg-slate-950 p-2 rounded border border-slate-800">
              <p className="text-xs text-slate-400 truncate flex-1 font-mono">{tab.url}</p>
              <button 
                onClick={handleCopyUrl}
                className="text-slate-500 hover:text-indigo-400 transition-colors"
                title="Copy URL"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900">
        <button 
          onClick={() => onActivate(tab)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ExternalLink size={16} />
          Switch to Tab
        </button>
        <button 
          onClick={() => onClose(tab.id)}
          className="w-full py-2.5 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-300 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-red-900/50"
        >
          <X size={16} />
          Close Tab
        </button>
      </div>
    </div>
  );
};