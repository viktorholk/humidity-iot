use axum::{
    extract::State,
    http::{Request, StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::Response,
    body::Body,
};

use crate::models::app_user::validate_token;
use crate::routes::AppState;

// Extract and validate JWT token from request headers
pub async fn auth_middleware(
    _state: State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract the token from the Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .ok_or(StatusCode::UNAUTHORIZED)?
        .to_str()
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    // Check that it's a Bearer token
    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }
    
    // Extract the token itself
    let token = &auth_header[7..]; // Skip "Bearer " prefix
    
    // Validate the token
    match validate_token(token) {
        Ok(claims) => {
            // Add the claims to the request extensions for later use
            request.extensions_mut().insert(claims);
            // Continue with the request
            Ok(next.run(request).await)
        }
        Err(_) => Err(StatusCode::UNAUTHORIZED),
    }
}
