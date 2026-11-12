import { query } from '../config/database';

export async function upsertUser(sub: string, email: string | null, name: string | null, picture: string | null) {
  const { rows } = await query(
    `INSERT INTO users (google_sub, email, name, picture) VALUES ($1,$2,$3,$4)
     ON CONFLICT (google_sub) DO UPDATE SET name = EXCLUDED.name, picture = EXCLUDED.picture
     RETURNING id, name, picture`,
    [sub, email, name, picture],
  );
  return rows[0] as { id: number; name: string; picture: string | null };
}
