import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TasksView } from './TasksView';
import { ItemType } from '../types';

const mockByType = vi.fn();
const mockUpdate = vi.fn();
const mockOpenItem = vi.fn();

vi.mock('../api', () => ({
  items: {
    byType: (...args: unknown[]) => mockByType(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({ openItem: mockOpenItem }),
}));

function makeTask(id: string, title: string, status = 'Open', priority = 'Normal') {
  return {
    id, user_id: 'u1', title, item_type: ItemType.Task,
    status: 'Active', type_data: { task_status: status, priority },
    created_at: '', updated_at: new Date().toISOString(),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('TasksView', () => {
  test('renders four status columns', async () => {
    mockByType.mockResolvedValue([]);

    render(<TasksView />);

    await waitFor(() => expect(mockByType).toHaveBeenCalledWith(ItemType.Task, 200));

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  test('groups tasks into correct columns', async () => {
    mockByType.mockResolvedValue([
      makeTask('1', 'Open task', 'Open'),
      makeTask('2', 'WIP task', 'InProgress'),
      makeTask('3', 'Blocked task', 'Blocked'),
      makeTask('4', 'Done task', 'Done'),
    ]);

    render(<TasksView />);

    await waitFor(() => expect(screen.getByText('Open task')).toBeInTheDocument());
    expect(screen.getByText('WIP task')).toBeInTheDocument();
    expect(screen.getByText('Blocked task')).toBeInTheDocument();
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  test('shows column counts', async () => {
    mockByType.mockResolvedValue([
      makeTask('1', 'A', 'Open'),
      makeTask('2', 'B', 'Open'),
      makeTask('3', 'C', 'Done'),
    ]);

    render(<TasksView />);

    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

    // 2 open, 1 done
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('shows high priority badge', async () => {
    mockByType.mockResolvedValue([
      makeTask('1', 'Urgent', 'Open', 'High'),
    ]);

    render(<TasksView />);

    await waitFor(() => expect(screen.getByText('High')).toBeInTheDocument());
  });

  test('clicking task title opens item', async () => {
    mockByType.mockResolvedValue([makeTask('t1', 'Click me')]);

    render(<TasksView />);

    await waitFor(() => expect(screen.getByText('Click me')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Click me'));

    expect(mockOpenItem).toHaveBeenCalledWith('t1');
  });
});
