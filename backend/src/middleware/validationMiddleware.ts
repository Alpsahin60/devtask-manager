import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Factory function that returns an Express middleware which validates
 * a request part (body | query | params) against the provided Zod schema.
 *
 * The parsed value replaces the original request part so downstream
 * controllers can consume the validated, coerced data without re-parsing.
 *
 * On failure, the ZodError is passed to next() and caught by errorHandler.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register)
 *   router.get('/events', validate(securityQuerySchema, 'query'), getSecurityEvents)
 */
export const validate =
  (schema: ZodSchema, source: ValidationSource = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Use defineProperty to stay compatible with Express setups where
      // req.query is exposed as a read-only getter (Express 5 / certain
      // configurations). For body/params plain assignment also works.
      Object.defineProperty(req, source, {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
