-- Make unique_identifier and created_at non-nullable
ALTER TABLE data_entry 
    ALTER COLUMN unique_identifier SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL; 