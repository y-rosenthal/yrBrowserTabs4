
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
              lastAccessed: t.lastAccessed || 0
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

export const moveTabs = async (tabIds: string[], targetWindowId: string): Promise<void> => {
  if (isExtension) {
    const ids = tabIds.map(id => parseInt(id));
    const winId = parseInt(targetWindowId);
    await chrome.tabs.move(ids, { windowId: winId, index: -1 });
    await chrome.windows.update(winId, { focused: true });
  } else {
    console.log(`[Mock] Moving tabs ${tabIds.join(', ')} to window ${targetWindowId}`);
  }
};

export const createWindowWithTabs = async (tabIds: string[]): Promise<void> => {
  if (isExtension) {
    // Chrome requires creating a window with the first tab, then moving the rest
    const ids = tabIds.map(id => parseInt(id));
    if (ids.length === 0) return;

    // Create window with the first tab
    const firstTabId = ids[0];
    // Note: We don't remove the tab from the old window explicitly, 
    // passing 'tabId' to windows.create moves it.
    const newWindow = await chrome.windows.create({ tabId: firstTabId, focused: true });
    
    // Move the rest
    if (ids.length > 1 && newWindow.id) {
      const remainingTabs = ids.slice(1);
      await chrome.tabs.move(remainingTabs, { windowId: newWindow.id, index: -1 });
    }
  } else {
    console.log(`[Mock] Creating new window with tabs ${tabIds.join(', ')}`);
  }
};

export const focusOrOpenExtensionTab = async () => {
  if (isExtension) {
    const extensionUrl = chrome.runtime.getURL('app.html');
    
    // Get current window first to ensure we stay in context of where the user is looking.
    // In a popup, chrome.windows.getCurrent returns the browser window the popup is attached to.
    let currentWindowId: number | undefined;
    try {
      const currentWin = await chrome.windows.getCurrent();
      currentWindowId = currentWin.id;
    } catch (e) {
      console.warn("Could not get current window", e);
    }
    
    if (currentWindowId) {
      // Check if tab exists in THIS window
      const tabs = await chrome.tabs.query({ url: extensionUrl, windowId: currentWindowId });
      
      if (tabs.length > 0) {
        const existingTab = tabs[0];
        // Focus window just in case (though we are likely in it)
        await chrome.windows.update(currentWindowId, { focused: true });
        await chrome.tabs.update(existingTab.id, { active: true });
      } else {
        // Create in current window
        await chrome.tabs.create({ url: extensionUrl, windowId: currentWindowId });
      }
    } else {
      // Fallback if window ID extraction failed: just create
       await chrome.tabs.create({ url: extensionUrl });
    }
  } else {
    window.open(window.location.href, '_blank');
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
          return document.documentElement.outerHTML;
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
