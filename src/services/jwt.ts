import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

export const signToken = (uid: number) => jwt.sign({ uid }, JWT_SECRET, { expiresIn: '60d' });

export const verifyToken = (token: string): number => (jwt.verify(token, JWT_SECRET) as { uid: number }).uid;
