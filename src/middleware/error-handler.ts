import { NextFunction, Request, Response } from 'express';
import { AppError, NotFoundRouteError } from '../errors';
import { logger } from '../config/logger';

/** Catches requests to routes that don't exist and turns them into a proper 404 JSON error. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
    next(new NotFoundRouteError());
}

/**
 * Single place where every error in the app is translated into an HTTP
 * response. Known/operational errors (AppError subclasses) return their
 * own status + code; anything unexpected is logged with full detail and
 * masked as a generic 500 so stack traces never leak to clients.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error({ err, path: req.path }, 'Operational error (5xx)');
        }
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message
            }
        });
        return;
    }

    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
        }
    });
}