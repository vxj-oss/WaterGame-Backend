import { query } from '../config/database';

export async function listMessages(coupleId: number) {
  const { rows } = await query(`SELECT id, author_id, level, text, created_at FROM messages WHERE couple_id = $1 ORDER BY created_at`, [coupleId]);
  return rows;
}

export async function addMessage(coupleId: number, authorId: number, level: number | null, text: string) {
  await query(`INSERT INTO messages (couple_id, author_id, level, text) VALUES ($1,$2,$3,$4)`, [coupleId, authorId, level, text.slice(0, 500)]);
}
