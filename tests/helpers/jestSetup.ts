// Suppress console.error noise from expected error-handler logging in contract tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterAll(() => {
  jest.restoreAllMocks();
});
