-- migrations/012_add_stripe_ids_to_users.up.sql
-- Adds stripe_customer_id and stripe_subscription_id to users table.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Indexes for fast lookups during webhooks
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);

-- Ensure they are unique if provided (optional but prevents certain data issues)
-- We use partial unique indexes to allow multiple NULL values.
CREATE UNIQUE INDEX IF NOT EXISTS uq_stripe_subscription_id ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
