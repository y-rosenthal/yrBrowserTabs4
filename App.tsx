
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DEMO_NOTICE } from './constants';
import { ViewMode, WindowData, Tab, TabGroup, OnboardingStep } from './types';
import { Search, Info, ExternalLink, RefreshCw, AlertCircle, Maximize2, Download, Table, FileText, Eye, EyeOff, FolderPlus, HelpCircle, BookOpen, Sun, Moon, Key, GripVertical } from 'lucide-react';
import { organizeTabsWithAI, generateWindowNamesWithAI } from './services/geminiService';
import { getWindows, activateTab, closeTab, getPlatformInfo, moveTabs, createWindowWithTabs, focusOrOpenExtensionTab, subscribeToUpdates } from './services/tabService';
import { saveCustomWindowName, getStorageData, setOnboardingSeen, saveTheme, saveApiKey } from './services/storageService';
import { TabListView, SortField, SortDirection } from './components/TabListView';
import { PreviewPanel } from './components/PreviewPanel';
import { MergeModal } from './components/MergeModal';
import { UserGuideModal } from './components/UserGuideModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ApiKeyModal } from './components/ApiKeyModal';
import { generateWindowNames } from './services/nameGenerator';

// Full Tour
const FULL_TOUR_STEPS: OnboardingStep[] = [
  {
    target: 'center',
    position: 'center',
    title: 'Welcome to TabMaster AI!',
    content: 'Take control of your browser chaos. Organize, search, and manage your tabs across all windows from a single dashboard.'
  },
  {
    target: 'sidebar',
    position: 'left',
    title: 'Navigate & Rename',
    content: 'Use the sidebar to filter by window. Double-click any window name to rename it. Use "Auto Name" above the list to let AI name them for you.'
  },
  {
    target: 'top-bar',
    position: 'top-search',
    title: 'Instant Search',
    content: 'Use the search bar here to find any tab instantly by title or URL across all your open windows.'
  },
  {
    target: 'sidebar',
    position: 'left',
    title: 'AI Organization',
    content: 'Click "Organize with AI" in the sidebar to let Gemini automatically categorize your tabs into logical groups.'
  },
  {
    target: 'tabs',
    position: 'center',
    title: 'Keyboard Navigation',
    content: 'Power user? Use Up/Down arrows to move through lists, and Left/Right arrows to switch between the sidebar and tab list.'
  }
];

// Single First Run Step
const FIRST_RUN_STEP: OnboardingStep[] = [
  {
    target: 'help-btn',
    position: 'top-right',
    title: 'Welcome to TabMaster!',
    content: 'Manage all your windows and tabs in one place.',
    isFirstRun: true
  }
];

