-- Migration 014: Add total_price to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0;
