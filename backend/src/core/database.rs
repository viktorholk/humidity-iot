use std::env;

use log::{error, info};
use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

pub async fn establish_connection() -> Pool<Postgres> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://guest:secret@postgres:5432/db".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .map_err(|e| {
            error!("Failed to connect to database: {}", e);
            e
        })
        .unwrap();

    info!("Database connection established");

    pool
}
