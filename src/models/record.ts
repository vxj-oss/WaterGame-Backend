import { query } from '../config/database';

export async function listRecords(coupleId: number) {
  const versus = await query(
    `SELECT r.game, m.role, r.wins FROM game_records r
       JOIN couple_members m ON m.user_id = r.user_id AND m.couple_id = r.couple_id
      WHERE r.couple_id = $1`,
    [coupleId],
  );
  const best = await query(`SELECT game, best FROM game_bests WHERE couple_id = $1`, [coupleId]);
  return { versus: versus.rows, best: best.rows };
}

export async function addWin(coupleId: number, game: string, role: 'fire' | 'water') {
  const { rows } = await query(`SELECT user_id FROM couple_members WHERE couple_id = $1 AND role = $2`, [coupleId, role]);
  if (!rows[0]) return false;
  await query(
    `INSERT INTO game_records (couple_id, game, user_id, wins) VALUES ($1,$2,$3,1)
     ON CONFLICT (couple_id, game, user_id) DO UPDATE SET wins = game_records.wins + 1`,
    [coupleId, game, rows[0].user_id],
  );
  return true;
}

export async function saveBest(coupleId: number, game: string, score: number) {
  await query(
    `INSERT INTO game_bests (couple_id, game, best) VALUES ($1,$2,$3)
     ON CONFLICT (couple_id, game) DO UPDATE SET best = GREATEST(game_bests.best, EXCLUDED.best)`,
    [coupleId, game, Math.round(score)],
  );
}