const App: React.FC = () => {
  // --- STATE ---
  const [windows, setWindows] = useState<WindowData[]>([]);
  
  // Window Name History State
  const [windowNameMap, setWindowNameMap] = useState<Record<string, string>>({});
  const [nameHistory, setNameHistory] = useState<Array<Record<string, string>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ALL);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  
  // AI States
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [lastOrganizedTabsSignature, setLastOrganizedTabsSignature] = useState<string>('');

  // Renaming AI States
  const [isRenamingWindows, setIsRenamingWindows] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Selection & Features
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null); // For Preview/Active
  const [checkedTabIds, setCheckedTabIds] = useState<string[]>([]); // For Multi-select Actions
  const [showPreview, setShowPreview] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [previewWidth, setPreviewWidth] = useState(384);
  const [isPreviewResizing, setIsPreviewResizing] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Onboarding
  const [onboardingIndex, setOnboardingIndex] = useState<number>(-1); // -1 means inactive
  const [currentTourSteps, setCurrentTourSteps] = useState<OnboardingStep[]>(FULL_TOUR_STEPS);
  
  // Merge State
  const [sidebarSelectedWindowIds, setSidebarSelectedWindowIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMergeProcessing, setIsMergeProcessing] = useState(false);

  // Keyboard Navigation State
  const [focusedArea, setFocusedArea] = useState<'sidebar' | 'tabs'>('tabs');
  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lastAccessed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const platformInfo = getPlatformInfo();

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Auto-jump to full screen if extension popup
    if (platformInfo.isExtension) {
      if (window.innerWidth < 800) { 
        focusOrOpenExtensionTab();
      }
    }

    // 2. Load Theme
    getStorageData().then(data => {
      setTheme(data.theme);
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    // 3. Click outside handler for export menu
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview Resize Handler
  useEffect(() => {
    if (!isPreviewResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Width is calculated from the right edge of the screen
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width
      const clamped = Math.max(250, Math.min(800, newWidth));
      setPreviewWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsPreviewResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPreviewResizing]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    await saveTheme(newTheme);
  };

  // --- HELPERS ---
  const showNotification = (msg: string, type: 'success' | 'info' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const pushNameHistory = (newMap: Record<string, string>) => {
    const newHistory = nameHistory.slice(0, historyIndex + 1);
    newHistory.push(newMap);
    setNameHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWindowNameMap(newMap);
  };

  const loadTabs = useCallback(async () => {
    if (windows.length === 0) setIsLoading(true);
    
    try {
      const data = await getWindows();
      const storage = await getStorageData();

      setWindows(data);
      
      // 1. Generate default names
      const generated = generateWindowNames(data.map(w => w.id));
      
      // 2. Merge with custom names from storage
      const mergedNames: Record<string, string> = { ...generated };
      Object.keys(storage.customWindowNames).forEach(id => {
        if (storage.customWindowNames[id]) {
          mergedNames[id] = storage.customWindowNames[id];
        }
      });
      
      // Initialize history if first load
      if (historyIndex === -1) {
        setWindowNameMap(mergedNames);
        setNameHistory([mergedNames]);
        setHistoryIndex(0);
      } else {
        // If reloading tabs but keeping names, just update state to ensure consistency
        // (e.g. if new window appeared, it needs a name)
        const currentMap = { ...mergedNames, ...windowNameMap };
        setWindowNameMap(currentMap);
      }
      
      // Onboarding check - First Run Logic
      if (!storage.hasSeenOnboarding && onboardingIndex === -1) {
        setCurrentTourSteps(FIRST_RUN_STEP);
        setOnboardingIndex(0);
      }
      
      // Clear selections if items disappeared
      setSidebarSelectedWindowIds(prev => prev.filter(id => data.find(w => w.id === id)));
      setCheckedTabIds(prev => {
         const allTabIds = new Set(data.flatMap(w => w.tabs).map(t => t.id));
         return prev.filter(id => allTabIds.has(id));
      });
      
    } catch (e) {
      console.error(e);
      showNotification("Error loading tabs", 'info');
    } finally {
      setIsLoading(false);
    }
  }, [windows.length, onboardingIndex, historyIndex, windowNameMap]);

  useEffect(() => {
    loadTabs();
    const unsubscribe = subscribeToUpdates(() => loadTabs());
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- COMPUTED DATA ---
  const allTabs = useMemo(() => windows.flatMap(w => w.tabs), [windows]);

  // Filter tabs logic
  const filteredTabs = useMemo(() => {
    let tabs = allTabs;

    // 1. If sidebar checkboxes are selected, filter to those windows (Overrides other window views)
    if (sidebarSelectedWindowIds.length > 0) {
      tabs = tabs.filter(t => sidebarSelectedWindowIds.includes(t.windowId));
    }
    // 2. Else if specifically in Window View
    else if (viewMode === ViewMode.BY_WINDOW && activeWindowId) {
      tabs = windows.find(w => w.id === activeWindowId)?.tabs || [];
    }
    
    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tabs = tabs.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.url.toLowerCase().includes(q)
      );
    }
    return tabs;
  }, [allTabs, windows, viewMode, activeWindowId, searchQuery, sidebarSelectedWindowIds]);

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

  const currentDisplayedTabs = useMemo(() => getSortedTabs(filteredTabs), [filteredTabs, getSortedTabs]);

  // Navigation Tabs: Flattened list for keyboard navigation that matches the visual order
  const navigationTabs = useMemo(() => {
    // If in AI Grouped mode AND not searching AND no specific windows selected,
    // the UI renders groups, so we need a flattened list of grouped tabs.
    if (viewMode === ViewMode.AI_GROUPED && !searchQuery && sidebarSelectedWindowIds.length === 0) {
      return tabGroups.flatMap(g => 
        g.tabIds
          .map(id => allTabs.find(t => t.id === id))
          .filter((t): t is Tab => !!t)
      );
    }
    // Otherwise, it renders the standard sorted list
    return currentDisplayedTabs;
  }, [viewMode, searchQuery, sidebarSelectedWindowIds, tabGroups, allTabs, currentDisplayedTabs]);

  // --- ACTIONS ---
  const handleRenameWindow = async (windowId: string, newName: string) => {
    const newMap = { ...windowNameMap, [windowId]: newName };
    pushNameHistory(newMap);
    await saveCustomWindowName(windowId, newName);
    showNotification("Window renamed", 'success');
  };

  const startFullTour = () => {
    setCurrentTourSteps(FULL_TOUR_STEPS);
    setOnboardingIndex(0);
    setShowHelpMenu(false);
  };

  const handleFinishOnboarding = async (permanent: boolean = true) => {
    setOnboardingIndex(-1);
    if (permanent) {
      await setOnboardingSeen();
    }
  };

  const handleSaveApiKey = async (key: string) => {
    await saveApiKey(key);
    setShowApiKeyModal(false);
    showNotification("API Key saved successfully", "success");
  };

  // --- KEYBOARD NAV ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (onboardingIndex !== -1) return; 

      if (e.key === 'ArrowLeft') {
        if (focusedArea === 'tabs') setFocusedArea('sidebar');
      }
      else if (e.key === 'ArrowRight') {
        if (focusedArea === 'sidebar') setFocusedArea('tabs');
      }
      else if (focusedArea === 'sidebar') {
        const totalItems = 2 + windows.length;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSidebarFocusIndex(prev => Math.min(prev + 1, totalItems - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSidebarFocusIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          if (sidebarFocusIndex === 0) { setViewMode(ViewMode.ALL); setActiveWindowId(null); }
          else if (sidebarFocusIndex === 1) { handleOrganizeTabs(); } // "Organize with AI" button logic
          else {
            const winIdx = sidebarFocusIndex - 2;
            if (windows[winIdx]) { setViewMode(ViewMode.BY_WINDOW); setActiveWindowId(windows[winIdx].id); }
          }
        }
      } else if (focusedArea === 'tabs') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (navigationTabs.length === 0) return;
          
          const currentIndex = navigationTabs.findIndex(t => t.id === selectedTabId);
          let nextIndex = 0;
          
          if (currentIndex === -1) nextIndex = 0;
          else if (e.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, navigationTabs.length - 1);
          else nextIndex = Math.max(currentIndex - 1, 0);
          
          setSelectedTabId(navigationTabs[nextIndex].id);
        } else if (e.key === 'Enter' && selectedTabId) {
          const tab = navigationTabs.find(t => t.id === selectedTabId);
          if (tab) handleActivateTab(tab);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigationTabs, selectedTabId, focusedArea, sidebarFocusIndex, windows, onboardingIndex]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection(field === 'lastAccessed' ? 'desc' : 'asc'); }
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      await closeTab(tabId);
      setWindows(prev => prev.map(w => ({ ...w, tabs: w.tabs.filter(t => t.id !== tabId) })));
      if (selectedTabId === tabId) setSelectedTabId(null);
      setCheckedTabIds(prev => prev.filter(id => id !== tabId));
      showNotification("Tab closed", 'info');
    } catch (error) { showNotification("Failed to close tab", 'info'); }
  };

  const handleActivateTab = async (tab: Tab) => {
    try { await activateTab(tab); } catch (error) { showNotification("Failed to switch tab", 'info'); }
  };

  const handleOrganizeTabs = async () => {
    const currentSignature = JSON.stringify(allTabs.map(t => t.id + t.url).sort());
    
    if (tabGroups.length > 0 && currentSignature === lastOrganizedTabsSignature) {
      if (viewMode !== ViewMode.AI_GROUPED) {
        setViewMode(ViewMode.AI_GROUPED);
        showNotification("Showing cached groups", 'info');
      }
      return;
    }

    setIsOrganizing(true);
    try {
      const groups = await organizeTabsWithAI(allTabs);
      setTabGroups(groups);
      setLastOrganizedTabsSignature(currentSignature);
      setViewMode(ViewMode.AI_GROUPED);
      showNotification("Tabs organized by Gemini!", 'success');
    } catch (error: any) { 
      if (error.message === "NO_API_KEY" || error.message === "INVALID_API_KEY") {
        setShowApiKeyModal(true);
      } else {
        showNotification("Failed to organize tabs", 'info'); 
      }
    } finally { 
      setIsOrganizing(false); 
    }
  };

  const handleAutoRenameWindows = async () => {
    setIsRenamingWindows(true);
    try {
      // Filter targets if selection exists
      const targetWindows = sidebarSelectedWindowIds.length > 0
        ? windows.filter(w => sidebarSelectedWindowIds.includes(w.id))
        : windows;

      // 1. Generate new names
      const newNames = await generateWindowNamesWithAI(targetWindows);
      
      // 2. Update History & State
      const updatedMap = { ...windowNameMap, ...newNames };
      pushNameHistory(updatedMap);
      
      // 3. Save all to storage (parallel)
      await Promise.all(Object.entries(newNames).map(([id, name]) => saveCustomWindowName(id, name)));
      
      showNotification(
        sidebarSelectedWindowIds.length > 0 
          ? `Renamed ${sidebarSelectedWindowIds.length} checked windows` 
          : "All windows renamed", 
        'success'
      );

    } catch (error: any) {
      if (error.message === "NO_API_KEY" || error.message === "INVALID_API_KEY") {
        setShowApiKeyModal(true);
      } else {
        console.error(error);
        showNotification("Failed to rename windows", 'info');
      }
    } finally {
      setIsRenamingWindows(false);
    }
  };

  const handleUndoNameChange = async () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevMap = nameHistory[prevIndex];
      setHistoryIndex(prevIndex);
      setWindowNameMap(prevMap);
      await Promise.all(Object.entries(prevMap).map(([id, name]) => saveCustomWindowName(id, name)));
      showNotification("Undo successful", 'info');
    }
  };

  const handleRedoNameChange = async () => {
    if (historyIndex < nameHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextMap = nameHistory[nextIndex];
      setHistoryIndex(nextIndex);
      setWindowNameMap(nextMap);
      await Promise.all(Object.entries(nextMap).map(([id, name]) => saveCustomWindowName(id, name)));
      showNotification("Redo successful", 'info');
    }
  };

  const handleMoveTabsToNewWindow = async () => {
    if (checkedTabIds.length === 0) return;
    setIsLoading(true);
    try {
      await createWindowWithTabs(checkedTabIds);
      setCheckedTabIds([]);
      showNotification(`${checkedTabIds.length} tabs moved`, 'success');
      if (!platformInfo.isExtension) await loadTabs();
    } catch (e) { showNotification("Failed to move tabs", 'info'); } finally { setIsLoading(false); }
  };

  const handleMerge = async (sourceIds: string[], targetId: string) => {
    setIsMergeProcessing(true);
    try {
      for (const src of sourceIds) {
        const win = windows.find(w => w.id === src);
        if (!win || win.tabs.length === 0) continue;
        await moveTabs(win.tabs.map(t => t.id), targetId);
      }
      showNotification("Windows merged", 'success');
      setSidebarSelectedWindowIds([]);
      await loadTabs();
      setShowMergeModal(false);
    } catch (e) { showNotification("Failed to merge", 'info'); } finally { setIsMergeProcessing(false); }
  };

  const toggleTabCheck = (id: string) => setCheckedTabIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAllChecks = (ids: string[], checked: boolean) => {
    if (checked) setCheckedTabIds(prev => { const s = new Set(prev); ids.forEach(i => s.add(i)); return Array.from(s); });
    else setCheckedTabIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleMouseDownPreviewResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPreviewResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleExport = (type: 'csv' | 'md') => {
    let content = '';
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const MIN = String(now.getMinutes()).padStart(2, '0');
    const filename = `tabmaster-export-${YYYY}-${MM}-${DD}_${HH}-${MIN}`;

    if (type === 'csv') {
      content = 'Window,Last Accessed,Domain,Full URL,Title\n';
      allTabs.forEach(t => {
        const winName = (windowNameMap[t.windowId] || 'Unknown').replace(/"/g, '""');
        const lastAccessed = new Date(t.lastAccessed).toLocaleString().replace(/"/g, '""');
        let domain = '';
        try { domain = new URL(t.url).hostname; } catch (e) { domain = 'local'; }
        const url = t.url.replace(/"/g, '""');
        const title = t.title.replace(/"/g, '""');
        content += `"${winName}","${lastAccessed}","${domain}","${url}","${title}"\n`;
      });
    } else {
      windows.forEach(w => {
        const winName = windowNameMap[w.id] || w.name;
        content += `### ${winName} (${w.tabs.length} tabs)\n\n`;
        w.tabs.forEach(t => { content += `- [${t.title}](${t.url})\n\n`; });
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

  const selectedTab = useMemo(() => allTabs.find(t => t.id === selectedTabId) || null, [allTabs, selectedTabId]);

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-200">
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
        onToggleWindowSelection={(id) => setSidebarSelectedWindowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        onMergeSelected={() => setShowMergeModal(true)}
        focusedArea={focusedArea}
        sidebarFocusIndex={sidebarFocusIndex}
        onRenameWindow={handleRenameWindow}
        onAutoRenameWindows={handleAutoRenameWindows}
        isRenamingWindows={isRenamingWindows}
        onUndo={handleUndoNameChange}
        onRedo={handleRedoNameChange}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < nameHistory.length - 1}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
        onSelectAll={() => setSidebarSelectedWindowIds(windows.map(w => w.id))}
        onDeselectAll={() => setSidebarSelectedWindowIds([])}
      />

      <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-200 ${focusedArea === 'tabs' ? 'ring-1 ring-inset ring-slate-200 dark:ring-slate-800' : 'opacity-90'}`}>
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40 relative">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden md:block">
              {sidebarSelectedWindowIds.length > 0 
                ? `Selected Windows (${sidebarSelectedWindowIds.length})` 
                : viewMode === ViewMode.ALL ? 'All Tabs'
                : viewMode === ViewMode.AI_GROUPED ? 'AI Organized'
                : (windowNameMap[activeWindowId || ''] || 'Current Window')
              }
            </h1>
            
            <div className="relative max-w-md w-full ml-auto sm:ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchQuery}
                onFocus={() => setFocusedArea('tabs')}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-600"
              />
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
            
            <div className="flex items-center gap-1">
              {checkedTabIds.length > 0 && (
                <button
                  onClick={handleMoveTabsToNewWindow}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 mr-2 animate-in fade-in zoom-in duration-200"
                  title="Move selected tabs to a new window"
                >
                  <FolderPlus size={14} />
                  Move {checkedTabIds.length} Tabs
                </button>
              )}

              {/* Theme Toggle */}
              <button 
                  onClick={toggleTheme}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                  title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Help Trigger */}
              <div className="relative help-btn-wrapper">
                <button 
                  id="help-btn"
                  onClick={() => setShowHelpMenu(!showHelpMenu)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                  title="Help & Support"
                >
                  <HelpCircle size={18} />
                </button>
                {showHelpMenu && (
                   <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1">
                    <button onClick={startFullTour} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <HelpCircle size={14} /> Start Interactive Tour
                    </button>
                    <button onClick={() => { setShowUserGuide(true); setShowHelpMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <BookOpen size={14} /> View User Guide
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                     <button onClick={() => { setShowApiKeyModal(true); setShowHelpMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Key size={14} /> Set API Key
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={exportMenuRef}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                  title="Export Data"
                >
                  <Download size={18} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1">
                    <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Table size={14} /> CSV
                    </button>
                    <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <FileText size={14} /> Markdown
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-full transition-colors ${showPreview ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                title="Toggle Preview Panel"
              >
                {showPreview ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              <button 
                onClick={() => loadTabs()}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                title="Refresh Tabs"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              
              <button 
                onClick={focusOrOpenExtensionTab}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                title="Open in new tab (Maximize)"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Info Banner */}
        <div className={`border-b px-6 py-2 flex items-start gap-3 shrink-0 ${
          platformInfo.isExtension 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50' 
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50'
        }`}>
          {platformInfo.isExtension 
            ? <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            : <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          }
          <p className={`text-xs leading-relaxed ${platformInfo.isExtension ? 'text-green-800 dark:text-green-200/80' : 'text-blue-800 dark:text-blue-200/80'}`}>
            {platformInfo.isExtension 
              ? "Extension Active. Arrow keys to navigate. Left/Right to switch between Sidebar and Tabs."
              : DEMO_NOTICE
            }
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden" onClick={() => setFocusedArea('tabs')}>
          {/* Main Container: Removed top padding to fix sticky header gap issue */}
          <main className="flex-1 overflow-y-auto px-6 pb-6 pt-0 scroll-smooth">
            {/* Visual Spacer to replace padding-top, scrolls away so sticky header hits the top edge */}
            <div className="h-6"></div> 
            
            {isLoading && windows.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p>Loading tabs...</p>
              </div>
            ) : currentDisplayedTabs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Search size={48} className="mb-4 opacity-20" />
                <p>No tabs found</p>
              </div>
            ) : viewMode === ViewMode.AI_GROUPED && !searchQuery && sidebarSelectedWindowIds.length === 0 ? (
               <div className="space-y-8 pb-10">
                 {tabGroups.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-slate-500"><p>No groups. Click "Organize with AI".</p></div>}
                 {tabGroups.map((group, idx) => {
                   const groupTabs = group.tabIds.map(id => allTabs.find(t => t.id === id)).filter((t): t is Tab => t !== undefined);
                   return (
                     <div key={idx} className="space-y-2">
                       <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-300 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">{group.categoryName}</h3>
                       <TabListView
                         tabs={groupTabs}
                         windows={windows}
                         windowNames={windowNameMap}
                         onActivate={handleActivateTab}
                         onClose={handleCloseTab}
                         // No global sort props passed = independent local sort
                         selectedTabId={selectedTabId}
                         onSelect={setSelectedTabId}
                         checkedTabIds={checkedTabIds}
                         onToggleTabCheck={toggleTabCheck}
                         onToggleAllChecks={toggleAllChecks}
                         focusedArea={focusedArea}
                       />
                     </div>
                   );
                 })}
               </div>
            ) : (
              <TabListView 
                tabs={currentDisplayedTabs}
                windows={windows}
                windowNames={windowNameMap}
                onActivate={handleActivateTab}
                onClose={handleCloseTab}
                // Pass global sort props for ALL view
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedTabId={selectedTabId}
                onSelect={setSelectedTabId}
                checkedTabIds={checkedTabIds}
                onToggleTabCheck={toggleTabCheck}
                onToggleAllChecks={toggleAllChecks}
                focusedArea={focusedArea}
              />
            )}
          </main>
          
          {showPreview && (
            <div className="relative flex h-full shrink-0 shadow-xl z-30" style={{ width: previewWidth }}>
              {/* Resize Handle */}
              <div 
                className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20 flex flex-col justify-center items-center group"
                onMouseDown={handleMouseDownPreviewResize}
              >
                 <div className="h-full w-full bg-slate-200 dark:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <PreviewPanel 
                tab={selectedTab} 
                windows={windows} 
                windowNames={windowNameMap}
                onActivate={handleActivateTab} 
                onClose={handleCloseTab}
                onClosePanel={() => setShowPreview(false)}
              />
            </div>
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

        {showUserGuide && (
          <UserGuideModal onClose={() => setShowUserGuide(false)} />
        )}
        
        {showApiKeyModal && (
          <ApiKeyModal onClose={() => setShowApiKeyModal(false)} onSave={handleSaveApiKey} />
        )}

        {onboardingIndex >= 0 && (
          <OnboardingTour 
            stepIndex={onboardingIndex}
            totalSteps={currentTourSteps.length}
            step={currentTourSteps[onboardingIndex]}
            onNext={(permanent = true) => onboardingIndex < currentTourSteps.length - 1 ? setOnboardingIndex(i => i + 1) : handleFinishOnboarding(permanent)}
            onSkip={(permanent = true) => handleFinishOnboarding(permanent)}
            onMaximize={focusOrOpenExtensionTab}
            onStartTour={startFullTour}
          />
        )}
        
        {notification && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300 z-50 ${
            notification.type === 'success' ? 'bg-slate-800 border-green-500/30 text-green-400' : 'bg-slate-800 border-indigo-500/30 text-indigo-400'
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
