import { Request, Response } from 'express';
import { GOOGLE_CLIENT_ID } from '../config/env';

export const health = (_req: Request, res: Response) => res.json({ ok: true });

export const getConfig = (_req: Request, res: Response) => res.json({ googleClientId: GOOGLE_CLIENT_ID || null });
