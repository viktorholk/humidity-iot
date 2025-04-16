# IoT Humidity Monitoring and Prediction System (School Project)

## Overview

This project is an Internet of Things (IoT) system designed to monitor environmental humidity using a sensor, store the collected data, visualize it through a web interface, and predict future humidity levels using a machine learning model. This system was developed as a school project.

## Technologies Used

*   **Backend:** Rust Axum, SQLx, Tokio
*   **Frontend:** React, TypeScript, Vite
*   **Prediction Model:** Python, Flask, Pandas
*   **Database:** PostgreSQL
*   **Message Queue:** RabbitMQ (with MQTT plugin enabled)
*   **Sensor:** C/C++ Arduino

## Setup and Installation

1.  **Prerequisites:**
    *   Docker
    *   Docker Compose

2.  **Clone the repository:**
    ```bash
    git clone git@github.com:viktorholk/humidity-iot.git
    cd humidity-iot
    ```

3.  **Configure Environment Variables:**
    *   Create a `.env` file in the root directory by copying the example or using the necessary variables referenced in `docker-compose.yml`:
        ```
        POSTGRES_PASSWORD=<choose_a_strong_password>
        RABBITMQ_PASSWORD=<choose_a_strong_password>
        JWT_SECRET=<choose_a_strong_secret_key>
        ```

4.  **Build and Run:**
    ```bash
    docker compose up --build -d
    ```
    *   The `-d` flag runs the containers in detached mode.
    *   The `--build` flag ensures the images are built before starting.

5.  **Access Services:**
    *   **Frontend:** `http://localhost:80`
    *   **Backend API:** `http://localhost:3000`
    *   **Prediction API:** `http://localhost:5000`
    *   **RabbitMQ Management:** `http://localhost:15672` (Username: `admin`, Password: `${RABBITMQ_PASSWORD}`)
