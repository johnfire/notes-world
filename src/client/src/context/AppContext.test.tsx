import { render, screen, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AppProvider, useApp } from './AppContext';
import * as api from '../api';

vi.mock('../api', () => ({
  dashboard: { get: vi.fn() },
  items:     { recent: vi.fn(), search: vi.fn(), capture: vi.fn() },
  tags:      { getUsageCounts: vi.fn() },
}));

const mockApi = api as {
  dashboard: { get: ReturnType<typeof vi.fn> };
  items:     { recent: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn>; capture: ReturnType<typeof vi.fn> };
  tags:      { getUsageCounts: ReturnType<typeof vi.fn> };
};

function StateInspector() {
  const { state } = useApp();
  return (
    <div>
      <div data-testid="loading">{String(state.loading)}</div>
      <div data-testid="error">{state.error ?? ''}</div>
      <div data-testid="item-count">{state.recentItems.length}</div>
      <div data-testid="search-query">{state.searchQuery}</div>
      <div data-testid="search-results">{state.searchResults === null ? 'null' : state.searchResults.length}</div>
    </div>
  );
}

function makeItem(title = 'item', id = 'id-1') {
  return { id, user_id: 'u1', title, item_type: 'Untyped', status: 'Active', created_at: '', updated_at: '' } as Parameters<typeof useApp>[0] extends never ? never : import('../types').Item;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.dashboard.get.mockResolvedValue({ dashboard: { id: 'd1', user_id: 'u1', columns: 3, created_at: '', updated_at: '' }, blocks: [] });
  mockApi.items.recent.mockResolvedValue([]);
  mockApi.tags.getUsageCounts.mockResolvedValue([]);
});

describe('AppProvider state', () => {
  test('initial loading state is true', () => {
    render(<AppProvider><StateInspector /></AppProvider>);
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  test('initial search state is empty/null', () => {
    render(<AppProvider><StateInspector /></AppProvider>);
    expect(screen.getByTestId('search-query').textContent).toBe('');
    expect(screen.getByTestId('search-results').textContent).toBe('null');
  });
});

describe('captureItem', () => {
  function CaptureUI() {
    const { captureItem, state } = useApp();
    return (
      <div>
        <div data-testid="count">{state.recentItems.length}</div>
        <button onClick={() => captureItem('New thought')}>capture</button>
      </div>
    );
  }

  test('prepends new item to recentItems', async () => {
    mockApi.items.capture.mockResolvedValue(makeItem('New thought', 'new-id'));
    render(<AppProvider><CaptureUI /></AppProvider>);

    await act(async () => {
      screen.getByText('capture').click();
    });

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
  });
});

describe('search', () => {
  function SearchUI() {
    const { search, clearSearch, state } = useApp();
    return (
      <div>
        <div data-testid="query">{state.searchQuery}</div>
        <div data-testid="results">{state.searchResults === null ? 'null' : state.searchResults.length}</div>
        <button onClick={() => search('milk')}>search</button>
        <button onClick={clearSearch}>clear</button>
      </div>
    );
  }

  test('sets search query and results', async () => {
    mockApi.items.search.mockResolvedValue([makeItem('Buy milk')]);
    render(<AppProvider><SearchUI /></AppProvider>);

    await act(async () => { screen.getByText('search').click(); });
    await waitFor(() => expect(screen.getByTestId('query').textContent).toBe('milk'));

    expect(screen.getByTestId('results').textContent).toBe('1');
  });

  test('clearSearch resets to null', async () => {
    mockApi.items.search.mockResolvedValue([makeItem('Buy milk')]);
    render(<AppProvider><SearchUI /></AppProvider>);

    await act(async () => { screen.getByText('search').click(); });
    await waitFor(() => expect(screen.getByTestId('results').textContent).toBe('1'));

    await act(async () => { screen.getByText('clear').click(); });
    expect(screen.getByTestId('results').textContent).toBe('null');
    expect(screen.getByTestId('query').textContent).toBe('');
  });
});
