
import React, { useEffect, useRef } from 'react';
import { Tab, WindowData } from '../types';
import { X, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortField = 'title' | 'window' | 'url' | 'lastAccessed';
export type SortDirection = 'asc' | 'desc';

interface TabListViewProps {
  tabs: Tab[];
  windows: WindowData[];
  windowNames: Record<string, string>;
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  selectedTabId: string | null;
  onSelect: (tabId: string) => void;
  checkedTabIds: string[];
  onToggleTabCheck: (tabId: string) => void;
  onToggleAllChecks: (tabIds: string[], checked: boolean) => void;
  focusedArea: 'sidebar' | 'tabs';
}

export const TabListView: React.FC<TabListViewProps> = ({
  tabs,
  windows,
  windowNames,
  onActivate,
  onClose,
  sortField,
  sortDirection,
  onSort,
  selectedTabId,
  onSelect,
  checkedTabIds,
  onToggleTabCheck,
  onToggleAllChecks,
  focusedArea
}) => {
  const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  // Scroll selected item into view only if tabs area is focused to prevent jumping when navigating sidebar
  useEffect(() => {
    if (focusedArea === 'tabs' && selectedTabId && rowRefs.current[selectedTabId]) {
      rowRefs.current[selectedTabId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedTabId, focusedArea]);

  const getWindowLabel = (windowId: string) => {
    return windowNames[windowId] || 'Unknown';
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Local';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-500 dark:text-indigo-400" /> : <ArrowDown size={14} className="text-indigo-500 dark:text-indigo-400" />;
  };

  const Header = ({ field, label, className = "" }: { field: SortField, label: string, className?: string }) => (
    <th 
      className={`sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none shadow-sm ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  // Checkbox logic
  const allVisibleChecked = tabs.length > 0 && tabs.every(t => checkedTabIds.includes(t.id));
  const someVisibleChecked = tabs.some(t => checkedTabIds.includes(t.id));

  return (
    <div className={`w-full rounded-lg border bg-white dark:bg-slate-900/50 shadow-sm transition-all duration-200 ${
      focusedArea === 'tabs' ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Removed overflow-x-auto to ensure sticky headers work relative to the main page scroll */}
      <div className="rounded-lg">
        <table className="w-full whitespace-nowrap text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900">
              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 w-10 px-4 py-3 shadow-sm">
                <input 
                  type="checkbox"
                  checked={allVisibleChecked}
                  ref={input => { if (input) input.indeterminate = someVisibleChecked && !allVisibleChecked; }}
                  onChange={(e) => onToggleAllChecks(tabs.map(t => t.id), e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 border"
                />
              </th>
              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 w-10 px-4 py-3 shadow-sm"></th> {/* Icon column */}
              <Header field="title" label="Tab Name" />
              <Header field="url" label="Domain" />
              <Header field="window" label="Window" />
              <Header field="lastAccessed" label="Last Accessed" className="hidden lg:table-cell" />
              <th className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider shadow-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
            {tabs.map((tab) => {
              const isSelected = selectedTabId === tab.id;
              const isChecked = checkedTabIds.includes(tab.id);
              
              return (
                <tr 
                  key={tab.id} 
                  ref={(el) => { rowRefs.current[tab.id] = el; }}
                  onClick={() => { onSelect(tab.id); onActivate(tab); }}
                  className={`group transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 ring-1 ring-inset ring-indigo-500/50' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleTabCheck(tab.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 border cursor-pointer"
                    />
                  </td>

                  {/* Favicon */}
                  <td className="px-4 py-3 text-center">
                     <img 
                      src={tab.favIconUrl} 
                      alt="" 
                      className="w-4 h-4 rounded-sm mx-auto"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/16?text=?'; }}
                    />
                  </td>

                  {/* Tab Name */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col max-w-md">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`} title={tab.title}>
                        {tab.title}
                      </span>
                    </div>
                  </td>

                  {/* Domain */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-500 truncate max-w-[200px] block">
                      {getDomain(tab.url)}
                    </span>
                  </td>

                  {/* Window Name */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[150px] block" title={getWindowLabel(tab.windowId)}>
                      {getWindowLabel(tab.windowId)}
                    </span>
                  </td>

                  {/* Last Accessed */}
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-500 dark:text-slate-500">
                     {(() => {
                        const diff = Date.now() - tab.lastAccessed;
                        if (diff < 60000) return 'Just now';
                        const mins = Math.floor(diff/60000);
                        if (mins < 60) return `${mins}m ago`;
                        const hrs = Math.floor(mins/60);
                        if (hrs < 24) return `${hrs}h ago`;
                        return `${Math.floor(hrs/24)}d ago`;
                     })()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className={`flex items-center justify-end gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onActivate(tab); }}
                        className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                        title="Switch to Tab"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                        title="Close Tab"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
