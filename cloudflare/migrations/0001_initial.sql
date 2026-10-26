CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS short_links (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, code TEXT NOT NULL, code_lower TEXT NOT NULL UNIQUE, destination_url TEXT NOT NULL, created_at INTEGER NOT NULL, click_count INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_links_owner ON short_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_links_code ON short_links(code);
CREATE TABLE IF NOT EXISTS attempts (identifier TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(identifier,bucket));
