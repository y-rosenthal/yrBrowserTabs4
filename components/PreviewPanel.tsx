
import React, { useEffect, useRef, useState } from 'react';
import { Tab, WindowData } from '../types';
import { ExternalLink, X, Globe, Lock, Loader2, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { getTabContent, injectBaseTag, isTabDiscarded, wakeTab } from '../services/tabService';
import { Favicon } from './Favicon';

interface PreviewPanelProps {
  tab: Tab | null;
  windows: WindowData[];
  windowNames: Record<string, string>;
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
  onClosePanel: () => void;
  // Selecting a pill previews that tab (same as selecting it in the list).
  onSelectTab: (tabId: string) => void;
  // Bumped by App when a sleeping tab was auto-woken, so the capture retries.
  refreshSignal?: number;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  tab,
  windows,
  windowNames,
  onActivate,
  onClosePanel,
  onSelectTab,
  refreshSignal
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement>(null);
  // Wake completion must only touch the UI of the tab it started for.
  const currentTabIdRef = useRef<string | null>(null);

  const windowName = tab ? (windowNames[tab.windowId] || 'Unknown Window') : '';
  // All tabs in the selected tab's window, for the tab navigator. The panel
  // always shows the same window context regardless of whether the main
  // area is in tab or window mode.
  const windowTabs = tab ? (windows.find(w => w.id === tab.windowId)?.tabs || []) : [];
  const tabIndex = tab ? windowTabs.findIndex(t => t.id === tab.id) : -1;

  const stepTab = (delta: number) => {
    if (!tab || windowTabs.length < 2 || tabIndex === -1) return;
    const next = windowTabs[(tabIndex + delta + windowTabs.length) % windowTabs.length];
    onSelectTab(next.id);
  };

  const handleCopyUrl = () => {
    if (!tab?.url) return;
    navigator.clipboard.writeText(tab.url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1500);
  };

  useEffect(() => {
    let isMounted = true;
    currentTabIdRef.current = tab?.id ?? null;

    const fetchContent = async () => {
      if (!tab) return;

      setIsLoading(true);
      setError(false);
      // Reset per-tab flags so a previous tab's "asleep"/"waking" state can't
      // leak onto this one while the async discard check is in flight.
      setIsSleeping(false);
      setIsWaking(false);
      setHtmlContent(''); // Clear previous content

      try {
        const content = await getTabContent(tab.id);

        if (!isMounted) return;

        if (content) {
          // Inject a <base> tag so relative links (CSS/Images) resolve.
          setHtmlContent(injectBaseTag(content, tab.url));
        } else {
          setError(true);
          // Offer the wake-up action only when the tab is actually asleep
          isTabDiscarded(tab.id).then(discarded => {
            if (isMounted) setIsSleeping(discarded);
          });
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [tab?.id, tab?.url, fetchAttempt, refreshSignal]); // Re-run when tab changes, a retry is requested, or an auto-wake finished

  // Close the tab dropdown when the previewed tab/window changes, and close
  // it on any outside click while open.
  useEffect(() => { setShowTabMenu(false); }, [tab?.id]);
  useEffect(() => {
    if (!showTabMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(e.target as Node)) {
        setShowTabMenu(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only this menu should close — keep the event from App's global
        // Escape handling (document listeners run before window ones).
        e.stopPropagation();
        setShowTabMenu(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showTabMenu]);

  const handleWake = async () => {
    if (!tab) return;
    const wakeId = tab.id;
    setIsWaking(true);
    await wakeTab(wakeId);
    // If the user switched tabs during the (up to 15s) wake, leave the new
    // tab's UI alone — the fetch effect already reset the flags.
    if (currentTabIdRef.current !== wakeId) return;
    setIsWaking(false);
    setIsSleeping(false);
    setFetchAttempt(a => a + 1); // Retry the capture
  };

  if (!tab) {
    return (
      <div className="w-full h-full border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center">
        <Globe size={48} className="mb-4 opacity-20" />
        <p className="text-sm">Select a tab to view its content</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
      {/* Header Panel */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2 shrink-0">
        {/* Window context: the panel always shows which window the previewed
            tab belongs to, in both tab and window modes. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 text-xs">
            <span className="shrink-0 text-slate-500 dark:text-slate-400">Current Window:</span>
            <span className="min-w-0 truncate px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 font-semibold" title={windowName}>
              {windowName}
            </span>
            <span className="shrink-0 text-slate-400 dark:text-slate-500">({windowTabs.length} tabs)</span>
          </div>
          <button
            onClick={onClosePanel}
            className="p-1.5 shrink-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded transition-colors"
            title="Hide preview panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigator: step through the window's tabs with the arrows, or
            jump directly via the dropdown list. */}
        {windowTabs.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => stepTab(-1)}
              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
              title="Previous tab in this window"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => stepTab(1)}
              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
              title="Next tab in this window"
            >
              <ChevronRight size={16} />
            </button>
            <div className="relative flex-1 min-w-0" ref={tabMenuRef}>
              <button
                onClick={() => setShowTabMenu(!showTabMenu)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                title="Choose a tab from this window"
              >
                <span className="truncate">Tab {tabIndex + 1} of {windowTabs.length}</span>
                <ChevronDown size={12} className={`shrink-0 transition-transform ${showTabMenu ? 'rotate-180' : ''}`} />
              </button>
              {showTabMenu && (
                <div className="absolute right-0 top-full mt-1 w-full min-w-[260px] max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {windowTabs.map((t, i) => {
                    const isCurrent = t.id === tab.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { onSelectTab(t.id); setShowTabMenu(false); }}
                        title={t.title}
                        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs transition-colors ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="shrink-0 w-5 text-right text-slate-400 font-mono">{i + 1}</span>
                        <Favicon src={t.favIconUrl} size={13} />
                        <span className="truncate flex-1">{t.title}</span>
                        {isCurrent && <Check size={12} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Previewed tab */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0 flex-1">
             <Favicon src={tab.favIconUrl} size={16} />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={tab.title}>
              {tab.title}
            </h3>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setFetchAttempt(a => a + 1)}
              disabled={isLoading}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition-colors disabled:opacity-40"
              title="Re-capture the preview (e.g. after the page changed)"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => onActivate(tab)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition-colors"
              title="Switch to actual tab"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>

        {/* Full URL, browser-address-bar style, with copy */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <Globe size={12} className="shrink-0 text-slate-400" />
          <span className="truncate flex-1 font-mono text-[11px]" title={tab.url}>{tab.url}</span>
          <button
            onClick={handleCopyUrl}
            className="p-0.5 shrink-0 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            title="Copy URL"
          >
            {urlCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-white w-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <span className="text-sm text-slate-500 font-medium">Loading content...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="bg-slate-200 p-4 rounded-full mb-4">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-slate-700 font-semibold mb-2">Preview Unavailable</h4>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              {isSleeping
                ? 'This tab is asleep (discarded to save memory). Wake it up to capture a preview.'
                : "We couldn't capture the content of this tab. It might be discarded to save memory, or it might be a restricted system page."}
            </p>
            {isSleeping && (
              <button
                onClick={handleWake}
                disabled={isWaking}
                className="mt-6 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm flex items-center gap-2"
              >
                {isWaking
                  ? <><Loader2 size={14} className="animate-spin" /> Waking tab...</>
                  : <><RefreshCw size={14} /> Wake up &amp; preview</>}
              </button>
            )}
             <button
              onClick={() => onActivate(tab)}
              className="mt-3 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Go to Tab
            </button>
          </div>
        )}

        {!isLoading && !error && (
           <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-none"
            title="Tab Preview"
            // Sandbox prevents scripts from running (no alerts, no nav) but allows same-origin to load data URIs or base-href assets if possible.
            // Note: Some complex sites might look broken without JS.
            sandbox="allow-same-origin"
           />
        )}
      </div>
    </div>
  );
};
