// Error hierarchy as defined in global.policy

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// System errors — transient, retriable
export class SystemError extends AppError {
  constructor(message: string, code = 'SYSTEM_ERROR', context?: Record<string, unknown>) {
    super(message, code, 500, context);
  }
}
export class DatabaseError extends SystemError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context);
  }
}
export class NetworkError extends SystemError {
  constructor(message: string) { super(message, 'NETWORK_ERROR'); }
}
export class TimeoutError extends SystemError {
  constructor(message: string) { super(message, 'TIMEOUT_ERROR'); }
}
export class ServiceUnavailable extends SystemError {
  constructor(message: string) { super(message, 'SERVICE_UNAVAILABLE'); }
}

// Client errors
export class ClientError extends AppError {}

export class ValidationError extends ClientError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 422, context);
  }
}
export class AuthorizationError extends ClientError {
  constructor(message: string) { super(message, 'AUTHORIZATION_ERROR', 403); }
}
export class NotFoundError extends ClientError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}
export class ConflictError extends ClientError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, context);
  }
}

// Business errors
export class BusinessError extends AppError {}

export class PolicyViolation extends BusinessError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'POLICY_VIOLATION', 422, context);
  }
}
export class LimitExceeded extends BusinessError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'LIMIT_EXCEEDED', 422, context);
  }
}
export class StateError extends BusinessError {
  constructor(message: string) { super(message, 'STATE_ERROR', 422); }
}
export class CircularDependencyError extends BusinessError {
  constructor(cyclePath: string[]) {
    super('Circular dependency detected', 'CIRCULAR_DEPENDENCY', 422, { cycle_path: cyclePath });
  }
}
