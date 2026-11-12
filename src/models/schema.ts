export const SCHEMA = `
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
CREATE TABLE IF NOT EXISTS game_records (
  couple_id INT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wins INT NOT NULL DEFAULT 0,
  PRIMARY KEY (couple_id, game, user_id)
);
CREATE TABLE IF NOT EXISTS game_bests (
  couple_id INT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  best INT NOT NULL DEFAULT 0,
  PRIMARY KEY (couple_id, game)
);
`;
