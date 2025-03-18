use amiquip::{
    Connection, ConsumerMessage, ConsumerOptions, Exchange, Publish, QueueDeclareOptions, Result,
};
use log::{error, info, warn};
use std::env;
use std::thread;

pub fn create_consume_thread() -> Result<Connection> {
    let rabbitmq_url = env::var("RABBITMQ_URL")
        .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string());

    info!("Attempting to connect to RabbitMQ at {}", rabbitmq_url);
    let mut connection = Connection::insecure_open(&rabbitmq_url)?;
    info!("Successfully connected to RabbitMQ!");

    let channel = connection.open_channel(None)?;

    let consumer_channel = connection.open_channel(None)?;

    thread::spawn(move || -> Result<()> {
        let queue = consumer_channel.queue_declare("opla", QueueDeclareOptions::default())?;
        let consumer = queue.consume(ConsumerOptions::default())?;

        for (i, message) in consumer.receiver().iter().enumerate() {
            match message {
                ConsumerMessage::Delivery(delivery) => {
                    let body = String::from_utf8_lossy(&delivery.body);
                    info!("{:>4} Received Message [{}]", i, body);
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
