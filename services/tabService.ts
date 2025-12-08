import { WindowData, Tab } from '../types';
import { MOCK_WINDOWS } from '../constants';

// Declare chrome to resolve TypeScript errors in non-extension environments or missing types
declare const chrome: any;

// Detect if we are running in a Chrome Extension environment
const isExtension = typeof chrome !== 'undefined' && !!chrome.windows && !!chrome.tabs;

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
          tabs: (w.tabs || []).map((t: any) => ({
            id: t.id?.toString() || '',
            title: t.title || 'Untitled',
            url: t.url || '',
            favIconUrl: t.favIconUrl,
            active: t.active,
            windowId: t.windowId.toString(),
            // Use t.lastAccessed if available (Chrome 121+), otherwise fallback to Date.now()
            lastAccessed: t.lastAccessed || Date.now() 
          }))
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
    const extensionUrl = chrome.runtime.getURL('index.html');
    
    // Find existing tab
    const tabs = await chrome.tabs.query({ url: extensionUrl });
    
    if (tabs.length > 0) {
      // Focus the first found existing tab
      const existingTab = tabs[0];
      await chrome.windows.update(existingTab.windowId, { focused: true });
      await chrome.tabs.update(existingTab.id, { active: true });
      // Close the current popup if relevant (though window focus usually handles UX)
    } else {
      // Create new
      await chrome.tabs.create({ url: extensionUrl });
    }
  } else {
    window.open(window.location.href, '_blank');
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
    chrome.windows.onCreated,
    chrome.windows.onRemoved
  ];

  events.forEach(event => event.addListener(debouncedCallback));

  return () => {
    events.forEach(event => event.removeListener(debouncedCallback));
  };
};