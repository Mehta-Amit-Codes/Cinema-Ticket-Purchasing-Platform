import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
    logger.info(`Server is running at http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`API docs available at http://localhost:${env.PORT}/api-docs`);
});

function shutdown(signal: string): void {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close((err) => {
        if (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
        process.exit(0);
    });

    // Force-exit if connections don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception - exiting');
    process.exit(1);
});