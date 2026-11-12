import { Request, Response } from 'express';
import { myCouple } from '../models/couple';
import { addWin, listRecords, saveBest } from '../models/record';

const validGame = (g: unknown): g is string => typeof g === 'string' && /^[a-z0-9_-]{1,30}$/.test(g);

export async function getRecords(_req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.json({ versus: [], best: [] });
  res.json(await listRecords(couple.id));
}

export async function postMatch(req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.status(400).json({ error: 'no couple' });
  const { game, winner } = req.body as { game: unknown; winner: unknown };
  if (!validGame(game) || (winner !== 'fire' && winner !== 'water')) return res.status(400).json({ error: 'bad input' });
  await addWin(couple.id, game, winner);
  res.json({ ok: true });
}

export async function postBest(req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.status(400).json({ error: 'no couple' });
  const { game, score } = req.body as { game: unknown; score: unknown };
  if (!validGame(game) || typeof score !== 'number' || !Number.isFinite(score)) return res.status(400).json({ error: 'bad input' });
  await saveBest(couple.id, game, score);
  res.json({ ok: true });
}
