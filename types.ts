
export interface Tab {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  windowId: string;
  lastAccessed: number;
  discarded?: boolean;
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
  // Value of the data-tour attribute on the element this step points at.
  // The tour card is positioned next to that element with an arrow and a
  // spotlight highlight. Steps without an anchor (or whose anchor is not
  // currently rendered) fall back to a centered card with no arrow.
  anchor?: string;
  title: string;
  content: string;
  isFirstRun?: boolean;
}

export type CardMetadataField = 'icon' | 'lastAccessed' | 'title' | 'domain' | 'window';

export interface CardMetadataSetting {
  field: CardMetadataField;
  visible: boolean;
}

export interface StorageData {
  customWindowNames: Record<string, string>; // Map windowId -> Custom Name
  hasSeenOnboarding: boolean;
  theme: 'light' | 'dark';
  apiKey?: string;
  tabViewMode?: 'detail' | 'card';
  cardGrouping?: 'tab' | 'window';
  cardWidth?: number;
  cardMetadata?: CardMetadataSetting[];
  // What the search box matches against: tab titles/URLs only, or also the
  // captured page text of open tabs.
  searchScope?: 'domain' | 'title' | 'content';
}

export interface WindowReorgSnapshot {
  timestamp: number;
  windows: {
    id: string;
    name: string;
    tabIds: string[];
  }[];
}
