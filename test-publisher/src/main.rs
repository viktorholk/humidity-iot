use amiquip::{Connection, Exchange, Publish, Result, QueueDeclareOptions};
use chrono::Local;
use std::{thread, time::Duration};

fn main() -> Result<()> {
    // Open connection to RabbitMQ server
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

    println!("Starting to publish messages every 10 seconds...");
    
    loop {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let message = format!("Test message sent at {}", timestamp);
        
        // Publish message to the "opla" queue
        // The routing_key (second parameter) must match the queue name when using direct exchange
        exchange.publish(Publish::new(message.as_bytes(), "opla"))?;
        println!("Published to queue '{}': {}", queue.name(), message);
        
        thread::sleep(Duration::from_secs(1));
    }
}
