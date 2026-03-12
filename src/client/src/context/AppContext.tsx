import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Item, Tag, Dashboard, Block, DashboardResponse } from '../types';
import * as api from '../api';

interface AppState {
  dashboard:     Dashboard | null;
  blocks:        Block[];
  recentItems:   Item[];
  tags:          Tag[];
  loading:       boolean;
  error:         string | null;
  searchResults: Item[] | null;
  searchQuery:   string;
}

type Action =
  | { type: 'SET_DASHBOARD'; payload: DashboardResponse }
  | { type: 'SET_RECENT_ITEMS'; payload: Item[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'UPDATE_ITEM'; payload: Item }
  | { type: 'SET_SEARCH'; query: string; results: Item[] }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DASHBOARD':
      return { ...state, dashboard: action.payload.dashboard, blocks: action.payload.blocks };
    case 'SET_RECENT_ITEMS':
      return { ...state, recentItems: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'ADD_ITEM':
      return { ...state, recentItems: [action.payload, ...state.recentItems].slice(0, 20) };
    case 'UPDATE_ITEM':
      return {
        ...state,
        recentItems: state.recentItems.map((i) => i.id === action.payload.id ? action.payload : i),
      };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query, searchResults: action.results };
    case 'CLEAR_SEARCH':
      return { ...state, searchQuery: '', searchResults: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const initialState: AppState = {
  dashboard:     null,
  blocks:        [],
  recentItems:   [],
  tags:          [],
  loading:       true,
  error:         null,
  searchResults: null,
  searchQuery:   '',
};

interface AppContextValue {
  state: AppState;
  loadDashboard: () => Promise<void>;
  loadRecentItems: () => Promise<void>;
  loadTags: () => Promise<void>;
  captureItem: (title: string, body?: string) => Promise<Item>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.dashboard.get();
      dispatch({ type: 'SET_DASHBOARD', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    }
  }, []);

  const loadRecentItems = useCallback(async () => {
    try {
      const data = await api.items.recent(20);
      dispatch({ type: 'SET_RECENT_ITEMS', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const data = await api.tags.getUsageCounts();
      dispatch({ type: 'SET_TAGS', payload: data });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: (err as Error).message });
    }
  }, []);

  const captureItem = useCallback(async (title: string, body?: string): Promise<Item> => {
    const item = await api.items.capture(title, body);
    dispatch({ type: 'ADD_ITEM', payload: item });
    return item;
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'CLEAR_SEARCH' });
      return;
    }
    const results = await api.items.search(query);
    dispatch({ type: 'SET_SEARCH', query, results });
  }, []);

  const clearSearch = useCallback(() => dispatch({ type: 'CLEAR_SEARCH' }), []);

  return (
    <AppContext.Provider value={{ state, loadDashboard, loadRecentItems, loadTags, captureItem, search, clearSearch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
