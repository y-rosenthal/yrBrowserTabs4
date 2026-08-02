
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DEMO_NOTICE } from './constants';
import { ViewMode, WindowData, Tab, TabGroup, OnboardingStep, WindowReorgSnapshot, CardMetadataSetting, CardMetadataField } from './types';
import { Search, Info, ExternalLink, RefreshCw, AlertCircle, Download, Table, FileText, Eye, EyeOff, FolderPlus, HelpCircle, BookOpen, Sun, Moon, Key, LayoutTemplate, RotateCcw, Settings, Sparkles, ListFilter, List, LayoutGrid, Minus, Plus, Copy, FolderInput, Edit2, Trash2, CheckSquare, Undo2, Redo2, Wand2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { organizeTabsWithAI, generateWindowNamesWithAI } from './services/geminiService';
import { getWindows, activateTab, closeTab, closeTabs, getPlatformInfo, moveTabs, createWindowWithTabs, subscribeToUpdates, focusWindow, closeWindow, wakeTab, getTabPageText } from './services/tabService';
import { saveCustomWindowName, saveCustomWindowNames, getStorageData, setOnboardingSeen, saveTheme, saveApiKey, saveViewSettings, DEFAULT_CARD_METADATA } from './services/storageService';
import { compareWindowNames } from './services/sortUtils';
import { TabListView, SortField, SortDirection } from './components/TabListView';
import { TabCardView } from './components/TabCardView';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { PromptModal } from './components/PromptModal';
import { PreviewPanel } from './components/PreviewPanel';
import { MergeModal } from './components/MergeModal';
import { UserGuideModal } from './components/UserGuideModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ErrorModal } from './components/ErrorModal';
import { generateWindowNames } from './services/nameGenerator';

// Full Tour: each step is anchored to a live UI element via its data-tour
// attribute; the tour card points at it with an arrow and a spotlight.
const FULL_TOUR_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to TabMaster AI!',
    content: 'This dashboard shows every tab across all your Chrome windows. This tour walks through the major features. Use the "Tour Steps" panel to jump to any topic, drag it out of the way by its header, or end the tour at any time.'
  },
  {
    anchor: 'sidebar-windows',
    title: 'Your Windows',
    content: 'Every open window is listed here. Click one to see only its tabs, double-click its name to rename it, and use the checkboxes to select several windows for merging or batch renaming. Right-click a window for more actions.'
  },
  {
    anchor: 'auto-name',
    title: 'Auto-Name & Undo',
    content: 'Let Gemini generate descriptive names for your windows based on what is open in them. Every rename — manual or AI — can be reverted with the Undo/Redo arrows.'
  },
  {
    anchor: 'organize',
    title: 'Organize with AI',
    content: 'Gemini sorts all your tabs into semantic groups like Development, Shopping, or News. From the grouped view, "Apply to Windows" physically reorganizes your browser windows to match — and it can be undone.'
  },
  {
    anchor: 'search',
    title: 'Instant Search',
    content: 'Search every window at once. By default it matches domain names (e.g. "github.com"); use the scope switch inside the search bar to instead match tab titles and URLs, or even the text of the pages themselves.'
  },
  {
    anchor: 'view-toggle',
    title: 'Detail & Card Views',
    content: 'Switch between a sortable table and visual cards with live page thumbnails. Card view can also group by window, and cards resize with the slider or the [ and ] keys.'
  },
  {
    anchor: 'tabs-area',
    title: 'Working with Tabs',
    content: 'Single-click previews a tab; double-click or Enter switches to it. Check several tabs to move or close them together, and right-click any tab for actions like Move to Window or Copy URL. Arrow keys navigate; Ctrl+Left/Right switches between the sidebar and the tab list.'
  },
  {
    anchor: 'preview-toggle',
    title: 'Preview Panel',
    content: 'Show or hide a live preview of the selected tab. The panel also shows which window the tab belongs to, with clickable pills for every other tab in that window.'
  },
  {
    anchor: 'export',
    title: 'Export Your Tabs',
    content: 'Download everything as a CSV spreadsheet or a Markdown link list — handy for backups or sharing a reading list.'
  },
  {
    anchor: 'theme',
    title: 'Light & Dark Mode',
    content: 'Toggle between light and dark themes. Your choice is remembered across sessions.'
  },
  {
    anchor: 'settings',
    title: 'Settings',
    content: 'Set your Gemini API key here (required for the AI features) and choose which fields appear on cards in card view.'
  }
];

const METADATA_LABELS: Record<CardMetadataField, string> = {
  icon: 'Icon',
  lastAccessed: 'Last Accessed',
  title: 'Tab Name',
  domain: 'Domain',
  window: 'Window'
};

