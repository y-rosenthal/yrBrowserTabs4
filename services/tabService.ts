
import { WindowData, Tab } from '../types';
import { MOCK_WINDOWS } from '../constants';

// Declare chrome to resolve TypeScript errors in non-extension environments or missing types
declare const chrome: any;

// Detect if we are running in a Chrome Extension environment
const isExtension = typeof chrome !== 'undefined' && !!chrome.windows && !!chrome.tabs;

// Tabs mid-reload (and some discarded tabs) transiently report no favIconUrl.
// Remember the last icon seen per tab so the UI doesn't swap icon → fallback →
// icon while a tab cycles through loading states. Scoped to the page origin:
// after an in-tab navigation to a different site the cached icon is wrong and
// must not be served.
const lastKnownFavicons = new Map<string, { origin: string; icon: string }>();

const originOf = (url: string): string => {
  try { return new URL(url).origin; } catch { return url; }
};

export const getPlatformInfo = () => ({
  isExtension,
  mode: isExtension ? 'Live Extension' : 'Web Demo'
});

export const getWindows = async (): Promise<WindowData[]> => {
  if (isExtension) {
    // Real Chrome API Call
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      
      // Map Chrome structure to our App structure
      return windows.map((w: any) => {
        const title = w.focused ? 'Current Window' : `Window ${w.id}`;
        
        return {
          id: w.id?.toString() || 'unknown',
          name: title,
          tabs: (w.tabs || []).map((t: any) => {
            const tabId = t.id?.toString() || '';
            const origin = originOf(t.url || '');
            if (t.favIconUrl) {
              lastKnownFavicons.set(tabId, { origin, icon: t.favIconUrl });
            }
            const cached = lastKnownFavicons.get(tabId);
            return {
              id: tabId,
              title: t.title || 'Untitled',
              url: t.url || '',
              favIconUrl: t.favIconUrl || (cached?.origin === origin ? cached.icon : undefined),
              active: t.active,
              windowId: t.windowId.toString(),
              // Use t.lastAccessed if available (Chrome 121+). The fallback must be
              // stable across refreshes — a Date.now() fallback re-stamps these tabs
              // on every reload, churning the "Last Accessed" sort order.
              lastAccessed: t.lastAccessed || 0,
              discarded: !!t.discarded
            };
          })
        };
      });
    } catch (e) {
      console.error("Failed to fetch chrome windows", e);
      return [];
    }
  }
  
  // Fallback to Mock Data
  return new Promise(resolve => setTimeout(() => resolve(MOCK_WINDOWS), 300));
};

export const activateTab = async (tab: Tab): Promise<void> => {
  if (isExtension) {
    const tabId = parseInt(tab.id);
    const winId = parseInt(tab.windowId);
    
    // Focus the window first
    await chrome.windows.update(winId, { focused: true });
    // Then focus the tab
    await chrome.tabs.update(tabId, { active: true });
  } else {
    console.log(`[Mock] Activating tab: ${tab.title}`);
  }
};

export const closeTab = async (tabId: string): Promise<void> => {
  if (isExtension) {
    await chrome.tabs.remove(parseInt(tabId));
  } else {
    console.log(`[Mock] Closing tab ID: ${tabId}`);
  }
};

// Closes many tabs in one chrome call (used by "Close checked tabs").
export const closeTabs = async (tabIds: string[]): Promise<void> => {
  if (tabIds.length === 0) return;
  if (isExtension) {
    await chrome.tabs.remove(tabIds.map(id => parseInt(id)));
  } else {
    console.log(`[Mock] Closing tabs: ${tabIds.join(', ')}`);
  }
};

export const focusWindow = async (windowId: string): Promise<void> => {
  if (isExtension) {
    await chrome.windows.update(parseInt(windowId), { focused: true });
  } else {
    console.log(`[Mock] Focusing window ${windowId}`);
  }
};

