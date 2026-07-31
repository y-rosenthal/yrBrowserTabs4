
import { StorageData } from '../types';

declare const chrome: any;

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export const DEFAULT_CARD_METADATA: StorageData['cardMetadata'] = [
  { field: 'icon', visible: true },
  { field: 'lastAccessed', visible: true },
  { field: 'title', visible: true },
  { field: 'domain', visible: true },
  { field: 'window', visible: true }
];

const MOCK_STORAGE: StorageData = {
  customWindowNames: {},
  hasSeenOnboarding: false,
  theme: 'light', // Default to light mode
  apiKey: '',
  tabViewMode: 'detail',
  cardGrouping: 'tab',
  cardWidth: 240,
  cardMetadata: DEFAULT_CARD_METADATA,
  openMaximized: true
};

// In-memory fallback for demo mode
let memStorage = { ...MOCK_STORAGE };

export const getStorageData = async (): Promise<StorageData> => {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customWindowNames', 'hasSeenOnboarding', 'theme', 'apiKey', 'tabViewMode', 'cardGrouping', 'cardWidth', 'cardMetadata', 'openMaximized'], (result: any) => {
        resolve({
          customWindowNames: result.customWindowNames || {},
          hasSeenOnboarding: result.hasSeenOnboarding || false,
          theme: result.theme || 'light',
          apiKey: result.apiKey || '',
          tabViewMode: result.tabViewMode || 'detail',
          cardGrouping: result.cardGrouping || 'tab',
          cardWidth: result.cardWidth || 240,
          cardMetadata: result.cardMetadata || DEFAULT_CARD_METADATA,
          openMaximized: result.openMaximized !== undefined ? result.openMaximized : true
        });
      });
    });
  }
  return Promise.resolve(memStorage);
};

export const saveCustomWindowName = async (windowId: string, name: string): Promise<void> => {
  if (isExtension) {
    const data = await getStorageData();
    const updatedNames = { ...data.customWindowNames, [windowId]: name };
    await chrome.storage.local.set({ customWindowNames: updatedNames });
  } else {
    memStorage.customWindowNames[windowId] = name;
  }
};

export const setOnboardingSeen = async (): Promise<void> => {
  if (isExtension) {
    await chrome.storage.local.set({ hasSeenOnboarding: true });
  } else {
    memStorage.hasSeenOnboarding = true;
  }
};

export const saveTheme = async (theme: 'light' | 'dark'): Promise<void> => {
  if (isExtension) {
    await chrome.storage.local.set({ theme });
  } else {
    memStorage.theme = theme;
  }
};

export const saveApiKey = async (apiKey: string): Promise<void> => {
  if (isExtension) {
    await chrome.storage.local.set({ apiKey });
  } else {
    memStorage.apiKey = apiKey;
  }
};

// Persists any subset of the view/launch preferences.
export const saveViewSettings = async (
  patch: Partial<Pick<StorageData, 'tabViewMode' | 'cardGrouping' | 'cardWidth' | 'cardMetadata' | 'openMaximized'>>
): Promise<void> => {
  if (isExtension) {
    await chrome.storage.local.set(patch);
  } else {
    memStorage = { ...memStorage, ...patch };
  }
};
