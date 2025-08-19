-- Add optional NFT ticket tracking fields for registrations

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS ticket_nft_tx_hash VARCHAR(66);

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS ticket_nft_contract VARCHAR(42);

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS ticket_token_id NUMERIC;

CREATE INDEX IF NOT EXISTS idx_event_registrations_ticket_nft_tx
ON event_registrations(ticket_nft_tx_hash);


