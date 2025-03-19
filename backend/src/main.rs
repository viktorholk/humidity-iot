use axum::{Json, Router, extract::Query, extract::State, routing::get};
use log::{error, info};
use serde::{Deserialize, Serialize};
use sqlx::Pool;
use sqlx::Postgres;

mod core;

#[derive(Clone)]
struct AppState {
    db: Pool<Postgres>,
}

#[derive(Serialize)]
struct CountResponse {
    data_entry_count: i64,
}

#[derive(Serialize)]
struct DataEntry {
    id: i32,
    unique_identifier: String,
    #[serde(serialize_with = "format_float")]
    value: f64,
    created_at: chrono::DateTime<chrono::Utc>,
}

fn format_float<S>(value: &f64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&format!("{:.2}", value))
}

#[derive(Deserialize)]
struct LimitQuery {
    limit: Option<i64>,
}

async fn root(State(state): State<AppState>) -> Json<CountResponse> {
    let count = sqlx::query!("SELECT COUNT(*) as count FROM data_entry")
        .fetch_one(&state.db)
        .await
        .unwrap()
        .count
        .unwrap_or(0);

    Json(CountResponse {
        data_entry_count: count,
    })
}

async fn get_entries(
    State(state): State<AppState>,
    Query(query): Query<LimitQuery>,
) -> Json<Vec<DataEntry>> {
    let limit = query.limit.unwrap_or(10);

    let entries = sqlx::query_as!(
        DataEntry,
        r#"
            SELECT id, unique_identifier, value, created_at
            FROM data_entry
            ORDER BY created_at DESC
            LIMIT $1
        "#,
        limit
    )
    .fetch_all(&state.db)
    .await
    .unwrap();

    Json(entries)
}

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

    let state = AppState { db: database_pool };

    let app = Router::new()
        .route("/", get(root))
        .route("/entries", get(get_entries))
        .with_state(state);

    info!("Starting HTTP server on 0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
