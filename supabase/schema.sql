-- ============================================================
-- LitVM Bridge — Database Schema
-- Supabase PostgreSQL
-- 
-- This file contains the complete schema for the bridge
-- transaction tracking system. Run in Supabase SQL Editor.
--
-- Supported routes:
--   LiteForge → Sepolia       (lock)
--   Sepolia → LiteForge       (burn/unlock)
--   LiteForge → Base Sepolia  (lock)
--   Base Sepolia → LiteForge  (burn/unlock)
-- ============================================================

-- ── Table: bridge_transactions ──────────────────────────────
-- Tracks all bridge transactions across supported chains

CREATE TABLE IF NOT EXISTS bridge_transactions (
  id              BIGSERIAL PRIMARY KEY,
  direction       TEXT NOT NULL,
  source_tx_hash  TEXT NOT NULL,
  source_chain_id INTEGER NOT NULL,
  source_block    BIGINT NOT NULL DEFAULT 0,
  source_nonce    INTEGER NOT NULL,
  dest_tx_hash    TEXT,
  dest_chain_id   INTEGER NOT NULL,
  sender          TEXT NOT NULL,
  recipient       TEXT NOT NULL,
  amount          TEXT NOT NULL DEFAULT '0',
  fee             TEXT NOT NULL DEFAULT '0',
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,

  -- Unique constraint to prevent duplicate processing
  UNIQUE(source_tx_hash, source_nonce)
);

-- ── CHECK Constraints ───────────────────────────────────────

-- Direction must be one of the supported bridge routes
ALTER TABLE bridge_transactions 
  DROP CONSTRAINT IF EXISTS bridge_transactions_direction_check;
ALTER TABLE bridge_transactions 
  ADD CONSTRAINT bridge_transactions_direction_check 
  CHECK (direction IN (
    'liteforge_to_sepolia', 
    'sepolia_to_liteforge',
    'liteforge_to_basesepolia', 
    'basesepolia_to_liteforge'
  ));

-- Status must be a valid state
ALTER TABLE bridge_transactions 
  DROP CONSTRAINT IF EXISTS bridge_transactions_status_check;
ALTER TABLE bridge_transactions 
  ADD CONSTRAINT bridge_transactions_status_check 
  CHECK (status IN (
    'pending', 
    'processing', 
    'completed', 
    'failed'
  ));

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bridge_tx_direction 
  ON bridge_transactions(direction);

CREATE INDEX IF NOT EXISTS idx_bridge_tx_status 
  ON bridge_transactions(status);

CREATE INDEX IF NOT EXISTS idx_bridge_tx_sender 
  ON bridge_transactions(sender);

CREATE INDEX IF NOT EXISTS idx_bridge_tx_recipient 
  ON bridge_transactions(recipient);

CREATE INDEX IF NOT EXISTS idx_bridge_tx_created 
  ON bridge_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bridge_tx_source_hash 
  ON bridge_transactions(source_tx_hash);

-- ── Views ───────────────────────────────────────────────────

-- Aggregated bridge statistics
DROP VIEW IF EXISTS bridge_stats;
CREATE VIEW bridge_stats AS
SELECT 
  COUNT(*) FILTER (
    WHERE direction IN ('liteforge_to_sepolia', 'liteforge_to_basesepolia') 
    AND status = 'completed'
  ) AS total_locks,
  
  COUNT(*) FILTER (
    WHERE direction IN ('sepolia_to_liteforge', 'basesepolia_to_liteforge') 
    AND status = 'completed'
  ) AS total_burns,
  
  COALESCE(SUM(amount::numeric) FILTER (
    WHERE direction IN ('liteforge_to_sepolia', 'liteforge_to_basesepolia') 
    AND status = 'completed'
  ), 0) AS total_locked_wei,
  
  COALESCE(SUM(amount::numeric) FILTER (
    WHERE direction IN ('sepolia_to_liteforge', 'basesepolia_to_liteforge') 
    AND status = 'completed'
  ), 0) AS total_burned_wei,

  COUNT(*) FILTER (WHERE status = 'completed') AS total_completed,
  COUNT(*) FILTER (WHERE status = 'pending') AS total_pending,
  
  COUNT(*) AS total_transactions
FROM bridge_transactions;

-- ── RLS (Row Level Security) ────────────────────────────────
-- Public read, service_role write

ALTER TABLE bridge_transactions ENABLE ROW LEVEL SECURITY;

-- Allow public to read all transactions
DROP POLICY IF EXISTS "Public read access" ON bridge_transactions;
CREATE POLICY "Public read access" ON bridge_transactions
  FOR SELECT USING (true);

-- Only service_role can insert/update
DROP POLICY IF EXISTS "Service role write access" ON bridge_transactions;
CREATE POLICY "Service role write access" ON bridge_transactions
  FOR ALL USING (auth.role() = 'service_role');
