use amiquip::{
    Connection, ConsumerMessage, ConsumerOptions, Exchange, Publish, QueueDeclareOptions, Result,
};
use chrono::format::parse;
use log::{error, info, warn};
use sqlx::Pool;
use sqlx::Postgres;
use std::env;
use std::thread;
use tokio::runtime::Runtime;

pub fn create_consume_thread(db_pool: &Pool<Postgres>) -> Result<Connection> {
    let rabbitmq_url = env::var("RABBITMQ_URL")
        .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string());

    info!("Attempting to connect to RabbitMQ at {}", rabbitmq_url);
    let mut connection = Connection::insecure_open(&rabbitmq_url)?;
    info!("Successfully connected to RabbitMQ!");

    let channel = connection.open_channel(None)?;
    let consumer_channel = connection.open_channel(None)?;
    
    // Clone the pool for use in the thread
    let db_pool = db_pool.clone();
    
    // Create a new tokio runtime for async operations
    let runtime = Runtime::new().unwrap();

    thread::spawn(move || -> Result<()> {
        let queue = consumer_channel.queue_declare("opla", QueueDeclareOptions::default())?;
        let consumer = queue.consume(ConsumerOptions::default())?;

        for (i, message) in consumer.receiver().iter().enumerate() {
            match message {
                ConsumerMessage::Delivery(delivery) => {
                    let body = String::from_utf8_lossy(&delivery.body);
                    info!("{:>4} Received Message [{}]", i, body);

                    // Parse the value
                    let value = match body.parse::<f64>() {
                        Ok(v) => v,
                        Err(e) => {
                            error!("Failed to parse value '{}': {}", body, e);
                            if let Err(e) = consumer.ack(delivery) {
                                error!("Failed to acknowledge invalid message: {}", e);
                            }
                            continue;
                        }
                    };

                    // Use the runtime to execute the async database operation
                    match runtime.block_on(async {
                        sqlx::query!(
                            r#"
                                INSERT INTO data_entry
                                (value)
                                VALUES ($1)
                                RETURNING id, created_at
                            "#,
                            value
                        )
                        .fetch_one(&db_pool)
                        .await
                    }) {
                        Ok(record) => {
                            info!("Inserted record: id={}, created_at={:?}", record.id, record.created_at);
                        }
                        Err(e) => {
                            error!("Failed to insert data entry for {}: {}", value, e);
                        }
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
