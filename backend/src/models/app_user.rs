use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use chrono::{DateTime, Utc};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, errors::Error as JwtError};
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

// Define the AppUser struct
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppUser {
    #[serde(skip_deserializing)]
    pub id: i32,
    pub username: String,
    #[serde(skip_serializing)]
    pub password: String,
    #[serde(skip_deserializing)]
    pub created_at: Option<DateTime<Utc>>,
}

// Struct for creating a new user
#[derive(Deserialize)]
pub struct CreateAppUser {
    pub username: String,
    pub password: String,
}

// Struct for updating a user
#[derive(Deserialize)]
pub struct UpdateAppUser {
    pub username: Option<String>,
    pub password: Option<String>,
}

// Struct for user login
#[derive(Deserialize)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

// JWT claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub user_id: i32,      // Store as integer instead of string in sub
    pub username: String,
    pub exp: usize,        // expiration time
}

// Response structure for login
#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

// User response without password
#[derive(Serialize)]
pub struct UserResponse {
    pub id: i32,
    pub username: String,
    pub created_at: Option<DateTime<Utc>>,
}

impl From<AppUser> for UserResponse {
    fn from(user: AppUser) -> Self {
        Self {
            id: user.id,
            username: user.username,
            created_at: user.created_at,
        }
    }
}

// Create a new user
pub async fn create(
    db: &Pool<Postgres>,
    user: CreateAppUser,
) -> Result<AppUser, sqlx::Error> {
    // Hash the password before storing
    let hashed_password = hash(user.password, DEFAULT_COST).unwrap();

    let result = sqlx::query_as!(
        AppUser,
        r#"
        INSERT INTO app_user (username, password)
        VALUES ($1, $2)
        RETURNING id, username, password, created_at
        "#,
        user.username,
        hashed_password
    )
    .fetch_one(db)
    .await?;

    Ok(result)
}

// Get a single user by ID
pub async fn get_by_id(db: &Pool<Postgres>, id: i32) -> Result<Option<AppUser>, sqlx::Error> {
    let user = sqlx::query_as!(
        AppUser,
        r#"
        SELECT id, username, password, created_at
        FROM app_user
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(db)
    .await?;

    Ok(user)
}

// Get a user by username
pub async fn get_by_username(db: &Pool<Postgres>, username: &str) -> Result<Option<AppUser>, sqlx::Error> {
    let user = sqlx::query_as!(
        AppUser,
        r#"
        SELECT id, username, password, created_at
        FROM app_user
        WHERE username = $1
        "#,
        username
    )
    .fetch_optional(db)
    .await?;

    Ok(user)
}

// Update a user
pub async fn update(
    db: &Pool<Postgres>,
    id: i32,
    user: UpdateAppUser,
) -> Result<Option<AppUser>, sqlx::Error> {
    // First check if the user exists
    let existing = get_by_id(db, id).await?;
    
    if let Some(existing) = existing {
        // Update the fields that are provided
        let username = user.username.unwrap_or(existing.username);
        let password = match user.password {
            Some(pwd) => hash(pwd, DEFAULT_COST).unwrap(),
            None => existing.password,
        };

        let updated = sqlx::query_as!(
            AppUser,
            r#"
            UPDATE app_user
            SET 
                username = $1,
                password = $2
            WHERE id = $3
            RETURNING id, username, password, created_at
            "#,
            username,
            password,
            id
        )
        .fetch_one(db)
        .await?;

        Ok(Some(updated))
    } else {
        Ok(None)
    }
}

// Validate login credentials and generate JWT token
pub async fn login(db: &Pool<Postgres>, credentials: LoginCredentials) -> Result<Option<LoginResponse>, sqlx::Error> {
    let user_result = get_by_username(db, &credentials.username).await?;
    
    if let Some(user) = user_result {
        if verify(&credentials.password, &user.password).unwrap_or(false) {
            let token = generate_token(&user).expect("Failed to generate token");
            let user_response = UserResponse::from(user);
            
            return Ok(Some(LoginResponse {
                token,
                user: user_response,
            }));
        }
    }
    
    Ok(None)
}

// Generate JWT token
pub fn generate_token(user: &AppUser) -> Result<String, JwtError> {
    // Get the JWT secret from environment variable
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_not_so_secret_key".to_string());
    
    // Set token expiration to 24 hours
    let expiration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as usize + 86400; // 24 hours
    
    let claims = Claims {
        user_id: user.id,
        username: user.username.clone(),
        exp: expiration,
    };
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
}

// Validate and decode JWT token
pub fn validate_token(token: &str) -> Result<Claims, JwtError> {
    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_not_so_secret_key".to_string());
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )?;
    
    Ok(token_data.claims)
}
