-- Migration 010: Add order_number and items to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
