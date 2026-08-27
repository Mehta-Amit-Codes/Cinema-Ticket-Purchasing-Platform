import express from 'express';
import {
    createCinema,
    getCinema,
    listCinemas,
    purchaseConsecutiveSeats,
    purchaseSeat
} from '../controllers/cinema.controller';
import { validate } from '../middleware/validate';
import { cinemaIdParamSchema, createCinemaSchema, purchaseSeatParamsSchema } from '../validation/schemas';

const router = express.Router();

/**
 * @openapi
 * /cinemas:
 *   post:
 *     summary: Create a new cinema with N seats
 *     tags: [Cinemas]
 *   get:
 *     summary: List all cinemas
 *     tags: [Cinemas]
 */
router.post('/cinemas', validate(createCinemaSchema), createCinema);
router.get('/cinemas', listCinemas);

/**
 * @openapi
 * /cinemas/{cinemaId}:
 *   get:
 *     summary: Get a cinema and its seat map
 *     tags: [Cinemas]
 */
router.get('/cinemas/:cinemaId', validate(cinemaIdParamSchema), getCinema);

/**
 * @openapi
 * /cinemas/{cinemaId}/purchase/{seatId}:
 *   post:
 *     summary: Purchase a specific seat
 *     tags: [Purchases]
 */
router.post('/cinemas/:cinemaId/purchase/:seatId', validate(purchaseSeatParamsSchema), purchaseSeat);

/**
 * @openapi
 * /cinemas/{cinemaId}/purchase-consecutive:
 *   post:
 *     summary: Purchase the first two available consecutive seats
 *     tags: [Purchases]
 */
router.post(
    '/cinemas/:cinemaId/purchase-consecutive',
    validate(cinemaIdParamSchema),
    purchaseConsecutiveSeats
);

export default router;