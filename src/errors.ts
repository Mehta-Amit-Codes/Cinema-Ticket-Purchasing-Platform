/**
 * Base class for all operational (expected) errors in the application.
 * Operational errors are safe to translate directly into an HTTP response;
 * anything that is NOT an AppError is treated as a bug and returns a
 * generic 500 so internals are never leaked to the client.
 */
export abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly code: string;

    constructor(message: string) {
        super(message);
        this.name = new.target.name;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

export class InvalidInputError extends AppError {
    readonly statusCode = 400;
    readonly code = 'INVALID_INPUT';
}

export class CinemaNotFoundError extends AppError {
    readonly statusCode = 404;
    readonly code = 'CINEMA_NOT_FOUND';

    constructor() {
        super('Cinema not found');
    }
}

export class SeatNotFoundError extends AppError {
    readonly statusCode = 404;
    readonly code = 'SEAT_NOT_FOUND';

    constructor() {
        super('Seat not found');
    }
}

export class SeatAlreadyPurchasedError extends AppError {
    readonly statusCode = 409;
    readonly code = 'SEAT_ALREADY_PURCHASED';

    constructor() {
        super('Seat already purchased');
    }
}

export class NoConsecutiveSeatsAvailableError extends AppError {
    readonly statusCode = 409;
    readonly code = 'NO_CONSECUTIVE_SEATS_AVAILABLE';

    constructor() {
        super('No consecutive seats available');
    }
}

export class NotFoundRouteError extends AppError {
    readonly statusCode = 404;
    readonly code = 'ROUTE_NOT_FOUND';

    constructor() {
        super('Route not found');
    }
}