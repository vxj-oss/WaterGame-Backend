import { Request, Response } from 'express';
import { upsertUser } from '../models/user';
import { verifyGoogleCredential } from '../services/google';
import { signToken } from '../services/jwt';

export async function googleLogin(req: Request, res: Response) {
  let payload;
  try {
    payload = await verifyGoogleCredential(req.body.credential);
  } catch {
    return res.status(401).json({ error: 'google verification failed' });
  }
  if (!payload?.sub) return res.status(400).json({ error: 'invalid token' });
  const user = await upsertUser(payload.sub, payload.email ?? null, payload.name ?? null, payload.picture ?? null);
  res.json({ token: signToken(user.id), user });
}
