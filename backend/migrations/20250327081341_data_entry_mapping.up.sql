-- Add up migration script here

CREATE TABLE data_entry_mapping (
    id SERIAL PRIMARY KEY,
    unique_identifier VARCHAR(25) UNIQUE NOT NULL,
    label VARCHAR(25) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
