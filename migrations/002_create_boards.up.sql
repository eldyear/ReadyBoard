-- =============================================================
-- Migration 002: Create boards table
-- =============================================================

CREATE TYPE display_mode AS ENUM ('standard', 'pro');

CREATE TABLE IF NOT EXISTS boards (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    display_mode    display_mode NOT NULL DEFAULT 'standard',
    -- Custom CSS for theme overrides (max 32KB)
    custom_css      TEXT,
    -- JSONB for dynamic menu items, ticker text, background image URL, etc.
    -- Structure: {
    --   "background_image": "https://...",
    --   "ticker_text": "Special: Oat Latte 20% off | WiFi: CafeGuest123",
    --   "menu_items": [{"name": "Espresso", "price": "2.50", "image": "..."}],
    --   "font_size_scale": 1.0,
    --   "ready_color": "#22C55E",
    --   "preparing_color": "#F59E0B",
    --   "chime_enabled": true
    -- }
    menu_config     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_slug    ON boards(slug);
CREATE INDEX IF NOT EXISTS idx_boards_menu_config ON boards USING gin(menu_config);

CREATE TRIGGER trg_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
