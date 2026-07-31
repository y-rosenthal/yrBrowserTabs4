
import { CardMetadataSetting, StorageData } from '../types';

declare const chrome: any;

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export const DEFAULT_CARD_METADATA: CardMetadataSetting[] = [
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

// customWindowNames is stored as one map, so every save is a
// read-modify-write. Concurrent saves (e.g. renaming several windows in one
// action) would each read the same old map and the last write would win,
// silently dropping the other renames — so all writes go through this queue,
// which chains them one after another.
let nameWriteQueue: Promise<void> = Promise.resolve();

const enqueueNameWrite = (names: Record<string, string>): Promise<void> => {
  nameWriteQueue = nameWriteQueue.then(async () => {
    const data = await getStorageData();
    const updatedNames = { ...data.customWindowNames, ...names };
    await chrome.storage.local.set({ customWindowNames: updatedNames });
  });
  return nameWriteQueue;
};

export const saveCustomWindowName = async (windowId: string, name: string): Promise<void> => {
  if (isExtension) {
    await enqueueNameWrite({ [windowId]: name });
  } else {
    memStorage.customWindowNames[windowId] = name;
  }
};

// Persists several window names in a single storage write.
export const saveCustomWindowNames = async (names: Record<string, string>): Promise<void> => {
  if (isExtension) {
    await enqueueNameWrite(names);
  } else {
    memStorage.customWindowNames = { ...memStorage.customWindowNames, ...names };
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
