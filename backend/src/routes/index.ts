import { Router } from 'express';
import { authRouter } from '../controllers/authController.js';
import { profileRouter } from '../controllers/profileController.js';
import { demandsRouter } from '../controllers/demandsController.js';
import { offersRouter } from '../controllers/offersController.js';
import { matchingRouter } from '../controllers/matchingController.js';
import { transportRouter } from '../controllers/transportController.js';
import { operationsRouter } from '../controllers/operationsController.js';
import { anomaliesRouter } from '../controllers/anomaliesController.js';
import { analyticsRouter } from '../controllers/analyticsController.js';
import { usersRouter } from '../controllers/usersController.js';
import { mapRouter } from '../controllers/mapController.js';
import { demoRouter } from '../controllers/demoController.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true, service: 'dieselp2p-api', time: new Date().toISOString() }));

apiRouter.use(authRouter);
apiRouter.use(profileRouter);
apiRouter.use(demandsRouter);
apiRouter.use(offersRouter);
apiRouter.use(matchingRouter);
apiRouter.use(transportRouter);
apiRouter.use(operationsRouter);
apiRouter.use(anomaliesRouter);
apiRouter.use(analyticsRouter);
apiRouter.use(usersRouter);
apiRouter.use(mapRouter);
apiRouter.use(demoRouter);
