use log::{error, info};
use sqlx::Pool;
use sqlx::Postgres;

mod core;
mod models;
mod routes;

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenv::dotenv().ok();

    if let Err(e) = core::logger::setup_logger() {
        eprintln!("Error setting up logger: {}", e);
        std::process::exit(1);
    }

    let database_pool = core::database::establish_connection().await;
    let _ = sqlx::migrate!().run(&database_pool).await;

    let _connection = core::message_queue::create_consume_thread(&database_pool)
        .map_err(|e| {
            error!("Failed to create RabbitMQ consumer: {}", e);
            e
        })
        .unwrap();

    let state = routes::AppState { db: database_pool };
    let app = routes::create_router(state);

    info!("Starting HTTP server on 0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
