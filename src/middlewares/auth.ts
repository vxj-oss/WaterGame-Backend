import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/jwt';

export function auth(req: Request, res: Response, next: NextFunction) {
  try {
    res.locals.uid = verifyToken((req.headers.authorization ?? '').replace('Bearer ', ''));
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
