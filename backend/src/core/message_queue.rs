use amiquip::{Connection, ConsumerMessage, ConsumerOptions, QueueDeclareOptions, Result};
use log::{error, info, warn};
use sqlx::{Pool, Postgres};
use std::{env, thread};
use tokio::runtime::Runtime;

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

                    if let Some((unique_identifier, val)) = payload.split_once(";") {
                        if let Ok(value) = val.parse::<f64>() {
                            match runtime.block_on(
                                sqlx::query!(
                                    "INSERT INTO data_entry (unique_identifier, value) VALUES ($1, $2) RETURNING id, created_at",
                                    unique_identifier,
                                    value
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
                                    error!("Database insert failed for {}: {}", value, e);
                                }
                            }
                        } else {
                            error!("Invalid value in message: {}", val);
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

    Ok(connection)
}
