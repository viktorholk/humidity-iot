-- Add up migration script here

-- 1. Add user_id column
ALTER TABLE data_entry_mapping ADD COLUMN user_id INTEGER NOT NULL REFERENCES app_user(id);

-- 2. Drop the unique constraints on unique_identifier and label
ALTER TABLE data_entry_mapping DROP CONSTRAINT data_entry_mapping_unique_identifier_key;
ALTER TABLE data_entry_mapping DROP CONSTRAINT data_entry_mapping_label_key;

-- 3. Add new unique constraint on user_id and unique_identifier
ALTER TABLE data_entry_mapping ADD CONSTRAINT unique_user_identifier UNIQUE (user_id, unique_identifier); 