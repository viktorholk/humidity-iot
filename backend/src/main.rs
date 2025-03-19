use axum::{Router, routing::get};
use dotenv::dotenv;
use log::{error, info};

mod core;

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenv().ok();

    if let Err(e) = core::logger::setup_logger() {
        eprintln!("Error setting up logger: {}", e);
        std::process::exit(1);
    }

    let database_pool = core::database::establish_connection().await;

    info!("Database connection established");

    let _ = sqlx::migrate!().run(&database_pool).await;

    let _message_queue_connection = core::message_queue::create_consume_thread(&database_pool)
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
