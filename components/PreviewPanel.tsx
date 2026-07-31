
import React, { useEffect, useRef, useState } from 'react';
import { Tab, WindowData } from '../types';
import { ExternalLink, X, Globe, Lock, Loader2, RefreshCw } from 'lucide-react';
import { getTabContent, isTabDiscarded, wakeTab } from '../services/tabService';
import { Favicon } from './Favicon';

interface PreviewPanelProps {
  tab: Tab | null;
  windows: WindowData[];
  windowNames: Record<string, string>;
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
  onClosePanel: () => void;
  // Bumped by App when a sleeping tab was auto-woken, so the capture retries.
  refreshSignal?: number;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  tab,
  windowNames,
  onActivate,
  onClosePanel,
  refreshSignal
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  // Wake completion must only touch the UI of the tab it started for.
  const currentTabIdRef = useRef<string | null>(null);

  const windowName = tab ? (windowNames[tab.windowId] || 'Unknown Window') : '';
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
          // We need to inject a <base> tag so relative links (CSS/Images) work correctly
          // We search for <head> to inject it, or prepend it if missing.
          const baseTag = `<base href="${tab.url}" target="_blank">`;
          const hasHead = content.toLowerCase().includes('<head');

          let processedHtml = content;
          if (hasHead) {
            processedHtml = content.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`);
          } else {
            processedHtml = `${baseTag}${content}`;
          }

          setHtmlContent(processedHtml);
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
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
             <Favicon src={tab.favIconUrl} size={16} />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={tab.title}>
              {tab.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
             <button
              onClick={() => onActivate(tab)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded transition-colors"
              title="Switch to actual tab"
            >
              <ExternalLink size={16} />
            </button>
            <button
              onClick={onClosePanel}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded transition-colors"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
           <span className="truncate max-w-[50%]" title={domain}>{domain}</span>
           <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
           <span className="truncate" title={windowName}>{windowName}</span>
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
