-- Revert unique_identifier and created_at to nullable
ALTER TABLE data_entry 
    ALTER COLUMN unique_identifier DROP NOT NULL,
    ALTER COLUMN created_at DROP NOT NULL; 