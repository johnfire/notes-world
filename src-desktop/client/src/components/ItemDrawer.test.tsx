import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ItemDrawer } from './ItemDrawer';
import { ItemType, ItemStatus, TaskStatus } from '../types';

const mockCloseItem = vi.fn();
const mockSaveTitle = vi.fn();
const mockSaveBody = vi.fn();
const mockHandleTaskAction = vi.fn();
const mockHandlePromote = vi.fn();
const mockHandleArchive = vi.fn();
const mockHandleRestore = vi.fn();

function makeDrawerState(overrides = {}) {
  return {
    selectedItemId: 'item-1',
    item: {
      id: 'item-1', user_id: 'u1', title: 'Test Item', body: 'Some notes',
      item_type: ItemType.Untyped, status: ItemStatus.Active,
      type_data: null, color: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    },
    loading: false,
    title: 'Test Item',
    setTitle: vi.fn(),
    body: 'Some notes',
    setBody: vi.fn(),
    saving: false,
    itemTags: [],
    tagSearch: '',
    setTagSearch: vi.fn(),
    tagPickerOpen: false,
    setTagPickerOpen: vi.fn(),
    promoteOpen: false,
    setPromoteOpen: vi.fn(),
    actioning: false,
    deps: [],
    dependents: [],
    depItems: {},
    depSearch: '',
    depSearchResults: [],
    allTags: [],
    closeItem: mockCloseItem,
    openItem: vi.fn(),
    saveTitle: mockSaveTitle,
    saveBody: mockSaveBody,
    handleAddTag: vi.fn(),
    handleCreateAndAddTag: vi.fn(),
    handleRemoveTag: vi.fn(),
    handlePromote: mockHandlePromote,
    handleArchive: mockHandleArchive,
    handleRestore: mockHandleRestore,
    handleTaskAction: mockHandleTaskAction,
    handleRemoveDep: vi.fn(),
    handleAddDep: vi.fn(),
    handleDepSearch: vi.fn(),
    ...overrides,
  };
}

let drawerState = makeDrawerState();

vi.mock('./drawer/useItemDrawer', () => ({
  useItemDrawer: () => drawerState,
}));

beforeEach(() => {
  vi.clearAllMocks();
  drawerState = makeDrawerState();
});

describe('ItemDrawer', () => {
  test('returns null when no selectedItemId', () => {
    drawerState = makeDrawerState({ selectedItemId: null });
    const { container } = render(<ItemDrawer />);
    expect(container.innerHTML).toBe('');
  });

  test('renders item title and body', () => {
    render(<ItemDrawer />);
    expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
  });

  test('shows loading skeleton', () => {
    drawerState = makeDrawerState({ loading: true });
    render(<ItemDrawer />);
    // Skeleton pulse elements rendered
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  test('shows type badge', () => {
    render(<ItemDrawer />);
    expect(screen.getByText('Untyped')).toBeInTheDocument();
  });

  test('shows Archived badge for archived items', () => {
    drawerState = makeDrawerState({
      item: {
        id: 'item-1', user_id: 'u1', title: 'Archived', body: null,
        item_type: ItemType.Untyped, status: ItemStatus.Archived,
        type_data: null, color: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
      },
    });
    render(<ItemDrawer />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  test('shows Archive button for active items', () => {
    render(<ItemDrawer />);
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  test('shows Restore button for archived items', () => {
    drawerState = makeDrawerState({
      item: {
        id: 'item-1', user_id: 'u1', title: 'X', body: null,
        item_type: ItemType.Untyped, status: ItemStatus.Archived,
        type_data: null, color: null, created_at: '', updated_at: '',
      },
    });
    render(<ItemDrawer />);
    expect(screen.getByText('Restore')).toBeInTheDocument();
  });

  test('shows Promote button for Untyped active items', () => {
    render(<ItemDrawer />);
    expect(screen.getByText('Promote to…')).toBeInTheDocument();
  });

  test('does not show Promote for typed items', () => {
    drawerState = makeDrawerState({
      item: {
        id: 'item-1', user_id: 'u1', title: 'Task', body: null,
        item_type: ItemType.Task, status: ItemStatus.Active,
        type_data: { task_status: 'Open', priority: 'Normal' }, color: null,
        created_at: '', updated_at: '',
      },
    });
    render(<ItemDrawer />);
    expect(screen.queryByText('Promote to…')).not.toBeInTheDocument();
  });

  test('shows task actions for tasks', () => {
    drawerState = makeDrawerState({
      item: {
        id: 'item-1', user_id: 'u1', title: 'Task', body: null,
        item_type: ItemType.Task, status: ItemStatus.Active,
        type_data: { task_status: TaskStatus.Open }, color: null,
        created_at: '', updated_at: '',
      },
    });
    render(<ItemDrawer />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  test('shows created/updated timestamps', () => {
    render(<ItemDrawer />);
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  test('close button calls closeItem', () => {
    render(<ItemDrawer />);
    // The close button is the X svg button in the header
    const buttons = document.querySelectorAll('button');
    const closeBtn = Array.from(buttons).find(b => b.querySelector('svg.w-5'));
    if (closeBtn) fireEvent.click(closeBtn);
    expect(mockCloseItem).toHaveBeenCalled();
  });

  test('backdrop click calls closeItem', () => {
    render(<ItemDrawer />);
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) fireEvent.click(backdrop);
    expect(mockCloseItem).toHaveBeenCalled();
  });
});
