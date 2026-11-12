import { Request, Response } from 'express';
import { myCouple } from '../models/couple';
import { listProgress, saveProgress } from '../models/progress';

export async function getProgress(_req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.json([]);
  res.json(await listProgress(couple.id));
}

export async function postProgress(req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.status(400).json({ error: 'no couple' });
  const { level, timeMs, gems, stars } = req.body as { level: number; timeMs: number; gems: number; stars: number };
  if (![level, timeMs, gems, stars].every((n) => Number.isFinite(n))) return res.status(400).json({ error: 'bad input' });
  await saveProgress(couple.id, level, timeMs, gems, stars);
  res.json({ ok: true });
}