// Single First Run Step
const FIRST_RUN_STEP: OnboardingStep[] = [
  {
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

  // Window Reorganization History
  const [reorgHistory, setReorgHistory] = useState<WindowReorgSnapshot[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.ALL);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabGroups, setTabGroups] = useState<TabGroup[]>([]);
  
  // AI States
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [lastOrganizedTabsSignature, setLastOrganizedTabsSignature] = useState<string>('');

  // Renaming AI States
  const [isRenamingWindows, setIsRenamingWindows] = useState(false);
  const [pendingAction, setPendingAction] = useState<'ORGANIZE' | 'AUTO_RENAME' | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  const [errorModalState, setErrorModalState] = useState<{title: string, message: string, details?: string} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Selection & Features
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null); // For Preview/Active
  const [checkedTabIds, setCheckedTabIds] = useState<string[]>([]); // For Multi-select Actions
  const [showPreview, setShowPreview] = useState(true);
  const [showCloseCheckedConfirm, setShowCloseCheckedConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showReorgConfirm, setShowReorgConfirm] = useState(false);

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [previewWidth, setPreviewWidth] = useState(384);
  const [isPreviewResizing, setIsPreviewResizing] = useState(false);
  
  // Refs for click outside
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Onboarding
  const [onboardingIndex, setOnboardingIndex] = useState<number>(-1); // -1 means inactive
  const hasAutoShownWelcome = useRef(false); // first-run dialog auto-shows at most once per session
  const loadTabsRef = useRef<() => Promise<void>>(async () => {});
  const lastSnapshotSig = useRef<string>('');
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

  // Card view state (persisted via saveViewSettings)
  const [tabDisplayMode, setTabDisplayMode] = useState<'detail' | 'card'>('card');
  const [cardGrouping, setCardGrouping] = useState<'tab' | 'window'>('tab');
  const [cardWidth, setCardWidth] = useState(240);
  const [cardMetadata, setCardMetadata] = useState<CardMetadataSetting[]>(DEFAULT_CARD_METADATA);
  const [cardColumns, setCardColumns] = useState(1);
  const [showCardSortMenu, setShowCardSortMenu] = useState(false);
  const cardSortMenuRef = useRef<HTMLDivElement>(null);

  // Context menus & rename modals
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [promptModal, setPromptModal] = useState<{ title: string; message?: string; initialValue?: string; submitText?: string; onSubmit: (value: string) => void } | null>(null);
  const [confirmCloseWindowId, setConfirmCloseWindowId] = useState<string | null>(null);

  // Bumped after a sleeping tab is auto-woken so the preview retries.
  const [wakeSignal, setWakeSignal] = useState(0);

  // Search scope: domain only, titles/URLs, or also the captured page text.
  const [searchScope, setSearchScope] = useState<'domain' | 'title' | 'content'>('domain');
  const [showSearchScopeMenu, setShowSearchScopeMenu] = useState(false);
  const searchScopeMenuRef = useRef<HTMLDivElement>(null);
  // Page-text index for content search: `${tabId}|${url}` -> lowercased text.
  // Lives in a ref (large strings); pageTextVersion bumps re-filtering as
  // captures land, indexingRemaining drives the progress hint.
  const pageTextIndex = useRef<Map<string, string>>(new Map());
  const [pageTextVersion, setPageTextVersion] = useState(0);
  const [indexingRemaining, setIndexingRemaining] = useState(0);

  // AI Global Sort State (Forced sort for all groups)
  const [globalGroupSort, setGlobalGroupSort] = useState<{ field: SortField; direction: SortDirection; timestamp: number } | undefined>(undefined);
  
  const platformInfo = getPlatformInfo();

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load Theme + view preferences. (The extension always opens as a
    // full browser tab — the toolbar click is handled in background.js —
    // so there is no popup-vs-tab launch logic here anymore.)
    getStorageData().then(data => {
      setTheme(data.theme);
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      if (data.tabViewMode) setTabDisplayMode(data.tabViewMode);
      if (data.cardGrouping) setCardGrouping(data.cardGrouping);
      if (data.cardWidth) setCardWidth(data.cardWidth);
      if (data.cardMetadata) setCardMetadata(data.cardMetadata);
      if (data.searchScope) setSearchScope(data.searchScope);
    });

    // 3. Click outside handler for menus
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(target)) {
        setShowHelpMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (cardSortMenuRef.current && !cardSortMenuRef.current.contains(target)) {
        setShowCardSortMenu(false);
      }
      if (searchScopeMenuRef.current && !searchScopeMenuRef.current.contains(target)) {
        setShowSearchScopeMenu(false);
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
      // Constrain width (never wider than 70% of the viewport)
      const clamped = Math.max(250, Math.min(800, window.innerWidth * 0.7, newWidth));
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
  // Track the hide timer so a new toast isn't dismissed early by the
  // previous toast's 3-second timeout.
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotification = (msg: string, type: 'success' | 'info' = 'info') => {
    setNotification({ msg, type });
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(null), 3000);
  };

  const handleError = (title: string, userMessage: string, error?: any) => {
    console.error(error);
    let details = '';
    if (error) {
       if (typeof error === 'string') details = error;
       else if (error instanceof Error) details = error.message + (error.stack ? `\n\n${error.stack}` : '');
       else details = JSON.stringify(error, null, 2);
    }
    setErrorModalState({ title, message: userMessage, details });
  };

  const pushNameHistory = (newMap: Record<string, string>) => {
    const newHistory = nameHistory.slice(0, historyIndex + 1);
    newHistory.push(newMap);
    setNameHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWindowNameMap(newMap);
  };

  const loadTabs = useCallback(async (force = false) => {
    if (windows.length === 0) setIsLoading(true);

    try {
      const data = await getWindows();
      const storage = await getStorageData();

      // Skip the whole update when nothing visible changed — chrome fires
      // events (audible/muted/loading) that carry no display-relevant data,
      // and each no-op setWindows re-renders all rows. The manual Refresh
      // button passes force=true to bypass the skip.
      const signature = JSON.stringify(data);
      if (!force && signature === lastSnapshotSig.current && historyIndex !== -1) {
        return;
      }
      lastSnapshotSig.current = signature;

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
        // Recomputed defaults + stored custom names are authoritative: every
        // rename path (manual, AI, undo/redo) persists to storage, so letting
        // the stale in-memory map win produced duplicate defaults (two
        // "window2") after windows closed. This also prunes closed windows.
        setWindowNameMap(mergedNames);
      }
      
      // Onboarding check - First Run Logic
      // Auto-show at most once per session: loadTabs re-runs on every tab
      // event (including tabs woken for previews), and re-opening a dialog
      // the user already dismissed with X is wrong.
      if (!storage.hasSeenOnboarding && onboardingIndex === -1 && !hasAutoShownWelcome.current) {
        hasAutoShownWelcome.current = true;
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
      handleError("Error Loading Tabs", "We encountered an issue while trying to access your browser tabs.", e);
    } finally {
      setIsLoading(false);
    }
  }, [windows.length, onboardingIndex, historyIndex, windowNameMap]);

  // The subscription lives for the app's lifetime, so it must call the
  // LATEST loadTabs. Capturing loadTabs directly in the []-deps effect froze
  // its first-render closure (windows=[], historyIndex=-1), which re-ran the
  // "first load" branch on every chrome event — resetting the rename-undo
  // history and blinking the loading state.
  useEffect(() => { loadTabsRef.current = loadTabs; }, [loadTabs]);

  useEffect(() => {
    loadTabsRef.current();
    const unsubscribe = subscribeToUpdates(() => loadTabsRef.current());
    return unsubscribe;
  }, []);

  // --- COMPUTED DATA ---
  const allTabs = useMemo(() => windows.flatMap(w => w.tabs), [windows]);

  // Lazily index page text while a content-scoped search is active. Sleeping
  // tabs are never woken for this, and restricted pages index as empty (they
  // stay searchable by title/URL). Captures run through the shared 4-wide
  // concurrency gate in tabService.
  useEffect(() => {
    if (searchScope !== 'content' || !searchQuery.trim()) return;
    const pending = allTabs.filter(t => !t.discarded && !pageTextIndex.current.has(`${t.id}|${t.url}`));
    if (pending.length === 0) return;
    let cancelled = false;
    setIndexingRemaining(pending.length);
    pending.forEach(t => {
      getTabPageText(t).then(text => {
        pageTextIndex.current.set(`${t.id}|${t.url}`, text);
        if (!cancelled) {
          setIndexingRemaining(r => Math.max(0, r - 1));
          setPageTextVersion(v => v + 1);
        }
      });
    });
    return () => { cancelled = true; };
  }, [searchScope, searchQuery, allTabs]);

  const tabMatchesQuery = useCallback((t: Tab, q: string): boolean => {
    if (searchScope === 'domain') {
      let domain = 'local';
      try { domain = new URL(t.url).hostname; } catch (e) { /* non-URL pages match as 'local' */ }
      return domain.toLowerCase().includes(q);
    }
    if (t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)) return true;
    if (searchScope === 'content') {
      const text = pageTextIndex.current.get(`${t.id}|${t.url}`);
      if (text && text.includes(q)) return true;
    }
    return false;
  }, [searchScope, pageTextVersion]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // 3. Search Filter (if not in AI Grouped Mode)
    // In AI Grouped mode, we filter *inside* the groups logic below to keep structure
    if (searchQuery.trim() && viewMode !== ViewMode.AI_GROUPED) {
      const q = searchQuery.toLowerCase();
      tabs = tabs.filter(t => tabMatchesQuery(t, q));
    }
    return tabs;
  }, [allTabs, windows, viewMode, activeWindowId, searchQuery, sidebarSelectedWindowIds, tabMatchesQuery]);

  const getSortedTabs = useCallback((tabs: Tab[]) => {
    return [...tabs].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'window': {
          // Natural sort so window10 follows window9, not window1.
          const cmp = compareWindowNames(windowNameMap[a.windowId] || '', windowNameMap[b.windowId] || '');
          return sortDirection === 'asc' ? cmp : -cmp;
        }
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

  // --- STABLE ROW ORDER ---
  // Closing a tab (or any chrome event) refreshes the snapshot, and with the
  // default "last accessed" sort the freshly-activated tab would jump rows —
  // reshuffling the list right under the user's cursor. So the visible order
  // is frozen: it only re-sorts when the user changes sort/filter/search/view
  // or presses Refresh (resortEpoch). Otherwise closed tabs just drop out and
  // new tabs append at the bottom; cell contents still update live.
  const displayOrderRef = useRef<string[]>([]);
  const displayOrderKeyRef = useRef('');
  const [resortEpoch, setResortEpoch] = useState(0);

  const currentDisplayedTabs = useMemo(() => {
    const sorted = getSortedTabs(filteredTabs);
    const key = [sortField, sortDirection, viewMode, activeWindowId || '', searchQuery, searchScope, sidebarSelectedWindowIds.join(','), resortEpoch].join('|');
    if (key !== displayOrderKeyRef.current) {
      displayOrderKeyRef.current = key;
      displayOrderRef.current = sorted.map(t => t.id);
      return sorted;
    }
    const byId = new Map(sorted.map(t => [t.id, t] as const));
    const kept = displayOrderRef.current.filter(id => byId.has(id)).map(id => byId.get(id)!);
    const keptIds = new Set(displayOrderRef.current);
    const added = sorted.filter(t => !keptIds.has(t.id));
    const next = [...kept, ...added];
    displayOrderRef.current = next.map(t => t.id);
    return next;
  }, [filteredTabs, getSortedTabs, sortField, sortDirection, viewMode, activeWindowId, searchQuery, searchScope, sidebarSelectedWindowIds, resortEpoch]);

  // AI Grouped Tabs with Search Filter
  const filteredTabGroups = useMemo(() => {
    if (viewMode !== ViewMode.AI_GROUPED) return [];
    
    // If no search, return all
    if (!searchQuery.trim()) return tabGroups;
    
    const q = searchQuery.toLowerCase();
    
    // Filter tabs within groups, return groups that are not empty
    return tabGroups.map(group => {
      const filteredIds = group.tabIds.filter(id => {
        const t = allTabs.find(tab => tab.id === id);
        if (!t) return false;
        return tabMatchesQuery(t, q);
      });
      return { ...group, tabIds: filteredIds };
    }).filter(group => group.tabIds.length > 0);
  }, [viewMode, tabGroups, searchQuery, allTabs, tabMatchesQuery]);


  // Navigation Tabs: Flattened list for keyboard navigation that matches the visual order
  const navigationTabs = useMemo(() => {
    // If in AI Grouped mode, flatten the filtered groups
    if (viewMode === ViewMode.AI_GROUPED && sidebarSelectedWindowIds.length === 0) {
      return filteredTabGroups.flatMap(g => 
        // We also need to apply the sort here to match visual order
        getSortedTabs(
          g.tabIds
          .map(id => allTabs.find(t => t.id === id))
          .filter((t): t is Tab => !!t)
        )
      );
    }
    // Otherwise, it renders the standard sorted list
    return currentDisplayedTabs;
  }, [viewMode, searchQuery, sidebarSelectedWindowIds, filteredTabGroups, allTabs, currentDisplayedTabs, getSortedTabs]);

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

  const handleShowIntro = () => {
    setCurrentTourSteps(FIRST_RUN_STEP);
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
    
    // Resume interrupted action
    if (pendingAction === 'ORGANIZE') {
      handleOrganizeTabs();
    } else if (pendingAction === 'AUTO_RENAME') {
      handleAutoRenameWindows();
    }
    setPendingAction(null);
  };

  // --- KEYBOARD NAV ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      if (onboardingIndex !== -1) return;

      // Area switching lives on Ctrl+Arrow so plain arrows can navigate the
      // card grid in two dimensions.
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedArea('sidebar');
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedArea('tabs');
        return;
      }
      // Card size hotkeys: [ shrinks, ] grows (card view only).
      if (tabDisplayMode === 'card' && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        applyCardWidth(cardWidth + (e.key === ']' ? 40 : -40));
        return;
      }
      if (focusedArea === 'sidebar') {
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
        const isArrow = e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
        if (isArrow) {
          // Detail view: Up/Down step through rows (Left/Right unused).
          // Card view: all four arrows move through the grid; Up/Down jump
          // by one visual row using the current column count.
          let step = 0;
          if (tabDisplayMode === 'card') {
            if (e.key === 'ArrowDown') step = cardColumns;
            else if (e.key === 'ArrowUp') step = -cardColumns;
            else if (e.key === 'ArrowRight') step = 1;
            else step = -1;
          } else {
            if (e.key === 'ArrowDown') step = 1;
            else if (e.key === 'ArrowUp') step = -1;
            else return;
          }
          e.preventDefault();
          if (navigationTabs.length === 0) return;

          const currentIndex = navigationTabs.findIndex(t => t.id === selectedTabId);
          const nextIndex = currentIndex === -1
            ? 0
            : Math.min(Math.max(currentIndex + step, 0), navigationTabs.length - 1);

          setSelectedTabId(navigationTabs[nextIndex].id);
        } else if (e.key === 'Enter' && selectedTabId) {
          const tab = navigationTabs.find(t => t.id === selectedTabId);
          if (tab) handleActivateTab(tab);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigationTabs, selectedTabId, focusedArea, sidebarFocusIndex, windows, onboardingIndex, tabDisplayMode, cardColumns, cardWidth]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection(field === 'lastAccessed' ? 'desc' : 'asc'); }
  };

  const handleForceGlobalSort = (field: SortField) => {
    setGlobalGroupSort({
      field,
      direction: 'asc', // Default to asc when picking new field
      timestamp: Date.now()
    });
    setShowSortMenu(false);
  };

  const handleCloseTab = async (tabId: string) => {
    try {
      await closeTab(tabId);
      setWindows(prev => prev.map(w => ({ ...w, tabs: w.tabs.filter(t => t.id !== tabId) })));
      if (selectedTabId === tabId) setSelectedTabId(null);
      setCheckedTabIds(prev => prev.filter(id => id !== tabId));
      showNotification("Tab closed", 'info');
    } catch (error) { 
      // Keep silent/toast for minor interaction errors to avoid disruption
      showNotification("Failed to close tab", 'info'); 
    }
  };

  const handleActivateTab = async (tab: Tab) => {
    try { await activateTab(tab); }
    catch (error) {
      showNotification("Failed to switch tab", 'info');
    }
  };

  const applySearchScope = (scope: 'domain' | 'title' | 'content') => {
    setSearchScope(scope);
    saveViewSettings({ searchScope: scope });
    setShowSearchScopeMenu(false);
  };

  // Close every checked tab (confirmed via modal beforehand).
  const handleCloseCheckedTabs = async () => {
    const ids = [...checkedTabIds];
    setShowCloseCheckedConfirm(false);
    try {
      await closeTabs(ids);
      setCheckedTabIds([]);
      if (selectedTabId && ids.includes(selectedTabId)) setSelectedTabId(null);
      await loadTabs(true);
      showNotification(`${ids.length} tab${ids.length > 1 ? 's' : ''} closed`, 'info');
    } catch (err) {
      handleError("Close Failed", "Could not close the checked tabs.", err);
    }
  };

  // --- CARD VIEW SETTINGS ---
  const setDisplayMode = (mode: 'detail' | 'card') => {
    setTabDisplayMode(mode);
    saveViewSettings({ tabViewMode: mode });
  };

  const setGrouping = (grouping: 'tab' | 'window') => {
    setCardGrouping(grouping);
    saveViewSettings({ cardGrouping: grouping });
  };

  const applyCardWidth = (width: number) => {
    // High cap so zooming can reach a single full-width column; TabCardView
    // clamps the rendered width to its container so nothing overflows.
    const clamped = Math.max(160, Math.min(1200, width));
    setCardWidth(clamped);
    saveViewSettings({ cardWidth: clamped });
  };

  const toggleMetadataField = (field: CardMetadataField) => {
    setCardMetadata(prev => {
      const next = prev.map(m => m.field === field ? { ...m, visible: !m.visible } : m);
      saveViewSettings({ cardMetadata: next });
      return next;
    });
  };

  const moveMetadataField = (index: number, dir: -1 | 1) => {
    setCardMetadata(prev => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      saveViewSettings({ cardMetadata: next });
      return next;
    });
  };

  // --- AUTO-WAKE (settled selection) ---
  // A sleeping tab wakes automatically once it has stayed selected for
  // 400ms — a deliberate click feels instant, but arrow-keying through a
  // list of mostly-sleeping tabs can't fire dozens of reloads.
  const selectedDiscardedTabId = useMemo(() => {
    const tab = allTabs.find(t => t.id === selectedTabId);
    return tab?.discarded ? tab.id : null;
  }, [allTabs, selectedTabId]);

  useEffect(() => {
    if (!selectedDiscardedTabId) return;
    const timer = setTimeout(async () => {
      const ok = await wakeTab(selectedDiscardedTabId);
      if (ok) {
        setWakeSignal(s => s + 1);
        loadTabsRef.current();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedDiscardedTabId]);

  // --- SINGLE-WINDOW AI NAMING ---
  const handleAutoNameSingleWindow = async (windowId: string) => {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    setIsRenamingWindows(true);
    try {
      const newNames = await generateWindowNamesWithAI([win]);
      const updatedMap = { ...windowNameMap, ...newNames };
      pushNameHistory(updatedMap);
      await saveCustomWindowNames(newNames);
      showNotification("Window renamed", 'success');
    } catch (error: any) {
      if (error.message === "NO_API_KEY" || error.message === "INVALID_API_KEY") {
        setShowApiKeyModal(true);
      } else {
        handleError("Rename Failed", "We couldn't generate a name for this window.", error);
      }
    } finally {
      setIsRenamingWindows(false);
    }
  };

  // --- BATCH RENAME (base name + sequential numbering) ---
  const applyBatchRename = async (base: string) => {
    const targets = [...sidebarSelectedWindowIds].sort((a, b) =>
      compareWindowNames(windowNameMap[a] || '', windowNameMap[b] || ''));
    const newMap = { ...windowNameMap };
    const renamed: Record<string, string> = {};
    targets.forEach((id, i) => { newMap[id] = `${base}${i + 1}`; renamed[id] = newMap[id]; });
    pushNameHistory(newMap); // single history entry: one Undo reverts the whole batch
    await saveCustomWindowNames(renamed);
    showNotification(`Renamed ${targets.length} windows`, 'success');
  };

  // --- CONTEXT MENUS ---
  const openTabContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    e.stopPropagation();
    // Right-clicking a checked tab acts on all checked tabs.
    const multi = checkedTabIds.length > 1 && checkedTabIds.includes(tab.id);
    const targetIds = multi ? checkedTabIds : [tab.id];
    const countLabel = multi ? `${targetIds.length} Tabs` : 'Tab';
    const sortedWins = [...windows].sort((a, b) =>
      compareWindowNames(windowNameMap[a.id] || a.name, windowNameMap[b.id] || b.name));
    const items: ContextMenuItem[] = [
      {
        label: 'Switch to Tab',
        icon: <ExternalLink size={14} />,
        onClick: () => handleActivateTab(tab)
      },
      {
        label: `Move ${countLabel} to Window`,
        icon: <FolderInput size={14} />,
        submenu: sortedWins.map(w => ({
          label: `${windowNameMap[w.id] || w.name} (${w.tabs.length})`,
          disabled: !multi && w.id === tab.windowId,
          onClick: async () => {
            try {
              await moveTabs(targetIds, w.id);
              await loadTabs(true);
              showNotification(multi ? `${targetIds.length} tabs moved` : 'Tab moved', 'success');
            } catch (err) { handleError("Move Failed", "Could not move to that window.", err); }
          }
        }))
      },
      {
        label: `Move ${countLabel} to New Window`,
        icon: <FolderPlus size={14} />,
        onClick: async () => {
          try { await createWindowWithTabs(targetIds); await loadTabs(true); }
          catch (err) { handleError("Move Failed", "Could not move to a new window.", err); }
        }
      },
      {
        label: multi ? `Copy ${targetIds.length} URLs` : 'Copy URL',
        icon: <Copy size={14} />,
        separatorAbove: true,
        onClick: () => {
          const urls = targetIds
            .map(id => allTabs.find(t => t.id === id)?.url)
            .filter(Boolean)
            .join('\n');
          navigator.clipboard.writeText(urls);
          showNotification(multi ? 'URLs copied' : 'URL copied', 'success');
        }
      }
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openWindowContextMenu = (e: React.MouseEvent, windowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    const name = windowNameMap[windowId] || win.name;
    const batch = sidebarSelectedWindowIds.length > 1 && sidebarSelectedWindowIds.includes(windowId);
    const items: ContextMenuItem[] = [
      {
        label: batch ? `Rename ${sidebarSelectedWindowIds.length} Checked Windows…` : 'Rename…',
        icon: <Edit2 size={14} />,
        onClick: () => {
          if (batch) {
            setPromptModal({
              title: 'Rename Checked Windows',
              message: `Enter a base name; the ${sidebarSelectedWindowIds.length} checked windows will be numbered name1, name2, …`,
              submitText: 'Rename All',
              onSubmit: applyBatchRename
            });
          } else {
            setPromptModal({
              title: 'Rename Window',
              initialValue: name,
              onSubmit: (value) => handleRenameWindow(windowId, value)
            });
          }
        }
      },
      { label: 'Undo Name Change', icon: <Undo2 size={14} />, disabled: !(historyIndex > 0), onClick: handleUndoNameChange },
      { label: 'Redo Name Change', icon: <Redo2 size={14} />, disabled: !(historyIndex < nameHistory.length - 1), onClick: handleRedoNameChange },
      { label: 'Focus Window in Chrome', icon: <ExternalLink size={14} />, separatorAbove: true, onClick: () => focusWindow(windowId) },
      { label: 'Auto-Name with AI', icon: <Wand2 size={14} />, onClick: () => handleAutoNameSingleWindow(windowId) }
    ];
    if (sidebarSelectedWindowIds.length >= 2) {
      const sources = sidebarSelectedWindowIds.filter(id => id !== windowId);
      items.push({
        label: `Merge ${sources.length} Checked Window${sources.length > 1 ? 's' : ''} Here`,
        icon: <FolderInput size={14} />,
        separatorAbove: true,
        onClick: () => handleMerge(sources, windowId)
      });
    }
    if (checkedTabIds.length > 0) {
      items.push({
        label: `Move ${checkedTabIds.length} Checked Tab${checkedTabIds.length > 1 ? 's' : ''} Here`,
        icon: <FolderInput size={14} />,
        onClick: async () => {
          try {
            await moveTabs(checkedTabIds, windowId);
            setCheckedTabIds([]);
            await loadTabs(true);
            showNotification('Tabs moved', 'success');
          } catch (err) { handleError("Move Failed", "Could not move the checked tabs.", err); }
        }
      });
    }
    items.push({
      label: 'Close Window…',
      icon: <Trash2 size={14} />,
      danger: true,
      separatorAbove: true,
      onClick: () => setConfirmCloseWindowId(windowId)
    });
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openGroupContextMenu = (e: React.MouseEvent, group: TabGroup) => {
    e.preventDefault();
    const items: ContextMenuItem[] = [
      {
        label: `Check All Tabs in Group (${group.tabIds.length})`,
        icon: <CheckSquare size={14} />,
        onClick: () => toggleAllChecks(group.tabIds, true)
      },
      {
        label: 'Move Group to New Window',
        icon: <FolderPlus size={14} />,
        onClick: async () => {
          try {
            await createWindowWithTabs(group.tabIds);
            await loadTabs(true);
            showNotification('Group moved to new window', 'success');
          } catch (err) { handleError("Move Failed", "Could not move the group.", err); }
        }
      }
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
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
        setPendingAction('ORGANIZE');
        setShowApiKeyModal(true);
      } else {
        handleError("Organization Failed", "We couldn't analyze your tabs. This often happens due to network issues or API limits.", error); 
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

      // 3. Save all to storage in one write
      await saveCustomWindowNames(newNames);
      
      showNotification(
        sidebarSelectedWindowIds.length > 0 
          ? `Renamed ${sidebarSelectedWindowIds.length} checked windows` 
          : "All windows renamed", 
        'success'
      );

    } catch (error: any) {
      if (error.message === "NO_API_KEY" || error.message === "INVALID_API_KEY") {
        setPendingAction('AUTO_RENAME');
        setShowApiKeyModal(true);
      } else {
        handleError("Rename Failed", "We couldn't generate new names for your windows. Please check your API key or network.", error);
      }
    } finally {
      setIsRenamingWindows(false);
    }
  };

  const handleApplyAiOrganization = async () => {
    setIsMergeProcessing(true);
    try {
      // 1. Snapshot current state for undo
      const snapshot: WindowReorgSnapshot = {
        timestamp: Date.now(),
        windows: windows.map(w => ({
          id: w.id,
          name: windowNameMap[w.id] || w.name,
          tabIds: w.tabs.map(t => t.id)
        }))
      };
      setReorgHistory(prev => [...prev, snapshot]);

      // 2. Execute Moves
      const sortedWindows = [...windows].sort((a, b) => a.id.localeCompare(b.id)); // Stable order to recycle

      const newNameMap = { ...windowNameMap };

      // Tabs may have closed since the groups were generated (and the AI can
      // return ids that never existed) — moving a stale id throws and aborts
      // the reorg midway, so only currently-open tabs are moved.
      const openTabIds = new Set(allTabs.map(t => t.id));

      for (let i = 0; i < tabGroups.length; i++) {
        const group = tabGroups[i];
        const validTabIds = group.tabIds.filter(id => openTabIds.has(id));

        let targetWindowId: string;

        if (i < sortedWindows.length) {
          // Recycle existing window
          targetWindowId = sortedWindows[i].id;
          // Rename it
          newNameMap[targetWindowId] = group.categoryName;
          await saveCustomWindowName(targetWindowId, group.categoryName);
        } else {
          // Create new window
          if (validTabIds.length === 0) continue;
          await createWindowWithTabs(validTabIds);
          continue;
        }

        // Move tabs to recycled window
        if (validTabIds.length > 0) {
          await moveTabs(validTabIds, targetWindowId);
        }
      }

      pushNameHistory(newNameMap);
      await loadTabs();
      showNotification("Tabs reorganized into windows!", 'success');
      setShowReorgConfirm(false);
      setViewMode(ViewMode.ALL); // Switch back to see results

    } catch (e) {
      handleError("Reorganization Failed", "Something went wrong while moving your tabs. Changes may be partial.", e);
    } finally {
      setIsMergeProcessing(false);
    }
  };

  const handleUndoReorg = async () => {
    if (reorgHistory.length === 0) return;
    
    setIsMergeProcessing(true);
    const snapshot = reorgHistory[reorgHistory.length - 1];
    
    try {
      // Restore logic
      // We iterate through snapshot windows and try to reconstruct them
      
      // 1. Get current available windows
      await loadTabs(); 
      // Note: `windows` state might be stale inside async function unless we re-fetch or use ref, 
      // but we called loadTabs above. Since state updates are async, we should use getWindows() directly.
      const currentWindows = await getWindows();
      const currentWindowIds = new Set(currentWindows.map(w => w.id));
      // Tabs closed since the snapshot can't be moved — a stale id throws
      // and aborts the whole undo.
      const openTabIds = new Set(currentWindows.flatMap(w => w.tabs).map(t => t.id));

      const restoredNameMap = { ...windowNameMap };

      for (const snapWin of snapshot.windows) {
         const validTabIds = snapWin.tabIds.filter(id => openTabIds.has(id));
         if (currentWindowIds.has(snapWin.id)) {
           // Window still exists, move tabs back
           if (validTabIds.length > 0) {
             await moveTabs(validTabIds, snapWin.id);
           }
           restoredNameMap[snapWin.id] = snapWin.name;
           await saveCustomWindowName(snapWin.id, snapWin.name);
         } else {
           // Window is gone, create new one with these tabs
           if (validTabIds.length > 0) {
              await createWindowWithTabs(validTabIds);
              // Name is lost for new ID unless we track it, simplification for now.
           }
         }
      }

      setReorgHistory(prev => prev.slice(0, -1));
      pushNameHistory(restoredNameMap);
      await loadTabs();
      showNotification("Undo successful", 'success');

    } catch (e) {
      handleError("Undo Failed", "We couldn't restore the previous layout.", e);
    } finally {
      setIsMergeProcessing(false);
    }
  };

  const handleUndoNameChange = async () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevMap = nameHistory[prevIndex];
      setHistoryIndex(prevIndex);
      setWindowNameMap(prevMap);
      await saveCustomWindowNames(prevMap);
      showNotification("Undo successful", 'info');
    }
  };

  const handleRedoNameChange = async () => {
    if (historyIndex < nameHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextMap = nameHistory[nextIndex];
      setHistoryIndex(nextIndex);
      setWindowNameMap(nextMap);
      await saveCustomWindowNames(nextMap);
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
    } catch (e) { 
      handleError("Move Failed", "Could not move tabs to a new window.", e);
    } finally { 
      setIsLoading(false); 
    }
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
    } catch (e) { 
      handleError("Merge Failed", "Could not merge the selected windows.", e);
    } finally { 
      setIsMergeProcessing(false); 
    }
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
        const lastAccessed = t.lastAccessed ? new Date(t.lastAccessed).toLocaleString().replace(/"/g, '""') : '';
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
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const selectedTab = useMemo(() => allTabs.find(t => t.id === selectedTabId) || null, [allTabs, selectedTabId]);

  // Window-grouped cards only make sense in All-Tabs-style views; AI groups
  // and By Window mode are not window-shaped collections.
  const groupingLocked = viewMode !== ViewMode.ALL;
  const effectiveGrouping: 'tab' | 'window' = groupingLocked ? 'tab' : cardGrouping;

  const cardWindows = useMemo(
    () => sidebarSelectedWindowIds.length > 0
      ? windows.filter(w => sidebarSelectedWindowIds.includes(w.id))
      : windows,
    [windows, sidebarSelectedWindowIds]
  );

  const renderCardView = (tabsForView: Tab[], grouping: 'tab' | 'window') => (
    <TabCardView
      grouping={grouping}
      tabs={tabsForView}
      windows={cardWindows}
      windowNames={windowNameMap}
      cardWidth={cardWidth}
      metadata={cardMetadata}
      selectedTabId={selectedTabId}
      checkedTabIds={checkedTabIds}
      selectedWindowIds={sidebarSelectedWindowIds}
      focusedArea={focusedArea}
      onSelect={setSelectedTabId}
      onActivate={handleActivateTab}
      onClose={handleCloseTab}
      onToggleTabCheck={toggleTabCheck}
      onToggleWindowSelection={(id) => setSidebarSelectedWindowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
      onTabContextMenu={openTabContextMenu}
      onWindowContextMenu={openWindowContextMenu}
      onDrillIntoWindow={(id) => { setViewMode(ViewMode.BY_WINDOW); setActiveWindowId(id); }}
      onFocusWindow={focusWindow}
      onColumnsChange={setCardColumns}
    />
  );

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
        onWindowContextMenu={openWindowContextMenu}
      />

      <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-200 ${focusedArea === 'tabs' ? 'ring-1 ring-inset ring-slate-200 dark:ring-slate-800' : 'opacity-90'}`}>
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40 relative">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden md:block whitespace-nowrap">
              {sidebarSelectedWindowIds.length > 0 
                ? `Selected Windows (${sidebarSelectedWindowIds.length})` 
                : viewMode === ViewMode.ALL ? 'All Tabs'
                : viewMode === ViewMode.AI_GROUPED ? 'AI Organized'
                : (windowNameMap[activeWindowId || ''] || 'Current Window')
              }
            </h1>

            {/* AI Reorg Controls */}
            {viewMode === ViewMode.AI_GROUPED && !sidebarSelectedWindowIds.length && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                 {/* Global Sort for AI Groups */}
                 <div className="relative" ref={sortMenuRef}>
                   <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                   >
                     <ListFilter size={14} />
                     Sort All
                   </button>
                   {showSortMenu && (
                     <div className="absolute top-full left-0 mt-2 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1">
                       <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort All Groups By</div>
                       <button onClick={() => handleForceGlobalSort('title')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">Name</button>
                       <button onClick={() => handleForceGlobalSort('url')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">Domain</button>
                       <button onClick={() => handleForceGlobalSort('window')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">Window</button>
                       <button onClick={() => handleForceGlobalSort('lastAccessed')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">Last Accessed</button>
                     </div>
                   )}
                 </div>

                 {reorgHistory.length > 0 && (
                   <button
                    onClick={handleUndoReorg}
                    disabled={isMergeProcessing}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                    Undo Reorg
                  </button>
                 )}
                 <button
                   onClick={() => setShowReorgConfirm(true)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                 >
                   <LayoutTemplate size={14} />
                   Apply to Windows
                 </button>
              </div>
            )}
            
            <div className="relative max-w-md w-full ml-auto sm:ml-4" data-tour="search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder={
                  searchScope === 'content' ? "Search titles, URLs & page text..."
                  : searchScope === 'title' ? "Search tab titles & URLs..."
                  : "Search domain names..."
                }
                value={searchQuery}
                onFocus={() => setFocusedArea('tabs')}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-full pl-10 pr-24 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-600"
              />
              {/* Search scope switch: what the query matches against */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2" ref={searchScopeMenuRef}>
                <button
                  onClick={() => setShowSearchScopeMenu(!showSearchScopeMenu)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    searchScope === 'content'
                      ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Choose what the search matches"
                >
                  {indexingRemaining > 0
                    ? <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border border-indigo-500 border-t-transparent rounded-full animate-spin" />{indexingRemaining}</span>
                    : (searchScope === 'content' ? 'Text' : searchScope === 'title' ? 'Titles' : 'Domain')}
                  <ChevronDown size={10} />
                </button>
                {showSearchScopeMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search In</div>
                    <button onClick={() => applySearchScope('domain')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                      <span className="flex items-center justify-between">Domain names {searchScope === 'domain' && <span className="text-indigo-500">✓</span>}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Matches only the server name, e.g. "github.com"</span>
                    </button>
                    <button onClick={() => applySearchScope('title')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                      <span className="flex items-center justify-between">Titles &amp; URLs {searchScope === 'title' && <span className="text-indigo-500">✓</span>}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Fast — matches tab names and addresses</span>
                    </button>
                    <button onClick={() => applySearchScope('content')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                      <span className="flex items-center justify-between">Titles, URLs &amp; page text {searchScope === 'content' && <span className="text-indigo-500">✓</span>}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Also searches the visible text of open tabs. Sleeping tabs and system pages match by title/URL only.</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
            
            <div className="flex items-center gap-1">
              {/* Check-all: check every currently displayed tab (respects
                  search + filters), e.g. search "amazon" → check all → close. */}
              {checkedTabIds.length === 0 && navigationTabs.length > 0 && (
                <button
                  onClick={() => toggleAllChecks(navigationTabs.map(t => t.id), true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors whitespace-nowrap"
                  title="Check all tabs currently displayed"
                >
                  <CheckSquare size={14} />
                  Check All ({navigationTabs.length})
                </button>
              )}
              {checkedTabIds.length > 0 && (
                <div className="flex items-center gap-1.5 mr-2 animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={handleMoveTabsToNewWindow}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                    title="Move checked tabs to a new window"
                  >
                    <FolderPlus size={14} />
                    Move {checkedTabIds.length}
                  </button>
                  <button
                    onClick={() => setShowCloseCheckedConfirm(true)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                    title="Close all checked tabs"
                  >
                    <Trash2 size={14} />
                    Close {checkedTabIds.length}
                  </button>
                  <button
                    onClick={() => setCheckedTabIds([])}
                    className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Uncheck all"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Detail / Card view toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 mr-1" data-tour="view-toggle">
                <button
                  onClick={() => setDisplayMode('detail')}
                  className={`p-1.5 rounded-full transition-colors ${tabDisplayMode === 'detail' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="Detail view"
                >
                  <List size={15} />
                </button>
                <button
                  onClick={() => setDisplayMode('card')}
                  className={`p-1.5 rounded-full transition-colors ${tabDisplayMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  title="Card view"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>

              {tabDisplayMode === 'card' && (
                <div className="flex items-center gap-1 mr-1 animate-in fade-in duration-200">
                  {/* Tab cards vs Window cards */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 text-[11px] font-medium">
                    <button
                      onClick={() => setGrouping('tab')}
                      className={`px-2 py-1 rounded-full transition-colors ${effectiveGrouping === 'tab' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                      title="One card per tab"
                    >
                      Tabs
                    </button>
                    <button
                      onClick={() => setGrouping('window')}
                      disabled={groupingLocked}
                      className={`px-2 py-1 rounded-full transition-colors disabled:opacity-40 ${effectiveGrouping === 'window' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                      title={groupingLocked ? 'Window cards are available in the All Tabs view' : 'One card per window'}
                    >
                      Windows
                    </button>
                  </div>

                  {/* Card size */}
                  <button
                    onClick={() => applyCardWidth(cardWidth - 40)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"
                    title="Smaller cards  ( [ )"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="range"
                    min={160}
                    max={1200}
                    step={20}
                    value={cardWidth}
                    onChange={(e) => applyCardWidth(parseInt(e.target.value, 10))}
                    onDoubleClick={() => applyCardWidth(240)}
                    className="w-20 accent-indigo-600 cursor-pointer"
                    title="Card size — double-click to reset"
                  />
                  <button
                    onClick={() => applyCardWidth(cardWidth + 40)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"
                    title="Larger cards  ( ] )"
                  >
                    <Plus size={14} />
                  </button>

                  {/* Card sort (no column headers to click in card view) */}
                  <div className="relative" ref={cardSortMenuRef}>
                    <button
                      onClick={() => setShowCardSortMenu(!showCardSortMenu)}
                      className={`p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 ${showCardSortMenu ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                      title="Sort cards"
                    >
                      <ListFilter size={15} />
                    </button>
                    {showCardSortMenu && (
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort Cards By</div>
                        {([['title', 'Name'], ['url', 'Domain'], ['window', 'Window'], ['lastAccessed', 'Last Accessed']] as [SortField, string][]).map(([field, label]) => (
                          <button
                            key={field}
                            onClick={() => handleSort(field)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center justify-between text-slate-700 dark:text-slate-200"
                          >
                            {label}
                            {sortField === field && <span className="text-indigo-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                  data-tour="theme"
                  onClick={toggleTheme}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                  title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative help-btn-wrapper" ref={helpMenuRef}>
                <button 
                  id="help-btn"
                  onClick={() => setShowHelpMenu(!showHelpMenu)}
                  className={`p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors ${showHelpMenu ? 'text-indigo-600 dark:text-white bg-slate-200 dark:bg-slate-800' : ''}`}
                  title="Help & Support"
                >
                  <HelpCircle size={18} />
                </button>
                {showHelpMenu && (
                   <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={startFullTour} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <HelpCircle size={14} /> Start Interactive Tour
                    </button>
                    <button onClick={() => { setShowUserGuide(true); setShowHelpMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <BookOpen size={14} /> View User Guide
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                     <button onClick={handleShowIntro} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Sparkles size={14} /> Show Welcome Screen
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={exportMenuRef} data-tour="export">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors ${showExportMenu ? 'text-indigo-600 dark:text-white bg-slate-200 dark:bg-slate-800' : ''}`}
                  title="Export Data"
                >
                  <Download size={18} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
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
                data-tour="preview-toggle"
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-full transition-colors ${showPreview ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                title="Show/hide preview panel"
              >
                {showPreview ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              <button
                onClick={() => { setResortEpoch(e => e + 1); loadTabs(true); }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                title="Refresh & re-sort tabs"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              
              {/* Settings Trigger - Moved to End */}
              <div className="relative settings-btn-wrapper" ref={settingsMenuRef} data-tour="settings">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors ${showSettingsMenu ? 'text-indigo-600 dark:text-white bg-slate-200 dark:bg-slate-800' : ''}`}
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
                {showSettingsMenu && (
                   <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                     <button onClick={() => { setShowApiKeyModal(true); setShowSettingsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Key size={14} /> Set API Key
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                    {/* Card view metadata: what shows on each card, in which order */}
                    <div className="px-4 py-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card View Fields</p>
                      {cardMetadata.map((m, idx) => (
                        <div key={m.field} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={m.visible}
                            onChange={() => toggleMetadataField(m.field)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900 border cursor-pointer"
                          />
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{METADATA_LABELS[m.field]}</span>
                          <button
                            onClick={() => moveMetadataField(idx, -1)}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400"
                            title="Move up"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveMetadataField(idx, 1)}
                            disabled={idx === cardMetadata.length - 1}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400"
                            title="Move down"
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
              ? `${tabDisplayMode === 'card' ? 'Press "[" or "]" to zoom cards smaller / larger. ' : ''}Extension Active. Single-click previews a tab; double-click (or ↗ / Enter) switches to it. Ctrl+Left/Right moves between Sidebar and Tabs.`
              : DEMO_NOTICE
            }
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden" onClick={() => setFocusedArea('tabs')}>
          {/* Main Container: Removed top padding to fix sticky header gap issue */}
          <main className="flex-1 min-w-0 overflow-y-auto px-6 pb-6 pt-0 scroll-smooth" data-tour="tabs-area">
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
            ) : viewMode === ViewMode.AI_GROUPED && !sidebarSelectedWindowIds.length ? (
               <div className="space-y-8 pb-10">
                 {filteredTabGroups.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-slate-500"><p>{searchQuery ? 'No matching tabs found in groups.' : 'No groups. Click "Organize with AI".'}</p></div>}
                 {filteredTabGroups.map((group, idx) => {
                   const groupTabs = group.tabIds.map(id => allTabs.find(t => t.id === id)).filter((t): t is Tab => t !== undefined);
                   return (
                     <div key={idx} className="space-y-2">
                       <h3
                         className="text-lg font-semibold text-indigo-600 dark:text-indigo-300 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2"
                         onContextMenu={(e) => openGroupContextMenu(e, group)}
                         title="Right-click for group actions"
                       >
                         {group.categoryName}
                       </h3>
                       {tabDisplayMode === 'card' ? (
                         renderCardView(getSortedTabs(groupTabs), 'tab')
                       ) : (
                       <TabListView
                         tabs={groupTabs}
                         windows={windows}
                         windowNames={windowNameMap}
                         onActivate={handleActivateTab}
                         onClose={handleCloseTab}

                         // Global Forced Sort
                         forcedSort={globalGroupSort}

                         // Standard Sort Props (ignored inside component if forcedSort is active for a cycle, but used for local)
                         // We remove global props from here so local sort works by default

                         selectedTabId={selectedTabId}
                         onSelect={setSelectedTabId}
                         checkedTabIds={checkedTabIds}
                         onToggleTabCheck={toggleTabCheck}
                         onToggleAllChecks={toggleAllChecks}
                         focusedArea={focusedArea}
                         onTabContextMenu={openTabContextMenu}
                       />
                       )}
                     </div>
                   );
                 })}
               </div>
            ) : tabDisplayMode === 'card' ? (
              renderCardView(currentDisplayedTabs, effectiveGrouping)
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
                onTabContextMenu={openTabContextMenu}
              />
            )}
          </main>
          
          {showPreview && (
            <div className="relative flex h-full shrink-0 shadow-xl z-30" style={{ width: previewWidth, maxWidth: '70vw' }}>
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
                onSelectTab={setSelectedTabId}
                refreshSignal={wakeSignal}
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

        {showReorgConfirm && (
           <ConfirmModal
             title="Reorganize Windows?"
             message="This will move your tabs into new windows based on the AI categories. Existing window names will be updated. You can undo this action."
             confirmText="Yes, Reorganize"
             onConfirm={handleApplyAiOrganization}
             onClose={() => setShowReorgConfirm(false)}
             isProcessing={isMergeProcessing}
           />
        )}

        {showUserGuide && (
          <UserGuideModal onClose={() => setShowUserGuide(false)} />
        )}
        
        {showApiKeyModal && (
          <ApiKeyModal onClose={() => setShowApiKeyModal(false)} onSave={handleSaveApiKey} />
        )}

        {promptModal && (
          <PromptModal
            title={promptModal.title}
            message={promptModal.message}
            initialValue={promptModal.initialValue}
            submitText={promptModal.submitText}
            onSubmit={promptModal.onSubmit}
            onClose={() => setPromptModal(null)}
          />
        )}

        {confirmCloseWindowId && (
          <ConfirmModal
            title="Close Window?"
            message={`Close "${windowNameMap[confirmCloseWindowId] || 'this window'}" and its ${windows.find(w => w.id === confirmCloseWindowId)?.tabs.length ?? 0} tabs? This cannot be undone.`}
            confirmText="Close Window"
            isProcessing={false}
            onConfirm={async () => {
              const id = confirmCloseWindowId;
              setConfirmCloseWindowId(null);
              try {
                await closeWindow(id);
                await loadTabs(true);
                showNotification("Window closed", 'info');
              } catch (err) {
                handleError("Close Failed", "Could not close the window.", err);
              }
            }}
            onClose={() => setConfirmCloseWindowId(null)}
          />
        )}

        {showCloseCheckedConfirm && (
          <ConfirmModal
            title={`Close ${checkedTabIds.length} Tab${checkedTabIds.length > 1 ? 's' : ''}?`}
            message={`This will close ${checkedTabIds.length} checked tab${checkedTabIds.length > 1 ? 's' : ''} in your browser. This cannot be undone.`}
            confirmText={`Close ${checkedTabIds.length} Tab${checkedTabIds.length > 1 ? 's' : ''}`}
            isProcessing={false}
            onConfirm={handleCloseCheckedTabs}
            onClose={() => setShowCloseCheckedConfirm(false)}
          />
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}
        
        {errorModalState && (
          <ErrorModal 
            title={errorModalState.title}
            message={errorModalState.message}
            technicalDetails={errorModalState.details}
            onClose={() => setErrorModalState(null)}
          />
        )}

        {onboardingIndex >= 0 && (
          <OnboardingTour
            stepIndex={onboardingIndex}
            steps={currentTourSteps}
            onJump={(i) => setOnboardingIndex(Math.max(0, Math.min(i, currentTourSteps.length - 1)))}
            onNext={(permanent = true) => onboardingIndex < currentTourSteps.length - 1 ? setOnboardingIndex(i => i + 1) : handleFinishOnboarding(permanent)}
            onSkip={(permanent = true) => handleFinishOnboarding(permanent)}
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
