-- Add payment transaction hash to event registrations
-- Base-only onchain payments: store tx hash for auditing

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(66);

-- Optional: store chain id for multi-chain safety (fixed to Base if used)
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS chain_id INTEGER;

-- Index for quick lookups by tx hash
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_tx_hash
ON event_registrations(payment_tx_hash);

-- Backfill chain_id to Base mainnet (8453) where tx hash exists and chain_id is null
UPDATE event_registrations
SET chain_id = 8453
WHERE payment_tx_hash IS NOT NULL AND chain_id IS NULL;