export const closeWindow = async (windowId: string): Promise<void> => {
  if (isExtension) {
    await chrome.windows.remove(parseInt(windowId));
  } else {
    console.log(`[Mock] Closing window ${windowId}`);
  }
};

export const moveTabs = async (tabIds: string[], targetWindowId: string): Promise<void> => {
  if (isExtension) {
    const ids = tabIds.map(id => parseInt(id));
    const winId = parseInt(targetWindowId);
    // Deliberately no focus change: the TabMaster window stays active.
    await chrome.tabs.move(ids, { windowId: winId, index: -1 });
  } else {
    console.log(`[Mock] Moving tabs ${tabIds.join(', ')} to window ${targetWindowId}`);
  }
};

// Move a single tab to a specific position in a window (used by move-undo to
// put tabs back where they came from).
export const moveTabToIndex = async (tabId: string, targetWindowId: string, index: number): Promise<void> => {
  if (isExtension) {
    await chrome.tabs.move(parseInt(tabId), { windowId: parseInt(targetWindowId), index });
  } else {
    console.log(`[Mock] Moving tab ${tabId} to window ${targetWindowId} at ${index}`);
  }
};

export const createWindowWithTabs = async (tabIds: string[]): Promise<void> => {
  if (isExtension) {
    // Chrome requires creating a window with the first tab, then moving the rest
    const ids = tabIds.map(id => parseInt(id));
    if (ids.length === 0) return;

    // Remember the window TabMaster lives in so it can stay focused.
    const appWindow = await chrome.windows.getCurrent();

    // Create window with the first tab
    const firstTabId = ids[0];
    // Note: We don't remove the tab from the old window explicitly,
    // passing 'tabId' to windows.create moves it.
    const newWindow = await chrome.windows.create({ tabId: firstTabId, focused: false });

    // Move the rest
    if (ids.length > 1 && newWindow.id) {
      const remainingTabs = ids.slice(1);
      await chrome.tabs.move(remainingTabs, { windowId: newWindow.id, index: -1 });
    }

    // Some Chrome versions focus the new window despite focused:false —
    // explicitly hand focus back to TabMaster.
    if (appWindow?.id !== undefined) {
      await chrome.windows.update(appWindow.id, { focused: true });
    }
  } else {
    console.log(`[Mock] Creating new window with tabs ${tabIds.join(', ')}`);
  }
};

