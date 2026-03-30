ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_counter_number_check;
ALTER TABLE orders ALTER COLUMN counter_number SET DEFAULT '1';
ALTER TABLE orders ALTER COLUMN counter_number TYPE SMALLINT USING counter_number::smallint;
ALTER TABLE orders ADD CONSTRAINT orders_counter_number_check CHECK (counter_number BETWEEN 1 AND 999);
