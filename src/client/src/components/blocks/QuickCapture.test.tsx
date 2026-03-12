import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QuickCapture } from './QuickCapture';
import { ViewType } from '../../types';

const mockCaptureItem = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ captureItem: mockCaptureItem }),
}));

const block = {
  id: 'b1', dashboard_id: 'd1', user_id: 'u1',
  view_type: ViewType.QuickCapture, title: 'Quick Capture',
  row: 0, column: 0, created_at: '', updated_at: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCaptureItem.mockResolvedValue({ id: 'new', title: 'test' });
});

describe('QuickCapture', () => {
  test('renders input and disabled submit when empty', () => {
    render(<QuickCapture block={block} />);
    expect(screen.getByPlaceholderText(/capture a thought/i)).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeDisabled();
  });

  test('enables submit when title is typed', async () => {
    render(<QuickCapture block={block} />);
    await userEvent.type(screen.getByPlaceholderText(/capture a thought/i), 'hello');
    expect(screen.getByText('Capture')).not.toBeDisabled();
  });

  test('expands textarea on focus', async () => {
    render(<QuickCapture block={block} />);
    expect(screen.queryByPlaceholderText(/additional notes/i)).not.toBeInTheDocument();

    fireEvent.focus(screen.getByPlaceholderText(/capture a thought/i));
    expect(screen.getByPlaceholderText(/additional notes/i)).toBeInTheDocument();
  });

  test('shows char counter', async () => {
    render(<QuickCapture block={block} />);
    await userEvent.type(screen.getByPlaceholderText(/capture a thought/i), 'abc');
    expect(screen.getByText('3/300')).toBeInTheDocument();
  });

  test('submits and clears input', async () => {
    render(<QuickCapture block={block} />);
    const input = screen.getByPlaceholderText(/capture a thought/i);

    await userEvent.type(input, 'Buy milk');
    await userEvent.click(screen.getByText('Capture'));

    await waitFor(() => expect(mockCaptureItem).toHaveBeenCalledWith('Buy milk', undefined));
    expect(input).toHaveValue('');
  });

  test('trims whitespace before submitting', async () => {
    render(<QuickCapture block={block} />);
    await userEvent.type(screen.getByPlaceholderText(/capture a thought/i), '  trimmed  ');
    await userEvent.click(screen.getByText('Capture'));
    await waitFor(() => expect(mockCaptureItem).toHaveBeenCalledWith('trimmed', undefined));
  });

  test('does not submit when title is whitespace only', async () => {
    render(<QuickCapture block={block} />);
    await userEvent.type(screen.getByPlaceholderText(/capture a thought/i), '   ');
    expect(screen.getByText('Capture')).toBeDisabled();
  });

  test('cancel button collapses textarea', async () => {
    render(<QuickCapture block={block} />);
    fireEvent.focus(screen.getByPlaceholderText(/capture a thought/i));
    expect(screen.getByPlaceholderText(/additional notes/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText(/additional notes/i)).not.toBeInTheDocument();
  });
});