export const getTabContent = async (tabId: string): Promise<string> => {
  if (isExtension) {
    try {
      const id = parseInt(tabId);
      // We use executeScript to retrieve the serialized HTML of the page.
      // This requires the 'scripting' permission in manifest.json
      const results = await chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => {
          // outerHTML only serializes text that sits inside tags. CSS-in-JS
          // libraries (styled-components/emotion in production) leave their
          // <style> tags EMPTY and insert rules straight into the CSSOM, so
          // a plain outerHTML capture loses most of such a page's styling
          // (icons render huge, layout collapses). Serialize those CSSOM
          // rules — plus adopted stylesheets — into one extra <style> block.
          const MAX_CSSOM_CHARS = 600000; // keep pathological pages bounded
          let cssomCss = '';
          const grabSheet = (sheet: CSSStyleSheet, requireEmptyOwner: boolean) => {
            try {
              if (requireEmptyOwner) {
                const owner = sheet.ownerNode as HTMLElement | null;
                if (!owner || owner.tagName !== 'STYLE') return; // <link> sheets reload via <base href>
                if ((owner.textContent || '').trim()) return;    // already captured by outerHTML
              }
              for (const rule of Array.from(sheet.cssRules)) {
                if (cssomCss.length > MAX_CSSOM_CHARS) return;
                cssomCss += rule.cssText + '\n';
              }
            } catch { /* cross-origin sheet — not readable, skip */ }
          };
          for (const s of Array.from(document.styleSheets)) grabSheet(s, true);
          for (const s of Array.from(document.adoptedStyleSheets || [])) grabSheet(s, false);

          const html = document.documentElement.outerHTML;
          if (!cssomCss) return html;
          // "</style" inside a rule (e.g. in a content string) would end the
          // block early — escape it, then splice before </head> if present.
          const styleTag = '<style data-tabmaster-cssom>' + cssomCss.replace(/<\/style/gi, '<\\/style') + '</style>';
          const idx = html.search(/<\/head>/i);
          return idx >= 0 ? html.slice(0, idx) + styleTag + html.slice(idx) : styleTag + html;
        }
      });
      return results[0]?.result || '';
    } catch (e: any) {
      console.warn("Failed to get tab content", e);
      // Friendly error message for restricted pages (chrome://, web store, etc.)
      // Chrome phrases injection denials several ways: "cannot be scripted",
      // "Missing host permission", "Cannot access a chrome:// URL",
      // "Cannot access contents of url ...".
      const msg = e?.message || '';
      const isPrivileged = msg.includes('cannot be scripted') || msg.includes('Missing host permission') || msg.includes('Cannot access');

      if (isPrivileged) {
        return `
          <!DOCTYPE html>
          <html>
            <body style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #64748b; text-align: center; padding: 20px;">
              <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; color: #94a3b8;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <h3 style="margin: 0 0 8px 0; color: #334155;">Preview Unavailable</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.5;">Browser security policies prevent extensions from accessing the content of this page (e.g. Chrome Web Store or system pages).</p>
              </div>
            </body>
          </html>
        `;
      }
      return '';
    }
  } else {
    // Mock Content for Demo Mode
    return `
      <!DOCTYPE html>
      <html>
        <head>
           <style>body { font-family: system-ui, sans-serif; padding: 2rem; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }</style>
        </head>
        <body>
          <h1>Tab Content Preview</h1>
          <p>This is a simulated preview of the tab content.</p>
          <p>In the live extension, this would show the actual HTML source code of the target webpage, allowing you to read the page content without switching tabs.</p>
          <hr/>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </body>
      </html>
    `;
  }
};

