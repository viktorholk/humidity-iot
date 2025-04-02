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
) -> Result<DataEntryMapping, sqlx::Error> {
    let result = sqlx::query_as!(
        DataEntryMapping,
        r#"
        INSERT INTO data_entry_mapping (unique_identifier, label)
        VALUES ($1, $2)
        RETURNING id, unique_identifier, label, created_at
        "#,
        mapping.unique_identifier,
        mapping.label
    )
    .fetch_one(db)
    .await?;

    Ok(result)
}

// Get all data entry mappings
pub async fn get_all(db: &Pool<Postgres>) -> Result<Vec<DataEntryMapping>, sqlx::Error> {
    let mappings = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, created_at
        FROM data_entry_mapping
        ORDER BY id
        "#
    )
    .fetch_all(db)
    .await?;

    Ok(mappings)
}

// Get a single data entry mapping by ID
pub async fn get_by_id(db: &Pool<Postgres>, id: i32) -> Result<Option<DataEntryMapping>, sqlx::Error> {
    let mapping = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, created_at
        FROM data_entry_mapping
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(db)
    .await?;

    Ok(mapping)
}

// Get a data entry mapping by unique_identifier
pub async fn get_by_unique_identifier(db: &Pool<Postgres>, unique_identifier: &str) -> Result<DataEntryMapping, sqlx::Error> {
    let mapping = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, created_at
        FROM data_entry_mapping
        WHERE unique_identifier = $1
        "#,
        unique_identifier
    )
    .fetch_optional(db)
    .await?
    .ok_or(sqlx::Error::RowNotFound)?;

    Ok(mapping)
}

// Get a data entry mapping by label
pub async fn get_by_label(db: &Pool<Postgres>, label: &str) -> Result<DataEntryMapping, sqlx::Error> {
    let mapping = sqlx::query_as!(
        DataEntryMapping,
        r#"
        SELECT id, unique_identifier, label, created_at
        FROM data_entry_mapping
        WHERE label = $1
        "#,
        label
    )
    .fetch_optional(db)
    .await?
    .ok_or(sqlx::Error::RowNotFound)?;

    Ok(mapping)
}

// Update a data entry mapping
pub async fn update(
    db: &Pool<Postgres>,
    id: i32,
    mapping: UpdateDataEntryMapping,
) -> Result<Option<DataEntryMapping>, sqlx::Error> {
    // First check if the record exists
    let existing = get_by_id(db, id).await?;
    
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
            WHERE id = $3
            RETURNING id, unique_identifier, label, created_at
            "#,
            unique_identifier,
            label,
            id
        )
        .fetch_one(db)
        .await?;

        Ok(Some(updated))
    } else {
        Ok(None)
    }
}

// Delete a data entry mapping
pub async fn delete(db: &Pool<Postgres>, id: i32) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!("DELETE FROM data_entry_mapping WHERE id = $1", id)
        .execute(db)
        .await?;

    Ok(result.rows_affected() > 0)
} 