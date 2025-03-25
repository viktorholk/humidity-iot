use amiquip::{Connection, Exchange, Publish, QueueDeclareOptions, Result};
use rand::Rng;
use serde::Serialize;
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
struct ExampleMessage {
    pub mac: String,
    pub humidity: f32,
    pub timestamp: i32,
}

fn main() -> Result<()> {
    // Open connection to RabbitMQ server
    //let mut connection = Connection::insecure_open("amqp://admin:secret@iot.holk.solutions:5672")?;
    let mut connection = Connection::insecure_open("amqp://guest:guest@localhost:5672")?;

    // Create a channel - this is where we declare queues and exchanges
    let channel = connection.open_channel(None)?;

    // Declare our queue named "opla"
    // This ensures the queue exists before we try to use it
    let queue = channel.queue_declare("opla", QueueDeclareOptions::default())?;
    println!("Queue '{}' is declared and ready", queue.name());

    // Get a handle to the direct exchange
    // The direct exchange routes messages to queues based on the routing key
    let exchange = Exchange::direct(&channel);

    println!("Starting to publish random float values every 10 seconds...");

    let mut rng = rand::thread_rng();

    loop {
        // Generate a random float between 0 and 100
        let value: f64 = rng.gen_range(0.0..100.0);

        let payload = ExampleMessage {
            mac: "XX-22-D0-63-C2-26".to_string(),
            humidity: value as f32,
            timestamp: 1742891478,
        };

        //let data = format!("XX-22-D0-63-C2-26;{}", value.to_string());
        let data = serde_json::to_string(&payload).unwrap();

        // Publish message to the "opla" queue
        // The routing_key (second parameter) must match the queue name when using direct exchange
        exchange.publish(Publish::new(data.as_bytes(), "opla"))?;
        println!("Published to queue '{}': {:.2}", queue.name(), value);

        thread::sleep(Duration::from_secs(1));
    }
}
