import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? null });
  }
  const message = err instanceof Error ? err.message : 'Error interno';
  console.error('[api] error:', err);
  res.status(500).json({ error: 'Error interno del servidor', details: process.env.NODE_ENV === 'production' ? null : message });
}
