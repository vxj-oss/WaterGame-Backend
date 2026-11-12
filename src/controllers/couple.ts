import { Request, Response } from 'express';
import { createCouple, joinCouple, leaveCouple, myCouple } from '../models/couple';

export async function getCouple(_req: Request, res: Response) {
  res.json((await myCouple(res.locals.uid)) ?? null);
}

export async function create(_req: Request, res: Response) {
  const couple = await createCouple(res.locals.uid);
  if (!couple) return res.status(500).json({ error: 'could not create' });
  res.json(couple);
}

export async function join(req: Request, res: Response) {
  const code = String(req.body.code ?? '').trim().toUpperCase();
  const result = await joinCouple(res.locals.uid, code);
  if (!result.ok) return res.status(result.error === 'code not found' ? 404 : 409).json({ error: result.error });
  res.json(result.couple);
}

export async function leave(_req: Request, res: Response) {
  await leaveCouple(res.locals.uid);
  res.json({ ok: true });
}
