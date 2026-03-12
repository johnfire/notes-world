import '@testing-library/jest-dom'

// Suppress act() warnings — RTL's userEvent wraps in act internally; the warnings
// are false positives from async state updates inside useEffect/event handlers.
const originalError = console.error.bind(console);
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
