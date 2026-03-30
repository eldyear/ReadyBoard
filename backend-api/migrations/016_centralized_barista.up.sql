-- Migration 016: Centralized Nano-Barista Management

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Boards Table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS linked_categories UUID[] DEFAULT '{}';

-- 4. Update Barista Pairing Table
-- Change board_id to user_id to make pairing account-level
ALTER TABLE barista_pairing DROP COLUMN IF EXISTS board_id;
ALTER TABLE barista_pairing ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 5. Update Orders Table Items Column to JSONB for structured data
-- This allows storing [{name, price, category_id}]
-- First, rename old items column if needed or just add a new one. 
-- For simplicity in this migration, we'll keep the column name but change the type.
-- We'll also make board_id nullable.
ALTER TABLE orders ALTER COLUMN board_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN structured_items JSONB DEFAULT '[]'::jsonb;
