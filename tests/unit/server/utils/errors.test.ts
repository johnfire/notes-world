import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  StateError,
  LimitExceeded,
  PolicyViolation,
  CircularDependencyError,
  DatabaseError,
} from '../../../../src/server/src/utils/errors';

describe('Error classes', () => {
  test('ValidationError has correct code and status', () => {
    const err = new ValidationError('bad input', { field: 'title' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.httpStatus).toBe(422);
    expect(err.context).toEqual({ field: 'title' });
    expect(err.message).toBe('bad input');
  });

  test('NotFoundError formats message with id', () => {
    const err = new NotFoundError('Item', 'abc-123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.httpStatus).toBe(404);
    expect(err.message).toContain('abc-123');
  });

  test('NotFoundError formats message without id', () => {
    const err = new NotFoundError('Dashboard');
    expect(err.message).toBe('Dashboard not found');
  });

  test('ConflictError has correct status', () => {
    expect(new ConflictError('already exists').httpStatus).toBe(409);
  });

  test('AuthorizationError has correct status', () => {
    expect(new AuthorizationError('forbidden').httpStatus).toBe(403);
  });

  test('StateError has correct status', () => {
    expect(new StateError('wrong state').httpStatus).toBe(422);
  });

  test('LimitExceeded includes context', () => {
    const err = new LimitExceeded('too many', { current: 20, max: 20 });
    expect(err.code).toBe('LIMIT_EXCEEDED');
    expect(err.context).toEqual({ current: 20, max: 20 });
  });

  test('PolicyViolation has correct code', () => {
    expect(new PolicyViolation('nope').code).toBe('POLICY_VIOLATION');
  });

  test('CircularDependencyError includes cycle path', () => {
    const err = new CircularDependencyError(['a', 'b', 'a']);
    expect(err.code).toBe('CIRCULAR_DEPENDENCY');
    expect(err.context?.cycle_path).toEqual(['a', 'b', 'a']);
  });

  test('DatabaseError is retriable system error', () => {
    const err = new DatabaseError('conn reset');
    expect(err.httpStatus).toBe(500);
    expect(err.code).toBe('DATABASE_ERROR');
  });
});
