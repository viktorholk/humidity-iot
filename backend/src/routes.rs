use axum::{Json, Router, extract::Query, extract::State, routing::get};
use crate::models::data_entry::{
    AverageQuery, LimitQuery, CountResponse, DataEntry, AverageResponse,
    get_total_count_with_identifiers, get_recent_entries, get_daily_averages
};
use sqlx::Pool;
use sqlx::Postgres;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
}

pub async fn root(State(state): State<AppState>) -> Json<CountResponse> {
    let response = get_total_count_with_identifiers(&state.db).await;
    Json(response)
}

pub async fn get_entries(
    State(state): State<AppState>,
    Query(query): Query<LimitQuery>,
) -> Json<Vec<DataEntry>> {
    let limit = query.limit.unwrap_or(10);
    let entries = get_recent_entries(&state.db, limit).await;
    Json(entries)
}

pub async fn get_averages(
    State(state): State<AppState>,
    Query(query): Query<AverageQuery>,
) -> Json<AverageResponse> {
    let days_back = query.days.unwrap_or(7);
    let response = get_daily_averages(&state.db, &query.unique_identifiers, days_back).await;
    Json(response)
}

pub fn create_router(state: AppState) -> Router {
    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/", get(root))
        .route("/entries", get(get_entries))
        .route("/averages", get(get_averages))
        .layer(cors)
        .with_state(state)
}
