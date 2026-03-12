import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

type Schema = Record<string, { required?: boolean; maxLength?: number; type?: string }>;

export function validateBody(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const [field, rules] of Object.entries(schema)) {
      const value = (req.body as Record<string, unknown>)[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        return next(new ValidationError(`${field} is required`));
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          return next(new ValidationError(`${field} must be a ${rules.type}`));
        }
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          return next(
            new ValidationError(`${field} exceeds maximum length`, {
              field,
              length: value.length,
              maximum: rules.maxLength,
            })
          );
        }
      }
    }
    next();
  };
}
