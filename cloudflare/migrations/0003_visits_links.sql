-- Separate action-based Visits Links from existing Direct Links.
-- A shared alias registry prevents a public short name from belonging to both types.
CREATE TABLE IF NOT EXISTS visits_links (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  code_lower TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  unlock_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_visits_owner ON visits_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_visits_code ON visits_links(code);
CREATE TABLE IF NOT EXISTS visits_actions (
  link_id TEXT NOT NULL REFERENCES visits_links(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 20),
  type TEXT NOT NULL,
  action_url TEXT NOT NULL,
  PRIMARY KEY(link_id, position)
);
CREATE TABLE IF NOT EXISTS link_names (
  code_lower TEXT PRIMARY KEY,
  link_type TEXT NOT NULL CHECK (link_type IN ('direct','visits')),
  link_id TEXT NOT NULL
);
INSERT OR IGNORE INTO link_names(code_lower, link_type, link_id)
  SELECT code_lower, 'direct', id FROM short_links;
CREATE TRIGGER IF NOT EXISTS direct_names_insert AFTER INSERT ON short_links BEGIN
  INSERT INTO link_names(code_lower, link_type, link_id) VALUES (NEW.code_lower, 'direct', NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS direct_names_delete AFTER DELETE ON short_links BEGIN
  DELETE FROM link_names WHERE code_lower = OLD.code_lower AND link_type = 'direct' AND link_id = OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS visits_names_insert AFTER INSERT ON visits_links BEGIN
  INSERT INTO link_names(code_lower, link_type, link_id) VALUES (NEW.code_lower, 'visits', NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS visits_names_delete AFTER DELETE ON visits_links BEGIN
  DELETE FROM link_names WHERE code_lower = OLD.code_lower AND link_type = 'visits' AND link_id = OLD.id;
END;
