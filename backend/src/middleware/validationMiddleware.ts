import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Factory function that returns an Express middleware which validates
 * req.body against the provided Zod schema.
 *
 * On failure, the ZodError is passed to next() and caught by errorHandler.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register)
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
