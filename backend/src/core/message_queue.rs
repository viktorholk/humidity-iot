use amiquip::{Connection, ConsumerMessage, ConsumerOptions, QueueDeclareOptions, Result};
use chrono::DateTime;
use log::{error, info, warn};
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use std::{env, thread};
use tokio::runtime::Runtime;

#[derive(Deserialize)]
struct MQQTMessage {
    pub mac: String,
    pub humidity: f64,
    pub timestamp: i64,
}

pub fn create_consume_thread(db_pool: &Pool<Postgres>) -> Result<Connection> {
    let rabbitmq_url = env::var("RABBITMQ_URL")
        .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string());

    info!("Connecting to RabbitMQ at {}", rabbitmq_url);
    let mut connection = Connection::insecure_open(&rabbitmq_url)?;
    info!("Connected to RabbitMQ");

    let consumer_channel = connection.open_channel(None)?;
    let db_pool = db_pool.clone();
    let runtime = Runtime::new().expect("Failed to create Tokio runtime");

    thread::spawn(move || -> Result<()> {
        let queue = consumer_channel.queue_declare("opla", QueueDeclareOptions::default())?;
        let consumer = queue.consume(ConsumerOptions::default())?;

        for (i, message) in consumer.receiver().iter().enumerate() {
            match message {
                ConsumerMessage::Delivery(delivery) => {
                    let payload = String::from_utf8_lossy(&delivery.body);
                    info!("{:>4} Received Message [{}]", i, payload);

                    let json: Option<MQQTMessage> =
                        serde_json::from_str(payload.to_string().as_str()).ok();

                    if let Some(data) = json {
                        // Convert epoch timestamp to DateTime<Utc>
                        let timestamp_datetime = DateTime::from_timestamp(data.timestamp, 0);

                        if let Some(datetime) = timestamp_datetime {
                            match runtime.block_on(
                                    sqlx::query!(
                                        "INSERT INTO data_entry (unique_identifier, value, created_at) VALUES ($1, $2, $3) RETURNING id, created_at",
                                        data.mac,
                                        data.humidity as f32,
                                        datetime
                                    )
                                    .fetch_one(&db_pool),
                                ) {
                                    Ok(record) => {
                                        info!(
                                            "Inserted record: id={}, created_at={:?}",
                                            record.id, record.created_at
                                        );
                                    }
                                    Err(e) => {
                                        error!("Database insert failed for {}: {}", data.mac, e);
                                    }
                            }
                        } else {
                            error!("Invalid timestamp value: {}", data.timestamp);
                        }
                    } else {
                        error!("Invalid message format: {}", payload);
                    }

                    if let Err(e) = consumer.ack(delivery) {
                        error!("Failed to acknowledge message: {}", e);
                    }
                }
                other => {
                    warn!("Consumer ended: {:?}", other);
                    break;
                }
            }
        }

        Ok(())
    });

    info!("RabbitMQ connection established and consumer thread started");
    Ok(connection)
}
