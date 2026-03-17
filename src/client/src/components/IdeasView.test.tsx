import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { IdeasView } from './IdeasView';
import { ItemType } from '../types';

const mockByType = vi.fn();
const mockUpdate = vi.fn();
const mockOpenItem = vi.fn();

vi.mock('../api', () => ({
  items: {
    byType: (...args: unknown[]) => mockByType(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  sortOrders: {
    get:  vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({ openItem: mockOpenItem }),
}));

function makeIdea(id: string, title: string, maturity = 'Seed') {
  return {
    id, user_id: 'u1', title, item_type: ItemType.Idea,
    status: 'Active', type_data: { maturity },
    created_at: '', updated_at: new Date().toISOString(),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('IdeasView', () => {
  test('renders four maturity columns', async () => {
    mockByType.mockResolvedValue([]);

    render(<IdeasView />);

    await waitFor(() => expect(mockByType).toHaveBeenCalledWith(ItemType.Idea, 200));

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Developing')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Parked')).toBeInTheDocument();
  });

  test('groups ideas into correct columns', async () => {
    mockByType.mockResolvedValue([
      makeIdea('1', 'Seed idea', 'Seed'),
      makeIdea('2', 'Dev idea', 'Developing'),
      makeIdea('3', 'Ready idea', 'Ready'),
    ]);

    render(<IdeasView />);

    await waitFor(() => expect(screen.getByText('Seed idea')).toBeInTheDocument());
    expect(screen.getByText('Dev idea')).toBeInTheDocument();
    expect(screen.getByText('Ready idea')).toBeInTheDocument();
  });

  test('shows column counts', async () => {
    mockByType.mockResolvedValue([
      makeIdea('1', 'A', 'Seed'),
      makeIdea('2', 'B', 'Seed'),
    ]);

    render(<IdeasView />);

    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('clicking idea title opens item', async () => {
    mockByType.mockResolvedValue([makeIdea('i1', 'Click me')]);

    render(<IdeasView />);

    await waitFor(() => expect(screen.getByText('Click me')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Click me'));

    expect(mockOpenItem).toHaveBeenCalledWith('i1');
  });

  test('shows empty state in columns', async () => {
    mockByType.mockResolvedValue([]);

    render(<IdeasView />);

    await waitFor(() => {
      const empties = screen.getAllByText('Drop ideas here');
      expect(empties.length).toBe(4);
    });
  });
});
