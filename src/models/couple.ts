import { query } from '../config/database';
import { makeCode } from '../utils/code';

export interface Couple {
  id: number;
  code: string;
  role: 'fire' | 'water';
  members: number;
}

export async function myCouple(uid: number) {
  const { rows } = await query(
    `SELECT c.id, c.code, m.role,
            (SELECT COUNT(*) FROM couple_members WHERE couple_id = c.id)::int AS members
       FROM couple_members m JOIN couples c ON c.id = m.couple_id WHERE m.user_id = $1`,
    [uid],
  );
  return rows[0] as Couple | undefined;
}

export async function createCouple(uid: number): Promise<Couple | null> {
  const existing = await myCouple(uid);
  if (existing) return existing;
  let created: { id: number; code: string } | undefined;
  for (let i = 0; i < 5 && !created; i++) {
    try {
      created = (await query(`INSERT INTO couples (code) VALUES ($1) RETURNING id, code`, [makeCode()])).rows[0];
    } catch {
      continue;
    }
  }
  if (!created) return null;
  await query(`INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1,$2,'fire')`, [created.id, uid]);
  return { ...created, role: 'fire', members: 1 };
}

export type JoinResult = { ok: true; couple: Couple } | { ok: false; error: 'code not found' | 'couple is full' };

export async function joinCouple(uid: number, code: string): Promise<JoinResult> {
  const existing = await myCouple(uid);
  if (existing) return { ok: true, couple: existing };
  const { rows } = await query(`SELECT id, code FROM couples WHERE code = $1`, [code]);
  if (!rows[0]) return { ok: false, error: 'code not found' };
  const { rows: members } = await query(`SELECT 1 FROM couple_members WHERE couple_id = $1`, [rows[0].id]);
  if (members.length >= 2) return { ok: false, error: 'couple is full' };
  await query(`INSERT INTO couple_members (couple_id, user_id, role) VALUES ($1,$2,'water')`, [rows[0].id, uid]);
  return { ok: true, couple: { ...rows[0], role: 'water', members: 2 } };
}

export async function leaveCouple(uid: number) {
  const c = await myCouple(uid);
  if (!c) return;
  await query(`DELETE FROM couple_members WHERE user_id = $1`, [uid]);
  if (c.members <= 1) await query(`DELETE FROM couples WHERE id = $1`, [c.id]);
}
