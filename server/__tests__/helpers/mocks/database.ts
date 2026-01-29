import { vi } from 'vitest';

/**
 * Create a mock database for testing modules that use SQLite.
 */
export function createMockDatabase() {
  const mockStatement = {
    get: vi.fn(),
    run: vi.fn(),
    all: vi.fn().mockReturnValue([]),
  };

  const mockDb = {
    prepare: vi.fn().mockReturnValue(mockStatement),
    exec: vi.fn(),
    close: vi.fn(),
    // Expose statement mock for test assertions
    _statement: mockStatement,
  };

  return mockDb;
}

/**
 * Setup database mock for a module.
 * Returns both the mock database and a reset function.
 */
export function setupDatabaseMock() {
  const mockDb = createMockDatabase();

  const reset = () => {
    mockDb.prepare.mockClear();
    mockDb._statement.get.mockClear();
    mockDb._statement.run.mockClear();
    mockDb._statement.all.mockClear();
  };

  return { mockDb, reset };
}
