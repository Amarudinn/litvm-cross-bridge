-- LitVM Bridge - Supabase Schema
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor → New Query → Run

-- 1. Buat table bridge_transactions
CREATE TABLE bridge_transactions (
  id SERIAL PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('liteforge_to_sepolia', 'sepolia_to_liteforge')),
  source_tx_hash TEXT NOT NULL,
  source_chain_id INTEGER NOT NULL,
  source_block INTEGER NOT NULL,
  source_nonce INTEGER NOT NULL,
  dest_tx_hash TEXT,
  dest_chain_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount TEXT NOT NULL,
  fee TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(source_tx_hash, source_nonce)
);

-- 2. Indexes
CREATE INDEX idx_bt_sender ON bridge_transactions(LOWER(sender));
CREATE INDEX idx_bt_recipient ON bridge_transactions(LOWER(recipient));
CREATE INDEX idx_bt_status ON bridge_transactions(status);
CREATE INDEX idx_bt_direction ON bridge_transactions(direction);
CREATE INDEX idx_bt_created ON bridge_transactions(created_at DESC);
CREATE INDEX idx_bt_source_hash ON bridge_transactions(source_tx_hash);

-- 3. View untuk stats
CREATE OR REPLACE VIEW bridge_stats AS
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE direction = 'liteforge_to_sepolia') as total_locks,
  COUNT(*) FILTER (WHERE direction = 'sepolia_to_liteforge') as total_burns,
  COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
  COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'liteforge_to_sepolia' AND status = 'completed'), 0) as total_locked_wei,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'sepolia_to_liteforge' AND status = 'completed'), 0) as total_burned_wei
FROM bridge_transactions;

-- 4. Row Level Security
ALTER TABLE bridge_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transactions"
  ON bridge_transactions FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert"
  ON bridge_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update"
  ON bridge_transactions FOR UPDATE
  TO service_role
  USING (true);
