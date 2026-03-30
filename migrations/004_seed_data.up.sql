-- =============================================================
-- Migration 004: Development seed data
-- This file is safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- =============================================================

-- Seed demo user (password: "demo1234" – bcrypt hash)
INSERT INTO users (id, email, password_hash, full_name, subscription_plan, api_key)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo@readyboard.app',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Led.rPR/G.3ItZ4fC',
    'Demo Café Owner',
    'pro',
    'rb_demo_api_key_12345678'
)
ON CONFLICT (id) DO NOTHING;

-- Seed demo board
INSERT INTO boards (id, user_id, name, slug, display_mode, menu_config)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Main Counter',
    'main-counter',
    'pro',
    '{
        "ticker_text": "Welcome to Demo Café! | WiFi Password: democafe2024 | Today Special: Oat Latte -20%",
        "ready_color": "#22C55E",
        "preparing_color": "#F59E0B",
        "chime_enabled": true,
        "font_size_scale": 1.0,
        "menu_items": [
            {"name": "Espresso",    "price": "2.50", "image": ""},
            {"name": "Cappuccino",  "price": "3.80", "image": ""},
            {"name": "Oat Latte",   "price": "4.20", "image": ""},
            {"name": "Cold Brew",   "price": "4.50", "image": ""}
        ]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Seed some sample orders
INSERT INTO orders (board_id, counter_number, status) VALUES
    ('b0000000-0000-0000-0000-000000000001', 42, 'preparing'),
    ('b0000000-0000-0000-0000-000000000001', 43, 'preparing'),
    ('b0000000-0000-0000-0000-000000000001', 41, 'ready')
ON CONFLICT DO NOTHING;
