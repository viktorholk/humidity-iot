-- Add up migration script here

CREATE TABLE data_entry (
    id SERIAL PRIMARY KEY,
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
