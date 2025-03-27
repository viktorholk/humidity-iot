use axum::{Json, Router, extract::Query, extract::State, routing::{get, post, put, delete}, extract::Path};
use crate::models::data_entry::{
    AverageQuery, LimitQuery, CountResponse, DataEntry, AverageResponse,
    get_total_count_with_identifiers, get_recent_entries, get_daily_averages
};
use crate::models::data_entry_mapping::{
    DataEntryMapping, CreateDataEntryMapping, UpdateDataEntryMapping,
    create, get_all, get_by_id, update, delete as delete_mapping
};
use sqlx::Pool;
use sqlx::Postgres;
use tower_http::cors::{Any, CorsLayer};
use axum::http::StatusCode;

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

pub async fn create_mapping(
    State(state): State<AppState>,
    Json(payload): Json<CreateDataEntryMapping>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match create(&state.db, payload).await {
        Ok(mapping) => Ok(Json(mapping)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn get_all_mappings(
    State(state): State<AppState>,
) -> Result<Json<Vec<DataEntryMapping>>, (StatusCode, String)> {
    match get_all(&state.db).await {
        Ok(mappings) => Ok(Json(mappings)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn get_mapping(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match get_by_id(&state.db, id).await {
        Ok(Some(mapping)) => Ok(Json(mapping)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Mapping not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn update_mapping(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateDataEntryMapping>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match update(&state.db, id, payload).await {
        Ok(Some(mapping)) => Ok(Json(mapping)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Mapping not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn delete_mapping_handler(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    match delete_mapping(&state.db, id).await {
        Ok(true) => Ok(StatusCode::NO_CONTENT),
        Ok(false) => Err((StatusCode::NOT_FOUND, "Mapping not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
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
        .route("/mappings", get(get_all_mappings))
        .route("/mappings", post(create_mapping))
        .route("/mappings/{id}", get(get_mapping))
        .route("/mappings/{id}", put(update_mapping))
        .route("/mappings/{id}", delete(delete_mapping_handler))
        .layer(cors)
        .with_state(state)
}
