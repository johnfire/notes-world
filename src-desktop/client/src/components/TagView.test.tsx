import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TagView } from './TagView';
import { ItemType } from '../types';

const mockGetItemsForTag = vi.fn();
const mockGetCollapsed = vi.fn();
const mockArchive = vi.fn();
const mockCreateDivider = vi.fn();
const mockTagItem = vi.fn();
const mockOpenItem = vi.fn();
const mockRemoveUnsorted = vi.fn();

vi.mock('../api', () => ({
  tags: {
    getItemsForTag: (...args: unknown[]) => mockGetItemsForTag(...args),
    tagItem: (...args: unknown[]) => mockTagItem(...args),
  },
  items: {
    archive: (...args: unknown[]) => mockArchive(...args),
    createDivider: (...args: unknown[]) => mockCreateDivider(...args),
    update: vi.fn().mockResolvedValue({}),
  },
  collapsedDividers: {
    get: (...args: unknown[]) => mockGetCollapsed(...args),
    save: vi.fn().mockResolvedValue(undefined),
  },
  sortOrders: {
    get: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    openItem: mockOpenItem,
    removeUnsorted: mockRemoveUnsorted,
    state: { refreshKey: 0, unsortedItems: [] },
  }),
}));

const tag = { id: 't1', user_id: 'u1', name: 'recipes', tag_source: 'manual' as const, color: null, created_at: '', updated_at: '' };

function makeItem(id: string, title: string, type = ItemType.Untyped) {
  return {
    id, user_id: 'u1', title, item_type: type,
    status: 'Active', created_at: '', updated_at: '',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCollapsed.mockResolvedValue([]);
});

describe('TagView', () => {
  test('renders tag name and item count', async () => {
    mockGetItemsForTag.mockResolvedValue([
      makeItem('1', 'Pancakes'),
      makeItem('2', 'Waffles'),
    ]);

    render(<TagView tag={tag} />);

    await waitFor(() => expect(screen.getByText('2 items')).toBeInTheDocument());
    expect(screen.getByText('recipes')).toBeInTheDocument();
  });

  test('shows loading then items', async () => {
    mockGetItemsForTag.mockResolvedValue([makeItem('1', 'Pancakes')]);

    render(<TagView tag={tag} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Pancakes')).toBeInTheDocument());
  });

  test('shows empty state when no items', async () => {
    mockGetItemsForTag.mockResolvedValue([]);

    render(<TagView tag={tag} />);

    await waitFor(() => expect(screen.getByText('No items with this tag')).toBeInTheDocument());
  });

  test('clicking item opens it', async () => {
    mockGetItemsForTag.mockResolvedValue([makeItem('i1', 'Click me')]);

    render(<TagView tag={tag} />);

    await waitFor(() => expect(screen.getByText('Click me')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Click me'));

    expect(mockOpenItem).toHaveBeenCalledWith('i1');
  });

  test('dividers do not count toward item count', async () => {
    mockGetItemsForTag.mockResolvedValue([
      makeItem('1', 'Item', ItemType.Untyped),
      makeItem('2', 'Section', ItemType.Divider),
    ]);

    render(<TagView tag={tag} />);

    await waitFor(() => expect(screen.getByText('1 items')).toBeInTheDocument());
  });

  test('fetches items with limit 500', async () => {
    mockGetItemsForTag.mockResolvedValue([]);

    render(<TagView tag={tag} />);

    await waitFor(() => expect(mockGetItemsForTag).toHaveBeenCalledWith('t1', 500));
  });
});
