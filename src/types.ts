export interface Seat {
    id: string;
    cinemaId: string;
    /** 1-based position within the cinema's single row of seats. */
    position: number;
    isPurchased: boolean;
    purchasedAt: string | null;
}

export interface Cinema {
    id: string;
    numSeats: number;
    seats: Seat[];
    createdAt: string;
}

export interface CinemaSummary {
    id: string;
    numSeats: number;
    availableSeats: number;
    createdAt: string;
}
