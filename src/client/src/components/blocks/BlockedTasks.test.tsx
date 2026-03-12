import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BlockedTasks } from './BlockedTasks';
import { ViewType, ItemType } from '../../types';

const mockByType = vi.fn();

vi.mock('../../api', () => ({
  items: { byType: (...args: unknown[]) => mockByType(...args) },
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ openItem: vi.fn() }),
}));

const block = {
  id: 'b1', dashboard_id: 'd1', user_id: 'u1',
  view_type: ViewType.BlockedTasks, title: 'Blocked',
  row: 0, column: 0, created_at: '', updated_at: '',
};

function makeTask(task_status: string, id = Math.random().toString()) {
  return {
    id, user_id: 'u1', title: `Task ${id}`, item_type: ItemType.Task,
    status: 'Active', type_data: { task_status, priority: 'Normal' },
    created_at: '', updated_at: '',
  };
}

beforeEach(() => vi.clearAllMocks());

describe('BlockedTasks', () => {
  test('shows only Blocked tasks', async () => {
    mockByType.mockResolvedValue([
      makeTask('Blocked', 'blk-1'),
      makeTask('Open',    'open-1'),
      makeTask('Done',    'done-1'),
    ]);

    render(<BlockedTasks block={block} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Task blk-1')).toBeInTheDocument();
    expect(screen.queryByText('Task open-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Task done-1')).not.toBeInTheDocument();
  });

  test('shows empty state when no blocked tasks', async () => {
    mockByType.mockResolvedValue([makeTask('Open')]);
    render(<BlockedTasks block={block} />);
    await waitFor(() => expect(screen.getByText(/no blocked tasks/i)).toBeInTheDocument());
  });

  test('shows count badge when tasks exist', async () => {
    mockByType.mockResolvedValue([makeTask('Blocked'), makeTask('Blocked')]);
    render(<BlockedTasks block={block} />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });
});
