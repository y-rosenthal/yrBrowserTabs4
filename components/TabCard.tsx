import React from 'react';
import { Tab } from '../types';
import { ExternalLink, X, Clock } from 'lucide-react';

interface TabCardProps {
  tab: Tab;
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
}

export const TabCard: React.FC<TabCardProps> = ({ tab, onActivate, onClose }) => {
  // Format last accessed time relatively
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="group relative bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all duration-200 shadow-sm flex items-start gap-3">
      {/* Favicon */}
      <div className="flex-shrink-0 mt-1">
        <img 
          src={tab.favIconUrl} 
          alt="" 
          className="w-5 h-5 rounded-sm bg-slate-100"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/20?text=?';
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onActivate(tab)}>
        <h3 className="text-sm font-medium text-slate-200 truncate pr-6" title={tab.title}>
          {tab.title}
        </h3>
        <p className="text-xs text-slate-400 truncate mt-0.5" title={tab.url}>
          {new URL(tab.url).hostname}
        </p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
          <Clock size={10} />
          <span>{getRelativeTime(tab.lastAccessed)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onActivate(tab); }}
          className="p-1 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded"
          title="Switch to tab"
        >
          <ExternalLink size={14} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded"
          title="Close tab"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
