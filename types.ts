
export interface Tab {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  windowId: string;
  lastAccessed: number;
}

export interface WindowData {
  id: string;
  name: string;
  tabs: Tab[];
}

export interface TabGroup {
  categoryName: string;
  tabIds: string[];
}

export enum ViewMode {
  ALL = 'ALL',
  BY_WINDOW = 'BY_WINDOW',
  AI_GROUPED = 'AI_GROUPED'
}

export interface OnboardingStep {
  target: string; // Description of position or element
  title: string;
  content: string;
  position: 'center' | 'left' | 'top-left' | 'top-right';
}

export interface StorageData {
  customWindowNames: Record<string, string>; // Map windowId -> Custom Name
  hasSeenOnboarding: boolean;
  theme: 'light' | 'dark';
}
