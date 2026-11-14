CREATE TABLE IF NOT EXISTS saves (
  player_id  TEXT PRIMARY KEY,
  key_hash   TEXT NOT NULL,
  save       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
