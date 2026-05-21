/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src',
    '<rootDir>/../../tests/unit/server',
    '<rootDir>/../../tests/contract/server',
    '<rootDir>/../../tests/helpers',
  ],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/../../tests/helpers/jestSetup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/db/migrate.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
