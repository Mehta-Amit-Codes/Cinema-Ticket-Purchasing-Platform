import { v4 as uuidv4 } from 'uuid';
import { Cinema, CinemaSummary, Seat } from '../types';
import {
    CinemaNotFoundError,
    NoConsecutiveSeatsAvailableError,
    SeatAlreadyPurchasedError,
    SeatNotFoundError
} from '../errors';

/**
 * In-memory data store.
 *
 * NOTE (2026 improvement path): this is intentionally kept swappable —
 * everything the routes/controllers need goes through CinemaService, so
 * the Map below can be replaced with a Postgres/Prisma repository without
 * touching any other layer. See README "Roadmap" for the migration plan.
 */
const cinemas = new Map<string, Cinema>();

/**
 * Per-cinema promise chain used as a lightweight async mutex so that two
 * concurrent purchase requests for the same cinema can never both observe
 * a seat as free and both mark it purchased (a real race condition that
 * existed in the original implementation once any I/O — e.g. a DB call —
 * sits between the "check" and the "set").
 */
const cinemaLocks = new Map<string, Promise<unknown>>();

async function withCinemaLock<T>(cinemaId: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = cinemaLocks.get(cinemaId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    cinemaLocks.set(
        cinemaId,
        previous.then(() => current)
    );

    await previous;
    try {
        return await fn();
    } finally {
        release();
        if (cinemaLocks.get(cinemaId) === previous.then(() => current)) {
            cinemaLocks.delete(cinemaId);
        }
    }
}

function toSummary(cinema: Cinema): CinemaSummary {
    return {
        id: cinema.id,
        numSeats: cinema.numSeats,
        availableSeats: cinema.seats.filter((s) => !s.isPurchased).length,
        createdAt: cinema.createdAt
    };
}

function getCinemaOrThrow(cinemaId: string): Cinema {
    const cinema = cinemas.get(cinemaId);
    if (!cinema) {
        throw new CinemaNotFoundError();
    }
    return cinema;
}

export const cinemaService = {
    createCinema(numSeats: number): CinemaSummary {
        const id = uuidv4();
        const seats: Seat[] = Array.from({ length: numSeats }, (_, index) => ({
            id: uuidv4(),
            cinemaId: id,
            position: index + 1,
            isPurchased: false,
            purchasedAt: null
        }));

        const cinema: Cinema = { id, numSeats, seats, createdAt: new Date().toISOString() };
        cinemas.set(id, cinema);
        return toSummary(cinema);
    },

    listCinemas(): CinemaSummary[] {
        return Array.from(cinemas.values()).map(toSummary);
    },

    getCinema(cinemaId: string): Cinema {
        return getCinemaOrThrow(cinemaId);
    },

    async purchaseSeat(cinemaId: string, seatId: string): Promise<Seat> {
        return withCinemaLock(cinemaId, () => {
            const cinema = getCinemaOrThrow(cinemaId);
            const seat = cinema.seats.find((s) => s.id === seatId);
            if (!seat) {
                throw new SeatNotFoundError();
            }
            if (seat.isPurchased) {
                throw new SeatAlreadyPurchasedError();
            }
            seat.isPurchased = true;
            seat.purchasedAt = new Date().toISOString();
            return seat;
        });
    },

    async purchaseConsecutiveSeats(cinemaId: string, count = 2): Promise<Seat[]> {
        return withCinemaLock(cinemaId, () => {
            const cinema = getCinemaOrThrow(cinemaId);
            const seats = cinema.seats;

            let startIndex = -1;
            for (let i = 0; i <= seats.length - count; i++) {
                if (seats.slice(i, i + count).every((s) => !s.isPurchased)) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex === -1) {
                throw new NoConsecutiveSeatsAvailableError();
            }

            const chosen = seats.slice(startIndex, startIndex + count);
            const purchasedAt = new Date().toISOString();
            chosen.forEach((seat) => {
                seat.isPurchased = true;
                seat.purchasedAt = purchasedAt;
            });
            return chosen;
        });
    },

    /** Exposed for tests only. */
    _reset(): void {
        cinemas.clear();
        cinemaLocks.clear();
    }
};