// Makes relative links (CSS/images) resolve when captured HTML is rendered
// in an iframe. Shared by the Preview Panel and card thumbnails. The URL is
// attribute-escaped so a quote in it can't break out of the href.
export const injectBaseTag = (html: string, url: string): string => {
  const safeUrl = url.replace(/"/g, '&quot;');
  const baseTag = `<base href="${safeUrl}" target="_blank">`;
  return html.toLowerCase().includes('<head')
    ? html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`)
    : `${baseTag}${html}`;
};

// Card-view thumbnails: HTML captures cached per tab (keyed to the URL so a
// navigation invalidates the entry) and fetched through a small concurrency
// gate so scrolling a grid of ~170 cards can't fire ~170 simultaneous
// script injections.
const thumbnailCache = new Map<string, { url: string; html: string }>();
// Entries for closed tabs are never touched again; cap the cache and evict
// the oldest entries (Map preserves insertion order) so it can't grow
// without bound over a long session.
const MAX_THUMBNAIL_CACHE = 300;
const MAX_CONCURRENT_CAPTURES = 4;
let activeCaptures = 0;
const captureWaiters: Array<() => void> = [];

const acquireCaptureSlot = (): Promise<void> =>
  new Promise((resolve) => {
    if (activeCaptures < MAX_CONCURRENT_CAPTURES) {
      activeCaptures++;
      resolve();
    } else {
      captureWaiters.push(() => { activeCaptures++; resolve(); });
    }
  });

const releaseCaptureSlot = (): void => {
  activeCaptures--;
  const next = captureWaiters.shift();
  if (next) next();
};

export const getTabThumbnail = async (tab: Tab): Promise<string | null> => {
  const cached = thumbnailCache.get(tab.id);
  if (cached && cached.url === tab.url) return cached.html;
  if (tab.discarded) return null; // never wake a sleeping tab just to thumbnail it

  await acquireCaptureSlot();
  try {
    const raw = await getTabContent(tab.id);
    if (!raw) return null;
    const html = injectBaseTag(raw, tab.url);
    thumbnailCache.delete(tab.id); // re-insert so this entry counts as newest
    thumbnailCache.set(tab.id, { url: tab.url, html });
    while (thumbnailCache.size > MAX_THUMBNAIL_CACHE) {
      const oldest = thumbnailCache.keys().next().value;
      if (oldest === undefined) break;
      thumbnailCache.delete(oldest);
    }
    return html;
  } finally {
    releaseCaptureSlot();
  }
};

// --- Full-text search support ---
// Visible page text captured per tab (keyed to the URL so navigation
// invalidates the entry), fetched through the same concurrency gate as
// thumbnails so indexing a big session can't fire hundreds of injections.
// Sleeping (discarded) tabs are never woken for indexing; restricted pages
// (chrome://, Web Store) yield an empty string and are treated as "no text".
const pageTextCache = new Map<string, { url: string; text: string }>();
const MAX_PAGE_TEXT_CACHE = 500;

export const getTabPageText = async (tab: Tab): Promise<string> => {
  const cached = pageTextCache.get(tab.id);
  if (cached && cached.url === tab.url) return cached.text;
  if (tab.discarded) return '';

  let text = '';
  if (isExtension) {
    await acquireCaptureSlot();
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: parseInt(tab.id) },
        func: () => (document.body?.innerText || '').slice(0, 500000)
      });
      text = (results[0]?.result || '').toLowerCase();
    } catch {
      text = ''; // restricted page — searchable by title/URL only
    } finally {
      releaseCaptureSlot();
    }
  } else {
    text = `mock page text for ${tab.title}`.toLowerCase();
  }

  pageTextCache.delete(tab.id);
  pageTextCache.set(tab.id, { url: tab.url, text });
  while (pageTextCache.size > MAX_PAGE_TEXT_CACHE) {
    const oldest = pageTextCache.keys().next().value;
    if (oldest === undefined) break;
    pageTextCache.delete(oldest);
  }
  return text;
};

export const isTabDiscarded = async (tabId: string): Promise<boolean> => {
  if (!isExtension) return false;
  try {
    const tab = await chrome.tabs.get(parseInt(tabId));
    return !!tab.discarded;
  } catch {
    return false;
  }
};

// Reload a discarded (sleeping) tab in the background so its content can be
// captured, without stealing focus from the dashboard. Resolves once the tab
// finishes loading (or the timeout elapses).
export const wakeTab = async (tabId: string, timeoutMs = 15000): Promise<boolean> => {
  if (!isExtension) return true;
  const id = parseInt(tabId);
  try {
    await chrome.tabs.reload(id);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Timed out waiting for tab to load'));
      }, timeoutMs);
      const listener = (updatedId: number, info: { status?: string }) => {
        if (updatedId === id && info.status === 'complete') {
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    return true;
  } catch (e) {
    console.warn('Failed to wake tab', e);
    return false;
  }
};

export const subscribeToUpdates = (callback: () => void) => {
  if (!isExtension) return () => {};

  // Debounce the callback to avoid too many refreshes
  let timeout: any;
  const debouncedCallback = () => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, 200);
  };

  const events = [
    chrome.tabs.onCreated,
    chrome.tabs.onUpdated,
    chrome.tabs.onMoved,
    chrome.tabs.onRemoved,
    chrome.tabs.onAttached,
    chrome.tabs.onDetached,
    // Without these two, active-tab highlights and lastAccessed go stale
    // until some other event happens to fire.
    chrome.tabs.onActivated,
    chrome.windows.onFocusChanged,
    chrome.windows.onCreated,
    chrome.windows.onRemoved
  ];

  events.forEach(event => event.addListener(debouncedCallback));

  return () => {
    events.forEach(event => event.removeListener(debouncedCallback));
  };
};
