use crate::middleware::auth::auth_middleware;
use crate::models::app_user::{
    Claims, CreateAppUser, LoginCredentials, LoginResponse, UpdateAppUser, UserResponse,
    create as create_user, login, update as update_user,
};
use crate::models::data_entry::{
    AverageQuery, AverageResponse, CountResponse, DataEntry, LimitQuery,
    get_daily_averages_for_user, get_public_count_data, get_recent_entries_for_user
};
use crate::models::data_entry_mapping::{
    CreateDataEntryMapping, DataEntryMapping, UpdateDataEntryMapping, create,
    delete as delete_mapping, get_all_for_user, get_by_id_for_user, update,
};
use axum::http::StatusCode;
use axum::middleware;
use axum::{
    Extension, Json, Router,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{delete, get, post, put},
};
use sqlx::Pool;
use sqlx::Postgres;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
}

// Public endpoint - shows overall system stats without requiring authentication
pub async fn root(State(state): State<AppState>) -> Json<CountResponse> {
    let response = get_public_count_data(&state.db).await;
    Json(response)
}

// Protected endpoint - shows entries for authenticated user
pub async fn get_entries(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<LimitQuery>,
) -> Json<Vec<DataEntry>> {
    let limit = query.limit.unwrap_or(10);
    let entries = get_recent_entries_for_user(&state.db, claims.user_id, limit).await;
    Json(entries)
}

// Protected endpoint - shows averages for authenticated user
pub async fn get_averages(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AverageQuery>,
) -> Json<AverageResponse> {
    let days_back = query.days.unwrap_or(7);
    let response = get_daily_averages_for_user(
        &state.db,
        claims.user_id,
        &query.unique_identifiers,
        days_back,
    )
    .await;
    Json(response)
}

// Protected endpoint - creates mapping for authenticated user
pub async fn create_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDataEntryMapping>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match create(&state.db, payload, claims.user_id).await {
        Ok(mapping) => Ok(Json(mapping)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Protected endpoint - gets all mappings for authenticated user
pub async fn get_all_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Vec<DataEntryMapping>>, (StatusCode, String)> {
    match get_all_for_user(&state.db, claims.user_id).await {
        Ok(mappings) => Ok(Json(mappings)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Protected endpoint - gets mapping by ID for authenticated user
pub async fn get_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<i32>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match get_by_id_for_user(&state.db, id, claims.user_id).await {
        Ok(Some(mapping)) => Ok(Json(mapping)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Mapping not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Protected endpoint - updates mapping for authenticated user
pub async fn update_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateDataEntryMapping>,
) -> Result<Json<DataEntryMapping>, (StatusCode, String)> {
    match update(&state.db, id, payload, claims.user_id).await {
        Ok(Some(mapping)) => Ok(Json(mapping)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            "Mapping not found or not authorized".to_string(),
        )),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Protected endpoint - deletes mapping for authenticated user
pub async fn delete_mapping_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    match delete_mapping(&state.db, id, claims.user_id).await {
        Ok(true) => Ok(StatusCode::NO_CONTENT),
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            "Mapping not found or not authorized".to_string(),
        )),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// User routes handlers
pub async fn create_user_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateAppUser>,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    match create_user(&state.db, payload).await {
        Ok(user) => Ok(Json(UserResponse::from(user))),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Protected endpoint - updates authenticated user
pub async fn update_user_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateAppUser>,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    // Only allow users to update their own account
    if claims.user_id != id {
        return Err((
            StatusCode::FORBIDDEN,
            "Not authorized to update this user".to_string(),
        ));
    }

    match update_user(&state.db, id, payload).await {
        Ok(Some(user)) => Ok(Json(UserResponse::from(user))),
        Ok(None) => Err((StatusCode::NOT_FOUND, "User not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn login_handler(
    State(state): State<AppState>,
    Json(credentials): Json<LoginCredentials>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    match login(&state.db, credentials).await {
        Ok(Some(response)) => Ok(Json(response)),
        Ok(None) => Err((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// Get profile of authenticated user
pub async fn get_profile(Extension(claims): Extension<Claims>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "id": claims.user_id,
        "username": claims.username
    }))
}

pub fn create_router(state: AppState) -> Router {
    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Public routes that don't require authentication
    let public_routes = Router::new()
        .route("/", get(root))
        .route("/login", post(login_handler))
        .route("/users", post(create_user_handler));

    // Protected routes that require authentication
    let protected_routes = Router::new()
        .route("/profile", get(get_profile))
        .route("/entries", get(get_entries))
        .route("/averages", get(get_averages))
        .route("/mappings", get(get_all_mappings))
        .route("/mappings", post(create_mapping))
        .route("/mappings/{id}", get(get_mapping))
        .route("/mappings/{id}", put(update_mapping))
        .route("/mappings/{id}", delete(delete_mapping_handler))
        .route("/users/{id}", put(update_user_handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // Combine all routes
    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .with_state(state)
}
