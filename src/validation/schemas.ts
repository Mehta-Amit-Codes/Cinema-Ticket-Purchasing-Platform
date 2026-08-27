import { z } from 'zod';

export const createCinemaSchema = z.object({
    body: z.object({
        numSeats: z
            .number({ invalid_type_error: 'numSeats must be a number' })
            .int('numSeats must be an integer')
            .positive('numSeats must be greater than 0')
            .max(10_000, 'numSeats must be 10,000 or fewer')
    })
});

const uuidParam = (name: string) =>
    z.string({ required_error: `${name} is required` }).uuid(`${name} must be a valid UUID`);

export const cinemaIdParamSchema = z.object({
    params: z.object({
        cinemaId: uuidParam('cinemaId')
    })
});

export const purchaseSeatParamsSchema = z.object({
    params: z.object({
        cinemaId: uuidParam('cinemaId'),
        seatId: uuidParam('seatId')
    })
});