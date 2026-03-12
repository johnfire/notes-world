import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { OverdueTasks } from './OverdueTasks';
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
  view_type: ViewType.OverdueTasks, title: 'Overdue',
  row: 0, column: 0, created_at: '', updated_at: '',
};

function pastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function futureDate(daysAhead: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

function makeTask(task_status: string, due_date?: string, id = Math.random().toString()) {
  return {
    id, user_id: 'u1', title: `Task ${id}`, item_type: ItemType.Task,
    status: 'Active', type_data: { task_status, priority: 'Normal', due_date },
    created_at: '', updated_at: '',
  };
}

beforeEach(() => vi.clearAllMocks());

describe('OverdueTasks', () => {
  test('shows tasks with past due_date that are not Done', async () => {
    mockByType.mockResolvedValue([
      makeTask('Open', pastDate(3), 'overdue-1'),
      makeTask('Done', pastDate(1), 'done-old'), // Done — excluded
      makeTask('Open', futureDate(2), 'future-1'), // future — excluded
      makeTask('Open', undefined,    'no-date-1'), // no date — excluded
    ]);

    render(<OverdueTasks block={block} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Task overdue-1')).toBeInTheDocument();
    expect(screen.queryByText('Task done-old')).not.toBeInTheDocument();
    expect(screen.queryByText('Task future-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Task no-date-1')).not.toBeInTheDocument();
  });

  test('shows empty state when nothing overdue', async () => {
    mockByType.mockResolvedValue([makeTask('Open', futureDate(5))]);
    render(<OverdueTasks block={block} />);
    await waitFor(() => expect(screen.getByText(/no overdue tasks/i)).toBeInTheDocument());
  });

  test('shows count badge when overdue tasks exist', async () => {
    mockByType.mockResolvedValue([
      makeTask('Open', pastDate(1)),
      makeTask('InProgress', pastDate(2)),
    ]);
    render(<OverdueTasks block={block} />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });
});
