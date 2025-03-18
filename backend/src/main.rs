use axum::{
    Json, Router,
    http::StatusCode,
    routing::{get, post},
};
use dotenv::dotenv;
use log::{error, info};

mod lib;
#[tokio::main]
async fn main() {
    // Load environment variables
    dotenv().ok();

    if let Err(e) = lib::logger::setup_logger() {
        eprintln!("Error setting up logger: {}", e);
        std::process::exit(1);
    }

    let database_pool = lib::database::establish_connection().await;
    info!("Database connection established");

    let _message_queue_connection = lib::message_queue::create_consume_thread(&database_pool)
        .map_err(|e| {
            error!("Failed to create RabbitMQ consumer: {}", e);
            e
        })
        .unwrap();

    info!("RabbitMQ connection established");

    // build our application with a route
    let app = Router::new().route("/", get(root));

    info!("Starting HTTP server on 0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "Hello, World!"
}
