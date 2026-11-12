import { Request, Response } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    });
