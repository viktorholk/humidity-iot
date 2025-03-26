use axum::{Json, Router, extract::Query, extract::State, routing::get};
use log::{error, info};
use serde::{Deserialize, Serialize};
use sqlx::Pool;
use sqlx::Postgres;
use tower_http::cors::{Any, CorsLayer};

mod core;

#[derive(Clone)]
struct AppState {
    db: Pool<Postgres>,
}

#[derive(Serialize)]
struct CountResponse {
    total_count: i64,
    entries_by_identifier: Vec<IdentifierCount>,
}

#[derive(Serialize)]
struct IdentifierCount {
    unique_identifier: String,
    count: i64,
    latest_entry: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Serialize)]
struct DataEntry {
    id: i32,
    unique_identifier: String,
    value: f64,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
struct LimitQuery {
    limit: Option<i64>,
}

#[derive(Deserialize)]
struct AverageQuery {
    unique_identifiers: String,
    days: Option<i32>,
}

#[derive(Serialize)]
struct DailyAverage {
    date: chrono::NaiveDate,
    average_value: f64,
    entry_count: i64,
}

#[derive(Serialize)]
struct AverageResponse {
    #[serde(flatten)]
    identifiers: std::collections::HashMap<String, Vec<DailyAverage>>,
}

trait Round {
    fn to_2_decimal(self) -> f64;
}

impl Round for f64 {
    fn to_2_decimal(self) -> f64 {
        (self * 100.0).round() / 100.0
    }
}

async fn root(State(state): State<AppState>) -> Json<CountResponse> {
    // Get total count
    let total_count = sqlx::query!("SELECT COUNT(*) as count FROM data_entry")
        .fetch_one(&state.db)
        .await
        .unwrap()
        .count
        .unwrap_or(0);

    // Get count per unique_identifier with latest entry time
    let entries_by_identifier = sqlx::query!(
        r#"
            SELECT 
                unique_identifier, 
                COUNT(*) as count,
                MAX(created_at) as latest_entry
            FROM data_entry
            GROUP BY unique_identifier
            ORDER BY count DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .unwrap()
    .into_iter()
    .map(|row| IdentifierCount {
        unique_identifier: row.unique_identifier,
        count: row.count.unwrap_or(0),
        latest_entry: row.latest_entry,
    })
    .collect();

    Json(CountResponse {
        total_count,
        entries_by_identifier,
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
    .unwrap()
    .into_iter()
    .map(|row| DataEntry {
        id: row.id,
        unique_identifier: row.unique_identifier,
        value: row.value.to_2_decimal(),
        created_at: row.created_at,
    })
    .collect();

    Json(entries)
}

async fn get_averages(
    State(state): State<AppState>,
    Query(query): Query<AverageQuery>,
) -> Json<AverageResponse> {
    let days_back = query.days.unwrap_or(7);
    let identifiers: Vec<String> = query.unique_identifiers.split(',').map(|s| s.trim().to_string()).collect();
    
    let mut response_map = std::collections::HashMap::new();
    
    for identifier in identifiers {
        let averages = sqlx::query!(
            r#"
                SELECT 
                    DATE(created_at) as date,
                    AVG(value) as average_value,
                    COUNT(*) as entry_count
                FROM data_entry
                WHERE 
                    unique_identifier = $1
                    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            "#,
            identifier,
            days_back as f64
        )
        .fetch_all(&state.db)
        .await
        .unwrap()
        .into_iter()
        .map(|row| DailyAverage {
            date: row.date.unwrap(),
            average_value: row.average_value.unwrap_or(0.0).to_2_decimal(),
            entry_count: row.entry_count.unwrap_or(0),
        })
        .collect();
        
        response_map.insert(identifier, averages);
    }

    Json(AverageResponse {
        identifiers: response_map,
    })
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

    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root))
        .route("/entries", get(get_entries))
        .route("/averages", get(get_averages))
        .layer(cors)
        .with_state(state);

    info!("Starting HTTP server on 0.0.0.0:3000");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
