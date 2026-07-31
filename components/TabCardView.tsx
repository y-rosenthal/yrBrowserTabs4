
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tab, WindowData, CardMetadataSetting } from '../types';
import { X, ExternalLink, Moon, AppWindow } from 'lucide-react';
import { Favicon } from './Favicon';
import { getTabThumbnail } from '../services/tabService';
import { compareWindowNames } from '../services/sortUtils';

// Thumbnails render the captured page at a fixed virtual width and scale it
// down, so the miniature looks like the real page rather than a reflowed
// mobile layout.
const THUMB_VIRTUAL_WIDTH = 1000;
const GRID_GAP = 16;

const formatLastAccessed = (ts: number): string => {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getDomain = (url: string): string => {
  try { return new URL(url).hostname; } catch { return 'Local'; }
};

// Lazy page-content thumbnail: captures only while the card is (near) the
// viewport and drops the iframe again when it scrolls away, so a grid of
// ~170 cards keeps a bounded number of live iframes.
const TabThumbnail: React.FC<{ tab: Tab; width: number; height: number }> = ({ tab, width, height }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((en) => setVisible(en.isIntersecting)),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    if (!visible) {
      setHtml(null); // off-screen eviction
      return;
    }
    getTabThumbnail(tab).then((h) => { if (alive) setHtml(h); });
    return () => { alive = false; };
  }, [visible, tab.id, tab.url, tab.discarded]); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = width / THUMB_VIRTUAL_WIDTH;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-white dark:bg-slate-800">
      {html ? (
        <iframe
          srcDoc={html}
          sandbox="allow-same-origin"
          title="Tab thumbnail"
          tabIndex={-1}
          style={{
            width: THUMB_VIRTUAL_WIDTH,
            height: height / scale,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
            pointerEvents: 'none'
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800">
          <Favicon src={tab.favIconUrl} size={32} />
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[90%] px-2">
            {getDomain(tab.url)}
          </span>
          {tab.discarded && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Moon size={12} /> Asleep
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface TabCardViewProps {
  grouping: 'tab' | 'window';
  tabs: Tab[]; // pre-sorted; used when grouping === 'tab'
  windows: WindowData[]; // used when grouping === 'window'
  windowNames: Record<string, string>;
  cardWidth: number;
  metadata: CardMetadataSetting[];
  selectedTabId: string | null;
  checkedTabIds: string[];
  selectedWindowIds: string[];
  focusedArea: 'sidebar' | 'tabs';
  onSelect: (tabId: string) => void;
  onActivate: (tab: Tab) => void;
  onClose: (tabId: string) => void;
  onToggleTabCheck: (tabId: string) => void;
  onToggleWindowSelection: (windowId: string) => void;
  onTabContextMenu: (e: React.MouseEvent, tab: Tab) => void;
  onWindowContextMenu: (e: React.MouseEvent, windowId: string) => void;
  onDrillIntoWindow: (windowId: string) => void;
  onFocusWindow: (windowId: string) => void;
  onColumnsChange?: (columns: number) => void;
}

export const TabCardView: React.FC<TabCardViewProps> = ({
  grouping,
  tabs,
  windows,
  windowNames,
  cardWidth,
  metadata,
  selectedTabId,
  checkedTabIds,
  selectedWindowIds,
  focusedArea,
  onSelect,
  onActivate,
  onClose,
  onToggleTabCheck,
  onToggleWindowSelection,
  onTabContextMenu,
  onWindowContextMenu,
  onDrillIntoWindow,
  onFocusWindow,
  onColumnsChange
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const thumbHeight = Math.round(cardWidth * 0.7);

  // Keep the relative "last accessed" labels ticking.
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Report the current column count so App can do 2-D arrow navigation.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || !onColumnsChange) return;
    const report = () => {
      const w = el.clientWidth;
      onColumnsChange(Math.max(1, Math.floor((w + GRID_GAP) / (cardWidth + GRID_GAP))));
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardWidth, onColumnsChange]);

  // Scroll the keyboard-selected card into view.
  useEffect(() => {
    if (focusedArea === 'tabs' && selectedTabId && cardRefs.current[selectedTabId]) {
      cardRefs.current[selectedTabId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedTabId, focusedArea]);

  const sortedWindows = useMemo(
    () => [...windows].sort((a, b) =>
      compareWindowNames(windowNames[a.id] || a.name, windowNames[b.id] || b.name)
    ),
    [windows, windowNames]
  );

  const renderMetadataRow = (field: CardMetadataSetting['field'], tab: Tab) => {
    switch (field) {
      case 'icon':
        return <div className="flex items-center"><Favicon src={tab.favIconUrl} size={14} /></div>;
      case 'lastAccessed':
        return <div className="text-slate-500 dark:text-slate-400">{formatLastAccessed(tab.lastAccessed)}</div>;
      case 'title':
        return <div className="font-medium text-slate-800 dark:text-slate-100 truncate" title={tab.title}>{tab.title}</div>;
      case 'domain':
        return <div className="text-slate-500 dark:text-slate-400 truncate">{getDomain(tab.url)}</div>;
      case 'window':
        return <div className="text-slate-500 dark:text-slate-400 truncate">{windowNames[tab.windowId] || 'Unknown'}</div>;
    }
  };

  const cardClass = (isSelected: boolean) =>
    `group relative rounded-lg overflow-hidden border shadow-sm cursor-pointer transition-all ${
      isSelected
        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
    }`;

  const visibleMetadata = metadata.filter((m) => m.visible);

  return (
    <div
      ref={gridRef}
      className="grid pb-6"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`, gap: GRID_GAP }}
    >
      {grouping === 'tab'
        ? tabs.map((tab) => {
            const isSelected = selectedTabId === tab.id;
            const isChecked = checkedTabIds.includes(tab.id);
            return (
              <div
                key={tab.id}
                ref={(el) => { cardRefs.current[tab.id] = el; }}
                className={cardClass(isSelected)}
                onClick={() => onSelect(tab.id)}
                onDoubleClick={() => onActivate(tab)}
                onContextMenu={(e) => onTabContextMenu(e, tab)}
              >
                <div className="relative" style={{ height: thumbHeight }}>
                  <TabThumbnail tab={tab} width={cardWidth} height={thumbHeight} />

                  {/* Top-corner controls */}
                  <div
                    className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${isChecked || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleTabCheck(tab.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white/90 dark:bg-slate-900/90 border cursor-pointer shadow"
                    />
                  </div>
                  <div
                    className={`absolute top-1.5 right-1.5 z-10 flex gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onActivate(tab); }}
                      className="p-1 bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 rounded shadow transition-colors"
                      title="Switch to Tab"
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                      className="p-1 bg-white/90 dark:bg-slate-900/90 hover:bg-red-100 dark:hover:bg-red-500/30 text-slate-500 hover:text-red-600 dark:hover:text-red-300 rounded shadow transition-colors"
                      title="Close Tab"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Metadata overlay: hovers above the page view; scrolls
                      itself when the fields don't fit, so the wheel scrolls
                      whatever is under the pointer (overlay vs. page grid). */}
                  {visibleMetadata.length > 0 && (
                    <div className="absolute bottom-0 inset-x-0 max-h-[60%] overflow-y-auto bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60 px-2 py-1.5 text-xs space-y-0.5 z-[5]">
                      {visibleMetadata.map((m) => (
                        <React.Fragment key={m.field}>{renderMetadataRow(m.field, tab)}</React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        : sortedWindows.map((win) => {
            const activeTab = win.tabs.find((t) => t.active) || win.tabs[0];
            const isChecked = selectedWindowIds.includes(win.id);
            const isSelected = !!activeTab && selectedTabId === activeTab.id;
            const displayName = windowNames[win.id] || win.name;
            const lastAccessed = win.tabs.reduce((acc, t) => Math.max(acc, t.lastAccessed || 0), 0);
            return (
              <div
                key={win.id}
                ref={(el) => { if (activeTab) cardRefs.current[activeTab.id] = el; }}
                className={cardClass(isSelected)}
                onClick={() => activeTab && onSelect(activeTab.id)}
                onDoubleClick={() => onDrillIntoWindow(win.id)}
                onContextMenu={(e) => onWindowContextMenu(e, win.id)}
                title="Double-click to view this window's tabs"
              >
                <div className="relative" style={{ height: thumbHeight }}>
                  {activeTab ? (
                    <TabThumbnail tab={activeTab} width={cardWidth} height={thumbHeight} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <AppWindow size={32} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  )}

                  <div
                    className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleWindowSelection(win.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white/90 dark:bg-slate-900/90 border cursor-pointer shadow"
                      title="Select window (merge / batch rename)"
                    />
                  </div>
                  <div
                    className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onFocusWindow(win.id); }}
                      className="p-1 bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 rounded shadow transition-colors"
                      title="Focus window in Chrome"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 max-h-[60%] overflow-y-auto bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60 px-2 py-1.5 text-xs space-y-0.5 z-[5]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={displayName}>
                        {displayName}
                      </span>
                      <span className="shrink-0 text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">
                        {win.tabs.length}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">{formatLastAccessed(lastAccessed)}</div>
                  </div>
                </div>
              </div>
            );
          })}
    </div>
  );
};
