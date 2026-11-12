import { Request, Response } from 'express';
import { getIceServers } from '../services/turn';

export async function rtcConfig(_req: Request, res: Response) {
  res.json({ iceServers: await getIceServers() });
}
