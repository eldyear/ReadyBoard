-- =============================================================
-- Migration 005: Drop flawed uq_active_order constraint
-- =============================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS uq_active_order;
