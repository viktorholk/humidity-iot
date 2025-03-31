-- Add down migration script here

-- 1. Drop the unique constraint on user_id and unique_identifier
ALTER TABLE data_entry_mapping DROP CONSTRAINT unique_user_identifier;

-- 2. Restore the unique constraints on unique_identifier and label
ALTER TABLE data_entry_mapping ADD CONSTRAINT data_entry_mapping_unique_identifier_key UNIQUE (unique_identifier);
ALTER TABLE data_entry_mapping ADD CONSTRAINT data_entry_mapping_label_key UNIQUE (label);

-- 3. Drop the user_id column
ALTER TABLE data_entry_mapping DROP COLUMN user_id; 