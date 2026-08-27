import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openapiSpec } from './config/openapi';
import cinemaRoutes from './routes/cinema.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/** Builds a fully configured Express app without starting a listener (used by both main.ts and tests). */
export function createApp(): Express {
    const app = express();

    app.disable('x-powered-by');
    app.use(helmet());
    app.use(cors({ origin: env.CORS_ORIGIN }));
    app.use(express.json({ limit: '100kb' }));
    app.use(
        pinoHttp({
            logger,
            autoLogging: env.NODE_ENV !== 'test'
        })
    );
    app.use(
        rateLimit({
            windowMs: env.RATE_LIMIT_WINDOW_MS,
            max: env.RATE_LIMIT_MAX,
            standardHeaders: true,
            legacyHeaders: false
        })
    );

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
    app.use(healthRoutes);
    app.use(cinemaRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}