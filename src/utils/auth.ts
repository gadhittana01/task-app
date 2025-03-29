import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const generateTokens = (userId: string, role: UserRole): { accessToken: string; refreshToken: string } => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  const signOptions: jwt.SignOptions = {
    expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn']
  };

  const refreshSignOptions: jwt.SignOptions = {
    expiresIn: jwtRefreshExpiresIn as jwt.SignOptions['expiresIn']
  };

  const accessToken = jwt.sign(
    { userId, role } as JwtPayload,
    jwtSecret,
    signOptions
  );

  const refreshToken = jwt.sign(
    { userId, role } as JwtPayload,
    jwtRefreshSecret,
    refreshSignOptions
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, secret: string): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authentication token required' });
      return;
    }

    const payload = verifyToken(token, process.env.JWT_SECRET || 'default-secret');
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token required' });
      return;
    }

    const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || 'default-refresh-secret');
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.refreshToken !== refreshToken) {
      res.status(403).json({ message: 'Invalid refresh token' });
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
}; 