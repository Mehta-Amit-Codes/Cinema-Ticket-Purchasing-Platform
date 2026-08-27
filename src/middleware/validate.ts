import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { InvalidInputError } from '../errors';

/**
 * Validates req.{body,params,query} against a zod schema and forwards a
 * clean InvalidInputError (instead of a raw ZodError) to the central
 * error handler on failure.
 */
export function validate(schema: AnyZodObject) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const parsed = schema.parse({
                body: req.body,
                params: req.params,
                query: req.query
            });
            req.body = parsed.body ?? req.body;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.errors.map((e) => e.message).join('; ');
                next(new InvalidInputError(message));
                return;
            }
            next(error);
        }
    };
}