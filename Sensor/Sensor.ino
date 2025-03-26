#include <Arduino_MKRIoTCarrier.h>
#include <WiFiNINA.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "config.h"

// WiFi credentials
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// MQTT broker details
const char* mqtt_server = MQTT_SERVER;
const int mqtt_port = MQTT_PORT;
const char* mqtt_username = MQTT_USERNAME;
const char* mqtt_password = MQTT_PASSWORD;
char clientId[18];

WiFiClient wifiClient;
PubSubClient client(wifiClient);
MKRIoTCarrier carrier;

// NTP Client for getting time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // UTC time, update every 60s

void connectWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected!");
    timeClient.begin();  // Start NTP client
}

void connectMQTT() {
    client.setServer(mqtt_server, mqtt_port);
    client.setKeepAlive(120);

    byte mac[6];
    WiFi.macAddress(mac);
    sprintf(clientId, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    while (!client.connected()) {
        Serial.print("Connecting to MQTT...");
        if (client.connect(clientId, mqtt_username, mqtt_password)) {
            Serial.println("Connected to MQTT broker");
        } else {
            Serial.print("Failed, rc=");
            Serial.print(client.state());
            Serial.println(" Retrying in 5 seconds...");
            sentErrorMessage("Failed to connect");
            delay(5000);
        }
    }
}

void sentErrorMessage(const char* message) {
    Serial.println(message);
    carrier.display.setCursor(20, 140);
    carrier.display.setTextColor(ST77XX_RED);
    carrier.display.println(message);
}

// Function to get a gradient color based on humidity
uint16_t getHumidityColor(float humidity) {
    humidity = constrain(humidity, 0, 100); // Ensure within range
    uint8_t red = 0;
    uint8_t green = map(humidity, 0, 100, 0, 255); // More green as humidity increases
    uint8_t blue = 255; // Blue stays constant
    return carrier.display.color565(red, green, blue);
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

    timeClient.update(); // Update time
    unsigned long timestamp = timeClient.getEpochTime(); // Get Unix timestamp

    float humidity = carrier.Env.readHumidity();
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    // Get color based on humidity percentage
    uint16_t bgColor = getHumidityColor(humidity);

    // Update Display
    carrier.display.setTextSize(2);
    carrier.display.setTextColor(ST77XX_WHITE);
    carrier.display.fillScreen(bgColor);
    carrier.display.setCursor(20, 60);
    carrier.display.print("Humidity: ");
    carrier.display.print(humidity);
    carrier.display.println(" %");

    // Display Mac Address
    carrier.display.setCursor(20, 100);
    carrier.display.print("MacAddress:");
    carrier.display.setCursor(20, 120);
    carrier.display.print(clientId);
    carrier.display.println(".");

    // Create JSON payload using StaticJsonDocument
    StaticJsonDocument<256> jsonDoc;
    jsonDoc["mac"] = clientId;
    jsonDoc["humidity"] = humidity;
    jsonDoc["timestamp"] = timestamp; // Add Unix timestamp

    char jsonBuffer[256];
    serializeJson(jsonDoc, jsonBuffer);  // Convert JSON object to a string

    // Publish MQTT message
    if (client.publish("opla", jsonBuffer)) {
        Serial.println("Data sent successfully!");
    } else {
        sentErrorMessage("Failed to send data");
    }

    delay(60000); // Wait for 1 min before taking another reading
}