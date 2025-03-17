#include <Arduino_MKRIoTCarrier.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// MQTT broker details
const char* mqtt_server = "206.189.4.27";
const int mqtt_port = 5672;

WiFiClient wifiClient;
PubSubClient client(wifiClient);
MKRIoTCarrier carrier;

void connectWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected!");
}

void connectMQTT() {
    client.setServer(mqtt_server, mqtt_port);
    while (!client.connected()) {
        Serial.print("Connecting to MQTT...");
        if (client.connect("MKRWiFi1010Client")) {
            Serial.println("Connected to MQTT broker");
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" retrying in 5 seconds");
            delay(5000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    while (!Serial);
    
    connectWiFi();
    
    if (!carrier.begin()) {
        Serial.println("Failed to initialize MKR IoT Carrier!");
        while (1);
    }
    Serial.println("MKRIoTCarrier initialized successfully.");
    
    connectMQTT();
}

void loop() {
    if (!client.connected()) {
        connectMQTT();
    }
    client.loop();
    
    float humidity = carrier.Env.readHumidity();
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
    
    String payload = String(humidity);
    client.publish("humidity", payload.c_str());
    
    delay(2000); // Wait for 2 seconds before taking another reading
}