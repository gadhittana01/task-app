import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueueServiceError } from '../services/queueService';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  if (err instanceof ZodError) {
    res.status(400).json({ 
      error: 'Validation error', 
      details: err.errors 
    });
    return;
  }

  if (err instanceof QueueServiceError) {
    console.error('Queue service error details:', err.cause);
    res.status(500).json({ error: 'Service communication error' });
    return;
  }

  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    res.status(500).json({ error: 'Database error' });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Authentication error' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}; 