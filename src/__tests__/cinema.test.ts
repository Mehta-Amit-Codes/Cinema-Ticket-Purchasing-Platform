import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { cinemaService } from '../services/cinema.service';

const app = createApp();

beforeEach(() => {
    cinemaService._reset();
});

describe('POST /cinemas', () => {
    it('creates a cinema with the requested number of seats', async () => {
        const res = await request(app).post('/cinemas').send({ numSeats: 10 });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ numSeats: 10, availableSeats: 10 });
        expect(res.body.id).toBeTypeOf('string');
    });

    it.each([{ numSeats: 0 }, { numSeats: -5 }, { numSeats: 1.5 }, { numSeats: 'ten' }, {}])(
        'rejects invalid input %o',
        async (payload) => {
            const res = await request(app).post('/cinemas').send(payload);
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('INVALID_INPUT');
        }
    );
});

describe('GET /cinemas/:cinemaId', () => {
    it('returns 404 for an unknown cinema', async () => {
        const res = await request(app).get('/cinemas/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('CINEMA_NOT_FOUND');
    });

    it('returns 400 for a malformed cinema id', async () => {
        const res = await request(app).get('/cinemas/not-a-uuid');
        expect(res.status).toBe(400);
    });
});

describe('POST /cinemas/:cinemaId/purchase/:seatId', () => {
    it('purchases a free seat', async () => {
        const created = await request(app).post('/cinemas').send({ numSeats: 5 });
        const cinema = await request(app).get(`/cinemas/${created.body.id}`);
        const seatId = cinema.body.seats[0].id;

        const res = await request(app).post(`/cinemas/${created.body.id}/purchase/${seatId}`);
        expect(res.status).toBe(200);
        expect(res.body.seat.isPurchased).toBe(true);
    });

    it('rejects a double purchase of the same seat', async () => {
        const created = await request(app).post('/cinemas').send({ numSeats: 5 });
        const cinema = await request(app).get(`/cinemas/${created.body.id}`);
        const seatId = cinema.body.seats[0].id;

        await request(app).post(`/cinemas/${created.body.id}/purchase/${seatId}`);
        const res = await request(app).post(`/cinemas/${created.body.id}/purchase/${seatId}`);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('SEAT_ALREADY_PURCHASED');
    });

    it('never double-sells a seat under concurrent requests', async () => {
        const created = await request(app).post('/cinemas').send({ numSeats: 5 });
        const cinema = await request(app).get(`/cinemas/${created.body.id}`);
        const seatId = cinema.body.seats[0].id;

        const results = await Promise.all(
            Array.from({ length: 10 }, () =>
                request(app).post(`/cinemas/${created.body.id}/purchase/${seatId}`)
            )
        );

        const successes = results.filter((r) => r.status === 200);
        expect(successes).toHaveLength(1);
    });
});

describe('POST /cinemas/:cinemaId/purchase-consecutive', () => {
    it('purchases the first two free consecutive seats', async () => {
        const created = await request(app).post('/cinemas').send({ numSeats: 4 });
        const res = await request(app).post(`/cinemas/${created.body.id}/purchase-consecutive`);

        expect(res.status).toBe(200);
        expect(res.body.seats).toHaveLength(2);
        expect(res.body.seats.every((s: { isPurchased: boolean }) => s.isPurchased)).toBe(true);
    });

    it('returns 409 when no consecutive pair is free', async () => {
        const created = await request(app).post('/cinemas').send({ numSeats: 1 });
        const res = await request(app).post(`/cinemas/${created.body.id}/purchase-consecutive`);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('NO_CONSECUTIVE_SEATS_AVAILABLE');
    });
});

describe('unknown routes', () => {
    it('returns a JSON 404', async () => {
        const res = await request(app).get('/nope');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
});