
import React, { useEffect, useRef, useState } from 'react';
import { Tab, WindowData } from '../types';
import { ExternalLink, X, Globe, Lock, Loader2, RefreshCw } from 'lucide-react';
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

// How many sibling-tab pills show before collapsing behind "+N more".
const PILLS_COLLAPSED_LIMIT = 8;

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
  const [pillsExpanded, setPillsExpanded] = useState(false);
  // Wake completion must only touch the UI of the tab it started for.
  const currentTabIdRef = useRef<string | null>(null);

  const windowName = tab ? (windowNames[tab.windowId] || 'Unknown Window') : '';
  // All tabs in the selected tab's window, for the pill strip. The panel
  // always shows the same window context regardless of whether the main
  // area is in tab or window mode.
  const windowTabs = tab ? (windows.find(w => w.id === tab.windowId)?.tabs || []) : [];
  const domain = (() => {
    if (!tab?.url) return '';
    try { return new URL(tab.url).hostname; } catch { return 'Local'; }
  })();

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

  // Collapse the pill strip when the previewed window changes.
  useEffect(() => { setPillsExpanded(false); }, [tab?.windowId]);

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
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider text-[10px]">
              Window
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={windowName}>{windowName}</span>
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

        {/* Pills: one per tab in the window. The previewed tab's pill shows
            its full title; the rest truncate (full title on hover). */}
        {windowTabs.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {(pillsExpanded ? windowTabs : windowTabs.slice(0, PILLS_COLLAPSED_LIMIT)).map((t) => {
              const isCurrent = t.id === tab.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTab(t.id)}
                  title={t.title}
                  className={`flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 border transition-colors text-left ${
                    isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300'
                  }`}
                >
                  <Favicon src={t.favIconUrl} size={12} />
                  <span className={isCurrent ? 'break-words' : 'truncate max-w-[130px]'}>{t.title}</span>
                </button>
              );
            })}
            {windowTabs.length > PILLS_COLLAPSED_LIMIT && (
              <button
                onClick={() => setPillsExpanded(!pillsExpanded)}
                className="rounded-full text-xs px-2.5 py-1 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-400 transition-colors"
              >
                {pillsExpanded ? 'Show less' : `+${windowTabs.length - PILLS_COLLAPSED_LIMIT} more`}
              </button>
            )}
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
          <button
            onClick={() => onActivate(tab)}
            className="p-1.5 shrink-0 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition-colors"
            title="Switch to actual tab"
          >
            <ExternalLink size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
           <span className="truncate" title={domain}>{domain}</span>
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
