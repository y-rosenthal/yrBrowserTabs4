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
