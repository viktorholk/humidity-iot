use serde::{Deserialize, Serialize};
use sqlx::Pool;
use sqlx::Postgres;

#[derive(Serialize)]
pub struct CountResponse {
    pub total_count: i64,
    pub entries_by_identifier: Vec<IdentifierCount>,
}

#[derive(Serialize)]
pub struct IdentifierCount {
    pub unique_identifier: String,
    pub count: i64,
    pub latest_entry: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Serialize)]
pub struct DataEntry {
    pub id: i32,
    pub unique_identifier: String,
    pub value: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub label: Option<String>,
}

#[derive(Deserialize)]
pub struct LimitQuery {
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct AverageQuery {
    pub unique_identifiers: String,
    pub days: Option<i32>,
}

#[derive(Serialize)]
pub struct DailyAverage {
    pub date: chrono::NaiveDate,
    pub average_value: f64,
    pub entry_count: i64,
}

#[derive(Serialize)]
pub struct AverageResponse {
    #[serde(flatten)]
    pub identifiers: std::collections::HashMap<String, Vec<DailyAverage>>,
    pub labels: std::collections::HashMap<String, String>,
}

pub trait Round {
    fn to_2_decimal(self) -> f64;
}

impl Round for f64 {
    fn to_2_decimal(self) -> f64 {
        (self * 100.0).round() / 100.0
    }
}

// Get recent entries for a user
pub async fn get_recent_entries_for_user(
    db: &Pool<Postgres>,
    user_id: i32,
    limit: i64,
) -> Vec<DataEntry> {
    sqlx::query!(
        r#"
            SELECT 
                de.id, 
                de.unique_identifier, 
                de.value, 
                de.created_at,
                dem.label as "label?"
            FROM data_entry de
            JOIN data_entry_mapping dem ON de.unique_identifier = dem.unique_identifier
            WHERE dem.user_id = $1
            ORDER BY de.created_at DESC
            LIMIT $2
        "#,
        user_id,
        limit
    )
    .fetch_all(db)
    .await
    .unwrap()
    .into_iter()
    .map(|row| DataEntry {
        id: row.id,
        unique_identifier: row.unique_identifier,
        value: row.value.to_2_decimal(),
        created_at: row.created_at,
        label: row.label,
    })
    .collect()
}

// Get daily averages for a user's identifiers
pub async fn get_daily_averages_for_user(
    db: &Pool<Postgres>,
    user_id: i32,
    unique_identifiers: &str,
    days_back: i32,
) -> AverageResponse {
    let identifiers: Vec<String> = unique_identifiers
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    let mut response_map = std::collections::HashMap::new();
    let mut labels_map = std::collections::HashMap::new();

    // Get labels for the identifiers, filtering by user_id
    if !identifiers.is_empty() {
        let labels = sqlx::query!(
            r#"
                SELECT unique_identifier, label
                FROM data_entry_mapping
                WHERE unique_identifier = ANY($1) AND user_id = $2
            "#,
            &identifiers,
            user_id
        )
        .fetch_all(db)
        .await
        .unwrap();

        for row in labels {
            labels_map.insert(row.unique_identifier, row.label);
        }
    }

    // Only use identifiers that belong to the user
    let user_identifiers: Vec<String> = labels_map.keys().cloned().collect();

    for identifier in user_identifiers {
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
                    AND CURRENT_DATE  >= created_at - INTERVAL '1 day'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            "#,
            identifier,
            days_back as f64
        )
        .fetch_all(db)
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

    AverageResponse {
        identifiers: response_map,
        labels: labels_map,
    }
}

// Get total count and counts by identifier without requiring authentication
pub async fn get_public_count_data(db: &Pool<Postgres>) -> CountResponse {
    // Get total count across all data entries
    let total_count = sqlx::query!("SELECT COUNT(*) as count FROM data_entry")
        .fetch_one(db)
        .await
        .unwrap()
        .count
        .unwrap_or(0);

    // Get count per unique_identifier with latest entry time and mapping label if available
    let entries_by_identifier = sqlx::query!(
        r#"
            SELECT 
                de.unique_identifier, 
                COUNT(*) as count,
                MAX(de.created_at) as latest_entry
            FROM data_entry de
            GROUP BY de.unique_identifier
            ORDER BY count DESC
        "#
    )
    .fetch_all(db)
    .await
    .unwrap()
    .into_iter()
    .map(|row| IdentifierCount {
        unique_identifier: row.unique_identifier,
        count: row.count.unwrap_or(0),
        latest_entry: row.latest_entry,
        label: None,
    })
    .collect();

    CountResponse {
        total_count,
        entries_by_identifier,
    }
}
