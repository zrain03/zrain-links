-- Fail / File: cloudflare/migrations/0004_guest_credentials.sql
-- Pembangun / Developer: Zrain
-- Dicipta / Created: 2026-11-07
-- Dikemas kini / Last updated: 2026-11-07
-- BM: Tambah token Guest tanpa mengubah jadual atau data sedia ada.
-- EN: Add guest credentials without rewriting existing tables or data.
CREATE TABLE IF NOT EXISTS guest_credentials (
  key_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
