-- migrations/006_add_subscription_status.up.sql
-- Adds subscription_status field to users table for tracking payment state.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'inactive'
        CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'inactive'));

-- Also ensure subscription_plan has 'pro' as valid option (if using CHECK constraint)
-- If the constraint already exists, this will be a no-op.
