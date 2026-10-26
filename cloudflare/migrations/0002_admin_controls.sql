-- Keep deleted Firebase IDs from reusing an unexpired ID token (normally valid up to one hour).
CREATE TABLE IF NOT EXISTS deleted_firebase_uids (
  uid TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);

-- Audit destructive admin operations in the database.
CREATE TABLE IF NOT EXISTS admin_events (
  id TEXT PRIMARY KEY,
  admin_uid TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_events_created_at ON admin_events(created_at);
