
import { StorageData } from '../types';

declare const chrome: any;

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

const MOCK_STORAGE: StorageData = {
  customWindowNames: {},
  hasSeenOnboarding: false,
  theme: 'light', // Default to light mode
  apiKey: ''
};

// In-memory fallback for demo mode
let memStorage = { ...MOCK_STORAGE };

export const getStorageData = async (): Promise<StorageData> => {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customWindowNames', 'hasSeenOnboarding', 'theme', 'apiKey'], (result: any) => {
        resolve({
          customWindowNames: result.customWindowNames || {},
          hasSeenOnboarding: result.hasSeenOnboarding || false,
          theme: result.theme || 'light',
          apiKey: result.apiKey || ''
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
