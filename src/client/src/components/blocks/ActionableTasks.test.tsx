import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ActionableTasks } from './ActionableTasks';
import { ViewType, ItemType } from '../../types';

const mockByType = vi.fn();

vi.mock('../../api', () => ({
  items: { byType: (...args: unknown[]) => mockByType(...args) },
}));

const block = {
  id: 'b1', dashboard_id: 'd1', user_id: 'u1',
  view_type: ViewType.ActionableTasks, title: 'Tasks',
  row: 0, column: 0, created_at: '', updated_at: '',
};

function makeTask(task_status: string, priority = 'Normal', id = Math.random().toString()) {
  return {
    id, user_id: 'u1', title: `Task ${id}`, item_type: ItemType.Task,
    status: 'Active', type_data: { task_status, priority },
    created_at: '', updated_at: '',
  };
}

beforeEach(() => vi.clearAllMocks());

describe('ActionableTasks', () => {
  test('shows only Open and InProgress tasks', async () => {
    mockByType.mockResolvedValue([
      makeTask('Open',       'High',   'open-1'),
      makeTask('InProgress', 'Normal', 'prog-1'),
      makeTask('Done',       'Low',    'done-1'),
      makeTask('Blocked',    'Normal', 'blk-1'),
    ]);

    render(<ActionableTasks block={block} />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Task open-1')).toBeInTheDocument();
    expect(screen.getByText('Task prog-1')).toBeInTheDocument();
    expect(screen.queryByText('Task done-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Task blk-1')).not.toBeInTheDocument();
  });

  test('calls api with Task type', async () => {
    mockByType.mockResolvedValue([]);
    render(<ActionableTasks block={block} />);
    await waitFor(() => expect(mockByType).toHaveBeenCalledWith(ItemType.Task));
  });

  test('shows empty state message', async () => {
    mockByType.mockResolvedValue([]);
    render(<ActionableTasks block={block} />);
    await waitFor(() => expect(screen.getByText(/no actionable tasks/i)).toBeInTheDocument());
  });

  test('shows item count in header', async () => {
    mockByType.mockResolvedValue([makeTask('Open'), makeTask('InProgress')]);
    render(<ActionableTasks block={block} />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });
});
