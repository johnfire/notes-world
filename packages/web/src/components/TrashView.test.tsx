import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TrashView } from './TrashView';

const mockTrash = vi.fn();
const mockRestore = vi.fn();
const mockPurge = vi.fn();

vi.mock('../api', () => ({
  items: {
    trash:   (...args: unknown[]) => mockTrash(...args),
    restore: (...args: unknown[]) => mockRestore(...args),
    purge:   (...args: unknown[]) => mockPurge(...args),
  },
}));

function makeItem(id: string, title: string, archived_at?: string) {
  return {
    id, user_id: 'u1', title, item_type: 'Untyped',
    status: 'Archived', created_at: '', updated_at: '',
    archived_at: archived_at ?? new Date().toISOString(),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('TrashView', () => {
  test('renders loading then items', async () => {
    mockTrash.mockResolvedValue([makeItem('1', 'Deleted note')]);

    render(<TrashView />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Deleted note')).toBeInTheDocument());
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  test('shows empty state when no trash', async () => {
    mockTrash.mockResolvedValue([]);

    render(<TrashView />);

    await waitFor(() => expect(screen.getByText('Trash is empty')).toBeInTheDocument());
  });

  test('restore removes item from list', async () => {
    mockTrash.mockResolvedValue([makeItem('1', 'Item A'), makeItem('2', 'Item B')]);
    mockRestore.mockResolvedValue({});

    render(<TrashView />);

    await waitFor(() => expect(screen.getByText('Item A')).toBeInTheDocument());

    const restoreButtons = screen.getAllByTitle('Restore item');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => expect(screen.queryByText('Item A')).not.toBeInTheDocument());
    expect(mockRestore).toHaveBeenCalledWith('1');
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  test('purge removes item from list', async () => {
    mockTrash.mockResolvedValue([makeItem('1', 'Item A')]);
    mockPurge.mockResolvedValue(undefined);

    render(<TrashView />);

    await waitFor(() => expect(screen.getByText('Item A')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Delete permanently'));

    await waitFor(() => expect(screen.queryByText('Item A')).not.toBeInTheDocument());
    expect(mockPurge).toHaveBeenCalledWith('1');
  });

  test('shows days until deletion', async () => {
    // Archived 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    mockTrash.mockResolvedValue([makeItem('1', 'Old item', tenDaysAgo)]);

    render(<TrashView />);

    await waitFor(() => expect(screen.getByText('20 days until permanent deletion')).toBeInTheDocument());
  });
});
