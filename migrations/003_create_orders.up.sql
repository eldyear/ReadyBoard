-- =============================================================
-- Migration 003: Create orders table
-- =============================================================

CREATE TYPE order_status AS ENUM ('preparing', 'ready', 'archived');

CREATE TABLE IF NOT EXISTS orders (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id        UUID         NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    counter_number  SMALLINT     NOT NULL CHECK (counter_number BETWEEN 1 AND 999),
    status          order_status NOT NULL DEFAULT 'preparing',
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ready_at        TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    -- Ensure no duplicate active counter on same board
    CONSTRAINT uq_active_order UNIQUE (board_id, counter_number, status)
);

CREATE INDEX IF NOT EXISTS idx_orders_board_status ON orders(board_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);

-- Partial index for fast "live" board query (only active orders)
CREATE INDEX IF NOT EXISTS idx_orders_live
    ON orders(board_id)
    WHERE status IN ('preparing', 'ready');


