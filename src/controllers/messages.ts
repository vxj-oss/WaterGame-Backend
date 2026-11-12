import { Request, Response } from 'express';
import { myCouple } from '../models/couple';
import { addMessage, listMessages } from '../models/message';

export async function getMessages(_req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.json([]);
  res.json(await listMessages(couple.id));
}

export async function postMessage(req: Request, res: Response) {
  const couple = await myCouple(res.locals.uid);
  if (!couple) return res.status(400).json({ error: 'no couple' });
  const { level, text } = req.body as { level?: number; text: string };
  await addMessage(couple.id, res.locals.uid, level ?? null, String(text));
  res.json({ ok: true });
}
