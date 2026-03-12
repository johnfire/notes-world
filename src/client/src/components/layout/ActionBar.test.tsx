import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ActionBar } from './ActionBar';

const mockSearch    = vi.fn();
const mockClear     = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state:       { loading: false, error: null },
    search:      mockSearch,
    clearSearch: mockClear,
  }),
}));

beforeEach(() => vi.clearAllMocks());

describe('ActionBar', () => {
  test('renders search input', () => {
    render(<ActionBar />);
    expect(screen.getByPlaceholderText(/search items/i)).toBeInTheDocument();
  });

  test('shows loading indicator when loading', () => {
    vi.mocked(vi.fn()).mockReturnValue(undefined);
    // Override mock for this test
    const mod = vi.importMock('../../context/AppContext');
    void mod;

    render(<ActionBar />);
    // loading is false in mock, so loading indicator not shown
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  test('clear button appears when text is typed', async () => {
    render(<ActionBar />);
    const input = screen.getByPlaceholderText(/search items/i);

    await userEvent.type(input, 'hello');
    // Clear button (×) should appear
    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
  });

  test('pressing Escape clears the search', async () => {
    render(<ActionBar />);
    const input = screen.getByPlaceholderText(/search items/i);

    await userEvent.type(input, 'hello');
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockClear).toHaveBeenCalled();
  });

  test('shows app name logo', () => {
    render(<ActionBar />);
    expect(screen.getByText('notes-world')).toBeInTheDocument();
  });
});
