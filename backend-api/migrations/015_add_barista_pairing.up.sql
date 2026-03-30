-- Migration 015: Add barista_pairing table
CREATE TABLE IF NOT EXISTS barista_pairing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) NOT NULL UNIQUE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by code
CREATE INDEX idx_barista_pairing_code ON barista_pairing(code) WHERE is_active = TRUE;
