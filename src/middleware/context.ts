import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { config } from '../config/config';
import { UserRole } from '../models/User';

export interface RequestContext {
  userId: string;
  email: string;
  role?: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export const contextMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    const decoded = await verifyToken(token, config.auth.jwtSecret);
    (req as any).context = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}; 