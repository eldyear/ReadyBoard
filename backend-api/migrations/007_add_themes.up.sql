CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_themes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES themes(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, theme_id)
);

-- Insert Default System Themes
INSERT INTO themes (id, name, content, is_system) VALUES 
('11111111-1111-1111-1111-111111111111', 'Modern Dark', '<!DOCTYPE html><html><head><style>body { background: #111; color: #eee; font-family: monospace; } .ready { color: #ff3b30; font-weight: bold; }</style></head><body><div id="root"></div><script>window.ReadyBoard.onUpdate((orders) => { document.getElementById("root").innerHTML = orders.map(o => `<div class="${o.status}">Order #${o.order_number} (${o.status})</div>`).join(""); });</script></body></html>', true),
('22222222-2222-2222-2222-222222222222', 'Classic Light', '<!DOCTYPE html><html><head><style>body { background: #fff; color: #000; font-family: sans-serif; } .ready { color: #ff3b30; font-weight: bold; }</style></head><body><div id="root"></div><script>window.ReadyBoard.onUpdate((orders) => { document.getElementById("root").innerHTML = orders.map(o => `<div class="${o.status}">Order #${o.order_number} (${o.status})</div>`).join(""); });</script></body></html>', true)
ON CONFLICT (id) DO NOTHING;
