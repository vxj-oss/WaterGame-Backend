import { query } from '../config/database';

export async function listProgress(coupleId: number) {
  const { rows } = await query(`SELECT level, best_time_ms, gems, stars FROM progress WHERE couple_id = $1 ORDER BY level`, [coupleId]);
  return rows;
}

export async function saveProgress(coupleId: number, level: number, timeMs: number, gems: number, stars: number) {
  await query(
    `INSERT INTO progress (couple_id, level, best_time_ms, gems, stars) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (couple_id, level) DO UPDATE SET
       best_time_ms = LEAST(progress.best_time_ms, EXCLUDED.best_time_ms),
       gems = GREATEST(progress.gems, EXCLUDED.gems),
       stars = GREATEST(progress.stars, EXCLUDED.stars)`,
    [coupleId, Math.round(level), Math.round(timeMs), Math.round(gems), Math.round(stars)],
  );
}
