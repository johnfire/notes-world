import { createContext, useContext } from "react";
import { Item, Tag, Dashboard, Block } from "../types";

export interface AppState {
  dashboard: Dashboard | null;
  blocks: Block[];
  recentItems: Item[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  searchResults: Item[] | null;
  searchQuery: string;
  selectedItemId: string | null;
  refreshKey: number;
  unsortedItems: Item[];
}

export interface AppContextValue {
  state: AppState;
  loadDashboard: () => Promise<void>;
  loadRecentItems: () => Promise<void>;
  loadTags: () => Promise<void>;
  captureItem: (title: string, body?: string) => Promise<Item>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  openItem: (id: string) => void;
  closeItem: () => void;
  updateItemInContext: (item: Item) => void;
  refresh: () => Promise<void>;
  addUnsorted: (item: Item) => void;
  removeUnsorted: (id: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
