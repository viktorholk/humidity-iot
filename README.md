# IoT Humidity Monitoring and Prediction System (School Project)

## Overview

This project is an Internet of Things (IoT) system designed to monitor environmental humidity using a sensor, store the collected data, visualize it through a web interface, and predict future humidity levels using a machine learning model. This system was developed as a school project.

## Architecture

The system consists of several microservices orchestrated using Docker Compose:

1.  **Sensor (`/Sensor`):** An Arduino/ESP-based (?) device responsible for measuring humidity and temperature. It publishes the readings to the message queue.
2.  **Message Queue (`/rabbitmq`):** RabbitMQ instance acting as a broker. It receives messages from the sensor (likely via MQTT) and forwards them to the backend for processing.
3.  **Backend (`/backend`):** A Rust application responsible for:
    *   Subscribing to messages from the message queue.
    *   Storing sensor data in the PostgreSQL database.
    *   Providing a REST API for the frontend to retrieve data.
    *   Handling user authentication (JWT based).
4.  **Database (`postgres`):** A PostgreSQL database used to store historical humidity and temperature data.
5.  **Prediction Model (`/prediction-model`):** A Python Flask service that:
    *   Fetches historical data from the backend API.
    *   Uses a pre-trained machine learning model (`humidity_prediction_model.pkl`) to predict future humidity.
    *   Exposes an API endpoint (`/predict_all`) to provide predictions.
6.  **Frontend (`/frontend`):** A web application (built with React?) that:
    *   Visualizes the humidity data fetched from the backend API.
    *   Displays humidity predictions fetched from the prediction model API.
    *   Allows users to interact with the system.

## Technologies Used

*   **Backend:** Rust Axum, SQLx, Tokio
*   **Frontend:** React, TypeScript, Vite
*   **Prediction Model:** Python, Flask, Pandas
*   **Database:** PostgreSQL
*   **Message Queue:** RabbitMQ (with MQTT plugin enabled)
*   **Sensor:** C/C++ Arduino

## Features

*   Real-time humidity data collection.
*   Historical data storage and retrieval.
*   Web-based visualization of humidity trends.
*   Prediction of future humidity levels.
*   Microservice-based architecture.

## Setup and Installation

1.  **Prerequisites:**
    *   Docker
    *   Docker Compose

2.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd humidity-iot
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the root directory by copying the example or using the necessary variables referenced in `docker-compose.yml`:
        ```
        POSTGRES_PASSWORD=<choose_a_strong_password>
        RABBITMQ_PASSWORD=<choose_a_strong_password>
        JWT_SECRET=<choose_a_strong_secret_key>
        ```
    *   Ensure the backend's `.env` file (`backend/.env`) is correctly configured if it contains different or additional variables needed at runtime (though `docker-compose.yml` seems to inject the primary ones).

4.  **Build and Run:**
    ```bash
    docker compose up --build -d
    ```
    *   The `-d` flag runs the containers in detached mode.
    *   The `--build` flag ensures the images are built before starting.

5.  **Access Services:**
    *   **Frontend:** `http://localhost:80` (or the mapped port)
    *   **Backend API:** `http://localhost:3000`
    *   **Prediction API:** `http://localhost:5000`
    *   **RabbitMQ Management:** `http://localhost:15672` (Username: `admin`, Password: `${RABBITMQ_PASSWORD}`)
