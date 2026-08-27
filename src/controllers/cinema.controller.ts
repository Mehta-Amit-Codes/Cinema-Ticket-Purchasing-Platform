import { NextFunction, Request, Response } from 'express';
import { cinemaService } from '../services/cinema.service';

/** Wraps async handlers so rejected promises are forwarded to the error middleware. */
const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

export const createCinema = asyncHandler((req, res) => {
    const { numSeats } = req.body as { numSeats: number };
    const cinema = cinemaService.createCinema(numSeats);
    res.status(201).json(cinema);
});

export const listCinemas = asyncHandler((_req, res) => {
    res.json(cinemaService.listCinemas());
});

export const getCinema = asyncHandler((req, res) => {
    const cinema = cinemaService.getCinema(req.params.cinemaId as string);
    res.json(cinema);
});

export const purchaseSeat = asyncHandler(async (req, res) => {
    const { cinemaId, seatId } = req.params as { cinemaId: string; seatId: string };
    const seat = await cinemaService.purchaseSeat(cinemaId, seatId);
    res.json({ seat });
});

export const purchaseConsecutiveSeats = asyncHandler(async (req, res) => {
    const { cinemaId } = req.params as { cinemaId: string };
    const seats = await cinemaService.purchaseConsecutiveSeats(cinemaId, 2);
    res.json({ seats });
});