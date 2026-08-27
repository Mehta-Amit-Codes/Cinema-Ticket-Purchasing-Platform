# Cinema Ticket Purchasing Platform (v2)

A small Express + TypeScript API for creating cinemas and purchasing seats,
rebuilt on top of the original prototype.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:3000, docs at /api-docs
npm test              # vitest + supertest
npm run build && npm start
# or
docker compose up --build
```

## Endpoints

| Method | Path                                        | Description                          |
|--------|---------------------------------------------|---------------------------------------|
| POST   | `/cinemas`                                  | Create a cinema (`{ "numSeats": 50 }`) |
| GET    | `/cinemas`                                  | List cinemas (summary)                |
| GET    | `/cinemas/:cinemaId`                        | Get a cinema and its seat map         |
| POST   | `/cinemas/:cinemaId/purchase/:seatId`       | Purchase one seat                     |
| POST   | `/cinemas/:cinemaId/purchase-consecutive`   | Purchase the first 2 free adjacent seats |
| GET    | `/health`                                   | Liveness probe                        |
| GET    | `/api-docs`                                 | Swagger UI                            |

---

## Audit of the original codebase

### Bugs / correctness gaps
1. **Broken npm scripts.** `main`/`start` pointed at `dist/app.js` and `dev` at `src/app.ts`, but the entry file was `main.ts` — `npm start`/`npm run dev` did not work as shipped.
2. **Unvalidated `PORT`.** `process.env.PORT` was used with no default and no schema; `app.listen(undefined)` silently falls back to a random port with no warning, and a missing `.env` file wasn't handled at all.
3. **No concurrency safety.** `purchaseSeat`/`purchaseConsecutiveSeats` read-then-write `isPurchased` with no locking. It happened to work with a fully synchronous, in-memory array, but the moment any real datastore (async I/O) is introduced, two simultaneous requests can both pass the "is it free?" check and double-sell the same seat — a critical bug for a ticketing system.
4. **Numeric, sequential, guessable IDs.** `nextCinemaId` and array-index seat IDs let any client enumerate `/cinemas/1`, `/cinemas/2`, ... and purchase other people's seats/cinemas.
5. **Duplicated, ad-hoc error handling.** Every controller repeated the same `try/catch` + `instanceof` chain, and `purchaseConsecutiveSeats` even mapped an unrelated error type (`SeatNotFoundError`) into its catch block by copy-paste, plus it threw a plain `Error` for "no consecutive seats" that was *not* one of the types the catch block checked for — meaning that specific failure would have produced an inconsistent response shape.
6. **No global error handler / 404 handler.** Unknown routes fell through to Express's default HTML error page instead of JSON.

### Missing production essentials
7. No input validation library — manual `typeof`/`NaN` checks are easy to get subtly wrong (e.g. `!cinemaId` treats `cinemaId = 0` as invalid, `numSeats` was never checked for integer-ness or an upper bound → risk of accidental `Array.from({length: 1e9})` DoS).
8. No security middleware: no `helmet`, no CORS policy, no rate limiting, no JSON body size limit.
9. No structured logging (only a single `console.log` on boot) and no request logging.
10. No tests of any kind.
11. No health check endpoint, no graceful shutdown handling (`SIGTERM`/`SIGINT`), no `unhandledRejection`/`uncaughtException` handling.
12. No API documentation.
13. No Dockerfile / containerization, no CI config.
14. No read endpoints (list cinemas, inspect a cinema's seat map) — a client could purchase seats but never see what's available.
15. `typescript` was listed as a runtime `dependency` instead of a `devDependency`.
16. Data model conflated "seat exists" with "seat purchased" and had no timestamps, no way to reason about *when* something happened (useful for refunds/analytics later).

None of this is unusual for a take-home/prototype — it's a clean, well-commented implementation of the core seat-purchasing logic. The gaps above are exactly what's expected to close before something like this goes near real users.

---

## What changed (v1 → v2)

- **Layered architecture**: `routes → controller → service`, with the in-memory store fully isolated behind `cinemaService` so it can be swapped for a real database later without touching controllers or routes.
- **Zod validation** (`src/validation/schemas.ts`, `src/middleware/validate.ts`) replaces manual `typeof`/`NaN` checks and validates body, params, and an upper bound on `numSeats`.
- **UUIDs instead of sequential integers** for cinema and seat IDs, closing the enumeration/IDOR gap.
- **Async per-cinema lock** (`withCinemaLock` in `cinema.service.ts`) makes seat purchase safe under concurrent requests today, and keeps that guarantee once the store becomes a real async DB. Covered by a dedicated concurrency test that fires 10 simultaneous purchases at one seat and asserts exactly one succeeds.
- **Centralized error handling**: a typed `AppError` hierarchy (`src/errors.ts`) plus one `errorHandler` middleware (`src/middleware/error-handler.ts`) — no more repeated try/catch blocks, and a `notFoundHandler` gives unknown routes a consistent JSON 404.
- **Security & resilience middleware**: `helmet`, scoped `cors`, `express-rate-limit`, JSON body size cap, `pino`/`pino-http` structured logging.
- **Operability**: `/health` endpoint, `/api-docs` (Swagger UI generated from JSDoc on the routes), graceful shutdown on `SIGTERM`/`SIGINT`, process-level handlers for unhandled rejections/exceptions.
- **Validated env config** (`src/config/env.ts`) via zod — the app now fails fast with a readable message if `PORT`/etc. are misconfigured, instead of silently binding to an unexpected port.
- **New read endpoints**: `GET /cinemas` and `GET /cinemas/:cinemaId` so clients can actually see seat availability before purchasing.
- **Testing**: Vitest + Supertest integration tests covering happy paths, validation failures, 404/409 cases, and the concurrency fix.
- **Docker**: multi-stage `Dockerfile` (small Alpine production image, non-root user, container `HEALTHCHECK`) and a `docker-compose.yml` for local runs.
- **Fixed package.json**: correct `main`/`start`/`dev` scripts, `typescript` moved to `devDependencies`, added `tsx` for fast dev reloads (replacing `ts-node` + `nodemon`), added `lint`/`format`/`typecheck` scripts.

## 2026-era technology choices and why

| Area | Choice | Why (as of 2026) |
|---|---|---|
| Runtime | Node.js 22 LTS | Current active LTS; native `fetch`, better ESM interop, perf improvements over Node 18/20. |
| Dev loop | `tsx` instead of `ts-node` + `nodemon` | Single fast esbuild-based watcher; simpler dependency graph. |
| Validation | `zod` | De-facto standard for TS-first runtime validation with type inference; also feeds OpenAPI generation if the API grows. |
| Logging | `pino` / `pino-http` | Fastest structured JSON logger in the Node ecosystem, standard for anything shipping logs to Datadog/CloudWatch/ELK. |
| Security | `helmet`, `express-rate-limit`, `cors` | Baseline hardening expected of any public API in 2026 — sane headers, brute-force/DoS mitigation, explicit origin policy. |
| Docs | `swagger-jsdoc` + `swagger-ui-express` | Docs generated from the same route files, so they can't silently drift as far from the code. |
| Testing | `vitest` + `supertest` | Vitest has effectively replaced Jest for new TS projects (native ESM/TS, much faster); Supertest remains the standard for HTTP-level integration tests. |
| Container | Multi-stage `node:22-alpine` | Minimal attack surface/image size, non-root user, `HEALTHCHECK` wired to `/health`. |

## Roadmap (beyond this exercise)

- Swap the in-memory `Map` in `cinema.service.ts` for a real database (Postgres via Prisma/Drizzle is a drop-in fit — the service layer boundary was designed for exactly this) and replace the in-process lock with DB-level transactions/row locks (`SELECT ... FOR UPDATE`) or an optimistic-concurrency version column, so correctness holds across multiple app instances, not just multiple requests to one process.
- Add authn/authz (e.g. JWT/OIDC) once purchases are tied to real users, plus a payment provider integration (Stripe) instead of a bare "mark as purchased".
- Add showtimes/movies/pricing to the domain model — today a "cinema" is really just one flat row of seats for one showing.
- Add an idempotency-key header on purchase endpoints so client retries can't double-charge.
- Add OpenTelemetry tracing and metrics export once this runs as more than a single process.
