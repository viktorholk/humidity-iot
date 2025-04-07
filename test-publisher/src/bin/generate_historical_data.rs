use amiquip::{Connection, Exchange, Publish, QueueDeclareOptions, Result};
use chrono::{TimeZone, Utc};
use chrono::Duration; // Ensure Duration is imported if used standalone
use rand::Rng;
use serde::Serialize;
use std::{thread, time}; // Import time for sleep

#[derive(Serialize)]
struct ExampleMessage {
    pub mac: String,
    pub humidity: f32,
    pub timestamp: i32,
}

fn main() -> Result<()> {
    // Open connection to RabbitMQ server
    // Use the appropriate connection string
     let mut connection = Connection::insecure_open("amqp://admin:secret@iot.holk.solutions:5672")?;
    //let mut connection = Connection::insecure_open("amqp://guest:guest@localhost:5672")?;

    // Create a channel
    let channel = connection.open_channel(None)?;

    // Declare the queue
    let queue = channel.queue_declare("opla", QueueDeclareOptions::default())?;
    println!("Queue '{}' declared.", queue.name());

    // Get a handle to the direct exchange
    let exchange = Exchange::direct(&channel);


    let mut rng = rand::thread_rng();

    // Define MAC addresses and base humidity
    let mac1 = "A8:8C:7B:84:21:78_dump";
    let base_humidity1 = 19.53968;
    let mac2 = "B0:8D:7B:84:21:78_dump";
    let base_humidity2 = 22.30834;

    // Define start and end times (UTC)
    let start_time = Utc.with_ymd_and_hms(2025, 3, 17, 0, 0, 0).unwrap();
    let end_time = Utc.with_ymd_and_hms(2025, 4, 1, 0, 0, 0).unwrap();
    let mut current_time = start_time;

    let total_minutes = (end_time - start_time).num_minutes();
    let mut published_count = 0;

    while current_time < end_time {
        let timestamp = current_time.timestamp() as i32;

        // Generate data for MAC 1
        let humidity1 = base_humidity1 + rng.gen_range(-1.0..1.0); // Add randomness
        let payload1 = ExampleMessage {
            mac: mac1.to_string(),
            humidity: humidity1 as f32,
            timestamp,
        };
        let data1 = serde_json::to_string(&payload1).unwrap();
        exchange.publish(Publish::new(data1.as_bytes(), "opla"))?;
        published_count += 1;

        // Generate data for MAC 2
        let humidity2 = base_humidity2 + rng.gen_range(-1.0..1.0); // Add randomness
        let payload2 = ExampleMessage {
            mac: mac2.to_string(),
            humidity: humidity2 as f32,
            timestamp,
        };
        let data2 = serde_json::to_string(&payload2).unwrap();
        exchange.publish(Publish::new(data2.as_bytes(), "opla"))?;
        published_count += 1;


        // Optional: Print progress
        if published_count % 1000 == 0 { // Print every 500 minutes (1000 messages)
             println!("Progress: Published data up to {} ({:.1}%)",
                 current_time.format("%Y-%m-%d %H:%M"),
                 (published_count as f64 / (total_minutes * 2) as f64) * 100.0
             );
        }


        // Increment time by one minute
        current_time += Duration::minutes(1);

        // Optional: add a small delay to avoid overwhelming the server if needed
        // thread::sleep(time::Duration::from_millis(5));
    }

    println!("Finished publishing historical data. Total messages: {}", published_count);

    // Close the connection
    connection.close()
} 
