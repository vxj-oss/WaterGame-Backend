import { mkdirSync } from 'fs';
import { Pool } from 'pg';
import { SCHEMA } from '../models/schema';

interface Db {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  exec(sql: string): Promise<void>;
}

let db: Db | null = null;

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
