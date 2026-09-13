import express from 'express';
import cors from 'cors';
import { env, isLanOrigin } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: (origin, cb) => {
        // Sin origen: peticiones del propio servidor, curl o apps nativas.
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return cb(null, true);
        if (env.allowLanOrigins && isLanOrigin(origin)) return cb(null, true);
        // No se lanza un Error: eso produciría un 500. Se niega la cabecera CORS
        // y el navegador bloquea la respuesta, que es el comportamiento correcto.
        cb(null, false);
      },
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(authenticate);
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
