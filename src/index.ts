import 'dotenv/config';
import http from 'http';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { Server } from 'socket.io';
import { initDb, query } from './db';

const PORT = Number(process.env.PORT ?? 4010);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET.');
  process.exit(1);
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5301').split(',').map((s) => s.trim());
const corsOrigin = ORIGINS.includes('*') ? true : ORIGINS;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const signToken = (uid: number) => jwt.sign({ uid }, JWT_SECRET, { expiresIn: '60d' });
const verifyToken = (token: string): number => (jwt.verify(token, JWT_SECRET) as { uid: number }).uid;

function auth(req: Request, res: Response, next: NextFunction) {
  try {
    res.locals.uid = verifyToken((req.headers.authorization ?? '').replace('Bearer ', ''));
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

async function myCouple(uid: number) {
  const { rows } = await query(
    `SELECT c.id, c.code, m.role,
            (SELECT COUNT(*) FROM couple_members WHERE couple_id = c.id)::int AS members
       FROM couple_members m JOIN couples c ON c.id = m.couple_id WHERE m.user_id = $1`,
    [uid],
  );
  return rows[0] as { id: number; code: string; role: 'fire' | 'water'; members: number } | undefined;
}

async function upsertUser(sub: string, email: string | null, name: string | null, picture: string | null) {
  const { rows } = await query(
    `INSERT INTO users (google_sub, email, name, picture) VALUES ($1,$2,$3,$4)
     ON CONFLICT (google_sub) DO UPDATE SET name = EXCLUDED.name, picture = EXCLUDED.picture
     RETURNING id, name, picture`,
    [sub, email, name, picture],
  );
  return rows[0] as { id: number; name: string; picture: string | null };
}

const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) =>
    fn(req, res).catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'server error' });
    });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/config', (_req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID || null }));

app.post(
  '/auth/google',
  h(async (req, res) => {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'google verification failed' });
    }
    if (!payload?.sub) return res.status(400).json({ error: 'invalid token' });
    const user = await upsertUser(payload.sub, payload.email ?? null, payload.name ?? null, payload.picture ?? null);
    res.json({ token: signToken(user.id), user });
  }),
);

app.get('/couple', auth, h(async (_req, res) => res.json((await myCouple(res.locals.uid)) ?? null)));

app.post(
  '/couple/create',
  auth,
  h(async (_req, res) => {
    const uid: number = res.locals.uid;
    const existing = await myCouple(uid);
    if (existing) return res.json(existing);
    let created: { id: number; code: string } | undefined;
    for (let i = 0; i < 5 && !created; i++) {
      try {
        created = (await query(`INSERT INTO couples (code) VALUES ($1) RETURNING id, code`, [makeCode()])).rows[0];
      } catch {
      }
    }
    if (!created) return res.status(500).json({ error: 'could not create' });
    await query(`INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1,$2,'fire')`, [created.id, uid]);
    res.json({ ...created, role: 'fire', members: 1 });
  }),
);

app.post(
  '/couple/join',
  auth,
  h(async (req, res) => {
    const uid: number = res.locals.uid;
    const existing = await myCouple(uid);
    if (existing) return res.json(existing);
    const code = String(req.body.code ?? '').trim().toUpperCase();
    const { rows } = await query(`SELECT id, code FROM couples WHERE code = $1`, [code]);
    if (!rows[0]) return res.status(404).json({ error: 'code not found' });
    const { rows: members } = await query(`SELECT 1 FROM couple_members WHERE couple_id = $1`, [rows[0].id]);
    if (members.length >= 2) return res.status(409).json({ error: 'couple is full' });
    await query(`INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1,$2,'water')`, [rows[0].id, uid]);
    res.json({ ...rows[0], role: 'water', members: 2 });
  }),
);

app.post(
  '/couple/leave',
  auth,
  h(async (_req, res) => {
    const c = await myCouple(res.locals.uid);
    if (c) {
      await query(`DELETE FROM couple_members WHERE user_id = $1`, [res.locals.uid]);
      if (c.members <= 1) await query(`DELETE FROM couples WHERE id = $1`, [c.id]);
    }
    res.json({ ok: true });
  }),
);

app.get(
  '/progress',
  auth,
  h(async (_req, res) => {
    const c = await myCouple(res.locals.uid);
    if (!c) return res.json([]);
    const { rows } = await query(
      `SELECT level, best_time_ms, gems, stars FROM progress WHERE couple_id = $1 ORDER BY level`,
      [c.id],
    );
    res.json(rows);
  }),
);

app.post(
  '/progress',
  auth,
  h(async (req, res) => {
    const c = await myCouple(res.locals.uid);
    if (!c) return res.status(400).json({ error: 'no couple' });
    const { level, timeMs, gems, stars } = req.body as { level: number; timeMs: number; gems: number; stars: number };
    if (![level, timeMs, gems, stars].every((n) => Number.isFinite(n))) return res.status(400).json({ error: 'bad input' });
    await query(
      `INSERT INTO progress (couple_id, level, best_time_ms, gems, stars) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (couple_id, level) DO UPDATE SET
         best_time_ms = LEAST(progress.best_time_ms, EXCLUDED.best_time_ms),
         gems = GREATEST(progress.gems, EXCLUDED.gems),
         stars = GREATEST(progress.stars, EXCLUDED.stars)`,
      [c.id, Math.round(level), Math.round(timeMs), Math.round(gems), Math.round(stars)],
    );
    res.json({ ok: true });
  }),
);

app.get(
  '/messages',
  auth,
  h(async (_req, res) => {
    const c = await myCouple(res.locals.uid);
    if (!c) return res.json([]);
    const { rows } = await query(
      `SELECT id, author_id, level, text, created_at FROM messages WHERE couple_id = $1 ORDER BY created_at`,
      [c.id],
    );
    res.json(rows);
  }),
);

app.post(
  '/messages',
  auth,
  h(async (req, res) => {
    const c = await myCouple(res.locals.uid);
    if (!c) return res.status(400).json({ error: 'no couple' });
    const { level, text } = req.body as { level?: number; text: string };
    await query(`INSERT INTO messages (couple_id, author_id, level, text) VALUES ($1,$2,$3,$4)`, [
      c.id,
      res.locals.uid,
      level ?? null,
      String(text).slice(0, 500),
    ]);
    res.json({ ok: true });
  }),
);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin } });

io.use((socket, next) => {
  try {
    socket.data.uid = verifyToken(String(socket.handshake.auth.token ?? ''));
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const couple = await myCouple(socket.data.uid);
  if (!couple) {
    socket.emit('no-couple');
    return socket.disconnect();
  }
  const room = `couple:${couple.id}`;
  socket.join(room);
  const peerOnline = (io.sockets.adapter.rooms.get(room)?.size ?? 1) > 1;
  socket.emit('joined', { role: couple.role, code: couple.code, peerOnline });
  socket.to(room).emit('peer-joined');

  for (const ev of ['state', 'event', 'emote']) {
    socket.on(ev, (payload) => socket.to(room).emit(ev, payload));
  }
  socket.on('disconnect', () => socket.to(room).emit('peer-left'));
});

initDb()
  .then(() => server.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('No se pudo iniciar la base de datos:', e);
    process.exit(1);
  });
