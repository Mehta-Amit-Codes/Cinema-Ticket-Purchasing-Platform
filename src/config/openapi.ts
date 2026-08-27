import swaggerJsdoc from 'swagger-jsdoc';

export const openapiSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Cinema Ticket Purchasing Platform API',
            version: '2.0.0',
            description: 'Create cinemas, browse seat availability, and purchase seats.'
        },
        servers: [{ url: '/' }]
    },
    apis: ['./src/routes/*.ts', './dist/routes/*.js']
});