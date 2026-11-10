import { mkdirSync } from 'fs';
import { Pool } from 'pg';

interface Db {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  exec(sql: string): Promise<void>;
}

let db: Db | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS couple_members (
  couple_id INT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (couple_id, user_id)
);
CREATE TABLE IF NOT EXISTS progress (
  couple_id INT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  level INT NOT NULL,
  best_time_ms INT NOT NULL,
  gems INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 1,
  PRIMARY KEY (couple_id, level)
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  couple_id INT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id),
  level INT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    db = {
      query: (t, p) => pool.query(t, p as unknown[]),
      exec: async (s) => {
        await pool.query(s);
      },
    };
    console.log('Base de datos: Postgres (DATABASE_URL)');
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR ?? './.data/pglite';
    mkdirSync(dir, { recursive: true });
    const pg = new PGlite(dir);
    await pg.waitReady;
    db = {
      query: (t, p) => pg.query(t, p as unknown[]) as Promise<{ rows: any[] }>,
      exec: async (s) => {
        await pg.exec(s);
      },
    };
    console.log('Base de datos: PGlite local (./.data). En Railway define DATABASE_URL.');
  }
  await db.exec(SCHEMA);
}

export function query(text: string, params?: unknown[]) {
  if (!db) throw new Error('DB no inicializada');
  return db.query(text, params);
}
