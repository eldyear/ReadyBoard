-- migrations/013_add_payment_routing_fields.up.sql
-- Adds country_code, freedompay_card_token, and auto_renew for routing and cancellation.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'KG',
    ADD COLUMN IF NOT EXISTS freedompay_card_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true;

-- Ensure country_code is uppercase for consistency
CREATE OR REPLACE FUNCTION uppercase_country_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.country_code = UPPER(NEW.country_code);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_country_code_upper
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION uppercase_country_code();
