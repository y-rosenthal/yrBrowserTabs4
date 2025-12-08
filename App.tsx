import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { DEMO_NOTICE } from './constants';
import { ViewMode, WindowData, Tab, TabGroup } from './types';
import { Search, Info, ExternalLink, RefreshCw, AlertCircle, Maximize2, Download, Table, FileText, Eye, EyeOff } from 'lucide-react';
import { organizeTabsWithAI } from './services/geminiService';
import { getWindows, activateTab, closeTab, getPlatformInfo, moveTabs, createWindowWithTabs } from './services/tabService';
import { TabListView, SortField, SortDirection } from './components/TabListView';
import { PreviewPanel } from './components/PreviewPanel';
import { MergeModal } from './components/MergeModal';
import { generateWindowNames } from './services/nameGenerator';

declare const chrome: any;

const App: React.FC = () => {
  // --- STATE ---
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [windowNameMap, setWindowNameMap] = useState<Record<string, string>>({});
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ALL);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  
  // Selection & Features
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Merge State
  const [sidebarSelectedWindowIds, setSidebarSelectedWindowIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMergeProcessing, setIsMergeProcessing] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lastAccessed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const platformInfo = getPlatformInfo();

  // --- HELPERS ---
  const showNotification = (msg: string, type: 'success' | 'info' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTabs = async () => {
    setIsLoading(true);
    try {
      const data = await getWindows();
      setWindows(data);
      
      // Generate names based on current window list order
      const names = generateWindowNames(data.map(w => w.id));
      setWindowNameMap(names);
      
      // Clear selection if windows disappear
      setSidebarSelectedWindowIds(prev => prev.filter(id => data.find(w => w.id === id)));
      
    } catch (e) {
      showNotification("Error loading tabs", 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTabs();
  }, []);

  // --- COMPUTED DATA ---
  const allTabs = useMemo(() => windows.flatMap(w => w.tabs), [windows]);

  const filteredTabs = useMemo(() => {
    let tabs = allTabs;
    if (viewMode === ViewMode.BY_WINDOW && activeWindowId) {
      tabs = windows.find(w => w.id === activeWindowId)?.tabs || [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tabs = tabs.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.url.toLowerCase().includes(q)
      );
    }
    return tabs;
  }, [allTabs, windows, viewMode, activeWindowId, searchQuery]);

  // Helper to get sorted tabs list based on current filters
  const getSortedTabs = useCallback((tabs: Tab[]) => {
    return [...tabs].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'window':
          valA = windowNameMap[a.windowId] || '';
          valB = windowNameMap[b.windowId] || '';
          break;
        case 'url':
          valA = a.url.toLowerCase();
          valB = b.url.toLowerCase();
          break;
        case 'lastAccessed':
          valA = a.lastAccessed;
          valB = b.lastAccessed;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection, windows, windowNameMap]);

  // Use this memoized list for rendering AND keyboard navigation
  const currentDisplayedTabs = useMemo(() => getSortedTabs(filteredTabs), [filteredTabs, getSortedTabs]);

  // --- KEYBOARD NAVIGATION ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in search input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentDisplayedTabs.length === 0) return;

        const currentIndex = currentDisplayedTabs.findIndex(t => t.id === selectedTabId);
        let nextIndex = 0;

        if (currentIndex === -1) {
          nextIndex = 0;
        } else if (e.key === 'ArrowDown') {
          nextIndex = Math.min(currentIndex + 1, currentDisplayedTabs.length - 1);
        } else {
          nextIndex = Math.max(currentIndex - 1, 0);
        }
        
        setSelectedTabId(currentDisplayedTabs[nextIndex].id);
      } 
      else if (e.key === 'Enter') {
        if (selectedTabId) {
          const tab = currentDisplayedTabs.find(t => t.id === selectedTabId);
          if (tab) handleActivateTab(tab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDisplayedTabs, selectedTabId]);

  // --- ACTIONS ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'lastAccessed' ? 'desc' : 'asc');
    }
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      await closeTab(tabId);
      setWindows(prev => prev.map(w => ({
        ...w,
        tabs: w.tabs.filter(t => t.id !== tabId)
      })));
      if (selectedTabId === tabId) setSelectedTabId(null);
      showNotification("Tab closed", 'info');
    } catch (error) {
      showNotification("Failed to close tab", 'info');
    }
  };

  const handleActivateTab = async (tab: Tab) => {
    try {
      await activateTab(tab);
      if (!platformInfo.isExtension) {
        showNotification(`Switched to: ${tab.title.substring(0, 30)}...`, 'success');
      }
    } catch (error) {
      showNotification("Failed to switch tab", 'info');
    }
  };

  const handleOrganizeTabs = async () => {
    if (!process.env.API_KEY) {
      alert("Please provide an API_KEY in the environment to use the AI feature.");
      return;
    }
    setIsOrganizing(true);
    try {
      const groups = await organizeTabsWithAI(allTabs);
      setTabGroups(groups);
      setViewMode(ViewMode.AI_GROUPED);
      showNotification("Tabs organized by Gemini!", 'success');
    } catch (error) {
      showNotification("Failed to organize tabs. Check console.", 'info');
    } finally {
      setIsOrganizing(false);
    }
  };

  // --- EXPORT ---
  const handleExport = (type: 'csv' | 'txt') => {
    let content = '';
    const filename = `tabmaster-export-${new Date().toISOString().slice(0, 10)}`;

    if (type === 'csv') {
      content = 'Title,URL,Window,Last Accessed\n';
      allTabs.forEach(t => {
        const winName = windowNameMap[t.windowId] || 'Unknown';
        content += `"${t.title.replace(/"/g, '""')}","${t.url}","${winName}","${new Date(t.lastAccessed).toLocaleString()}"\n`;
      });
    } else {
      windows.forEach(w => {
        const winName = windowNameMap[w.id] || w.name;
        content += `=== ${winName} (${w.tabs.length} tabs) ===\n`;
        w.tabs.forEach(t => {
          content += `  - ${t.title}\n    ${t.url}\n`;
        });
        content += '\n';
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${type}`;
    link.click();
    setShowExportMenu(false);
  };

  // --- MERGE ---
  const handleMerge = async (sourceWindowIdsOrdered: string[], targetWindowId: string) => {
    setIsMergeProcessing(true);
    try {
      // sourceWindowIdsOrdered is the list of windows to move, in the order the user wants them appended.
      // We iterate through them and move their tabs to the target.
      
      for (const sourceWinId of sourceWindowIdsOrdered) {
        const win = windows.find(w => w.id === sourceWinId);
        if (!win || win.tabs.length === 0) continue;
        
        const tabIds = win.tabs.map(t => t.id);
        await moveTabs(tabIds, targetWindowId);
      }
      
      showNotification("Windows merged successfully!", 'success');
      setSidebarSelectedWindowIds([]); // Clear selection
      await loadTabs(); // Refresh state
      setShowMergeModal(false);
    } catch (e) {
      showNotification("Failed to merge windows.", 'info');
    } finally {
      setIsMergeProcessing(false);
    }
  };

  // --- RENDER ---
  const openFullPage = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'index.html' });
    } else {
      window.open(window.location.href, '_blank');
    }
  };

  const selectedTab = useMemo(() => 
    allTabs.find(t => t.id === selectedTabId) || null, 
  [allTabs, selectedTabId]);

  return (
    <div className="flex h-full overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <Sidebar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        windows={windows}
        windowNames={windowNameMap}
        activeWindowId={activeWindowId}
        setActiveWindowId={setActiveWindowId}
        onOrganize={handleOrganizeTabs}
        isOrganizing={isOrganizing}
        selectedWindowIds={sidebarSelectedWindowIds}
        onToggleWindowSelection={(id) => {
          setSidebarSelectedWindowIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        }}
        onMergeSelected={() => setShowMergeModal(true)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold text-slate-100 hidden md:block">
              {viewMode === ViewMode.ALL && 'All Tabs'}
              {viewMode === ViewMode.AI_GROUPED && 'AI Organized'}
              {viewMode === ViewMode.BY_WINDOW && (windowNameMap[activeWindowId || ''] || 'Current Window')}
            </h1>
            
            <div className="relative max-w-md w-full ml-auto sm:ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="h-6 w-px bg-slate-800 mx-2 hidden sm:block"></div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              
              {/* Export Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  title="Export Data"
                >
                  <Download size={18} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                    <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm flex items-center gap-2">
                      <Table size={14} /> CSV
                    </button>
                    <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-sm flex items-center gap-2">
                      <FileText size={14} /> Text
                    </button>
                  </div>
                )}
              </div>

              {/* Toggle Preview */}
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-full transition-colors ${showPreview ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Toggle Preview Panel"
              >
                {showPreview ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              <button 
                onClick={loadTabs}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                title="Refresh Tabs"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              
              <button 
                onClick={openFullPage}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                title="Open in new tab"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Info Banner */}
        <div className={`border-b px-6 py-2 flex items-start gap-3 shrink-0 ${
          platformInfo.isExtension 
            ? 'bg-green-900/20 border-green-900/50' 
            : 'bg-blue-900/20 border-blue-900/50'
        }`}>
          {platformInfo.isExtension 
            ? <AlertCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            : <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          }
          <p className={`text-xs leading-relaxed ${
            platformInfo.isExtension ? 'text-green-200/80' : 'text-blue-200/80'
          }`}>
            {platformInfo.isExtension 
              ? "Running as Extension. Use Up/Down arrows to navigate, Enter to switch."
              : DEMO_NOTICE
            }
          </p>
        </div>

        {/* Content & Preview Split */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p>Loading tabs...</p>
              </div>
            ) : currentDisplayedTabs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Search size={48} className="mb-4 opacity-20" />
                <p>No tabs found</p>
              </div>
            ) : viewMode === ViewMode.AI_GROUPED && !searchQuery ? (
              // Grouped View (Simplified for this update: Just render groups if they exist)
               <div className="space-y-8 pb-10">
                 {tabGroups.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                     <p>No groups. Click "Group with Gemini".</p>
                   </div>
                 )}
                 {tabGroups.map((group, idx) => {
                   const groupTabs = group.tabIds
                     .map(id => allTabs.find(t => t.id === id))
                     .filter((t): t is Tab => t !== undefined);
                   return (
                     <div key={idx} className="space-y-2">
                       <h3 className="text-lg font-semibold text-indigo-300 border-b border-slate-800 pb-1 mb-2">{group.categoryName}</h3>
                       <TabListView
                         tabs={groupTabs}
                         windows={windows}
                         windowNames={windowNameMap}
                         onActivate={handleActivateTab}
                         onClose={handleCloseTab}
                         sortField={sortField}
                         sortDirection={sortDirection}
                         onSort={handleSort}
                         selectedTabId={selectedTabId}
                         onSelect={setSelectedTabId}
                       />
                     </div>
                   );
                 })}
               </div>
            ) : (
              // Standard View
              <TabListView 
                tabs={currentDisplayedTabs}
                windows={windows}
                windowNames={windowNameMap}
                onActivate={handleActivateTab}
                onClose={handleCloseTab}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedTabId={selectedTabId}
                onSelect={setSelectedTabId}
              />
            )}
          </main>
          
          {/* Right Preview Panel */}
          {showPreview && (
            <PreviewPanel 
              tab={selectedTab} 
              windows={windows} 
              windowNames={windowNameMap}
              onActivate={handleActivateTab} 
              onClose={handleCloseTab}
              onClosePanel={() => setShowPreview(false)}
            />
          )}
        </div>
        
        {/* Modals */}
        {showMergeModal && (
          <MergeModal 
            windows={windows}
            windowNames={windowNameMap}
            selectedWindowIds={sidebarSelectedWindowIds}
            onMerge={handleMerge}
            onClose={() => setShowMergeModal(false)}
            isProcessing={isMergeProcessing}
          />
        )}
        
        {/* Notifications */}
        {notification && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300 z-50 ${
            notification.type === 'success' 
              ? 'bg-slate-800 border-green-500/30 text-green-400' 
              : 'bg-slate-800 border-indigo-500/30 text-indigo-400'
          }`}>
             {notification.type === 'success' ? <ExternalLink size={16} /> : <Info size={16} />}
            <span className="text-sm font-medium">{notification.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;