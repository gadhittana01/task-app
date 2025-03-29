import { Request } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

interface AuthenticatedRequest extends Request {
  body: any;
}

const generateToken = (userId: string, email: string): string => {
  if (!config.auth.jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  const options = {
    expiresIn: 86400
  };

  return jwt.sign({ userId, email }, config.auth.jwtSecret, options);
};

export const register = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      ...validatedData
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.email);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Error creating user' });
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: { status: (code: number) => { json: (data: any) => void } }
) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(validatedData.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Error logging in' });
  }
};