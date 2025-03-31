use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Debug)]
pub struct DataEntryMapping {
    #[serde(skip_deserializing)]
    pub id: i32,
    pub unique_identifier: String,
    pub label: String,
    #[serde(skip_deserializing)]
    pub user_id: i32,
    #[serde(skip_deserializing)]
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Deserialize)]
pub struct CreateDataEntryMapping {
    pub unique_identifier: String,
    pub label: String,
}

#[derive(Deserialize)]
pub struct UpdateDataEntryMapping {
    pub unique_identifier: Option<String>,
    pub label: Option<String>,
}

// Create a new data entry mapping
pub async fn create(
    db: &Pool<Postgres>,
    mapping: CreateDataEntryMapping,
    user_id: i32,
) -> Result<DataEntryMapping, sqlx::Error> {
    let result = sqlx::query_as!(
        DataEntryMapping,
        r#"
        INSERT INTO data_entry_mapping (unique_identifier, label, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, unique_identifier, label, user_id, created_at
        "#,
        mapping.unique_identifier,
        mapping.label,
        user_id
    )
    .fetch_one(db)
    .await?;

    Ok(result)
}

// Get all data entry mappings for a user
pub async fn get_all_for_user(db: &Pool<Postgres>, user_id: i32) -> Result<Vec<DataEntryMapping>, sqlx::Error> {
    let mappings = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, user_id, created_at
        FROM data_entry_mapping
        WHERE user_id = $1
        ORDER BY id
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(mappings)
}

// Get a single data entry mapping by ID and verify user ownership
pub async fn get_by_id_for_user(db: &Pool<Postgres>, id: i32, user_id: i32) -> Result<Option<DataEntryMapping>, sqlx::Error> {
    let mapping = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, user_id, created_at
        FROM data_entry_mapping
        WHERE id = $1 AND user_id = $2
        "#,
        id,
        user_id
    )
    .fetch_optional(db)
    .await?;

    Ok(mapping)
}

// Update a data entry mapping
pub async fn update(
    db: &Pool<Postgres>,
    id: i32,
    mapping: UpdateDataEntryMapping,
    user_id: i32,
) -> Result<Option<DataEntryMapping>, sqlx::Error> {
    // First check if the record exists and belongs to the user
    let existing = get_by_id_for_user(db, id, user_id).await?;
    
    if let Some(existing) = existing {
        // Update the fields that are provided
        let unique_identifier = mapping.unique_identifier.unwrap_or(existing.unique_identifier);
        let label = mapping.label.unwrap_or(existing.label);

        let updated = sqlx::query_as!(
            DataEntryMapping,
            r#"
            UPDATE data_entry_mapping
            SET 
                unique_identifier = $1,
                label = $2
            WHERE id = $3 AND user_id = $4
            RETURNING id, unique_identifier, label, user_id, created_at
            "#,
            unique_identifier,
            label,
            id,
            user_id
        )
        .fetch_one(db)
        .await?;

        Ok(Some(updated))
    } else {
        Ok(None)
    }
}

// Delete a data entry mapping
pub async fn delete(db: &Pool<Postgres>, id: i32, user_id: i32) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!(
        "DELETE FROM data_entry_mapping WHERE id = $1 AND user_id = $2", 
        id,
        user_id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
} 
