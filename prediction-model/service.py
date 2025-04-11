import requests
import pandas as pd
import logging
import os
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

API_BASE_URL = "http://iot.holk.solutions:3000"

# Global variable to store the JWT token
jwt_token = None

# Function to log in and retrieve a JWT token
def login(username, password):
    global jwt_token
    login_url = f"{API_BASE_URL}/login"
    response = requests.post(login_url, json={"username": username, "password": password})
    if response.status_code != 200:
        raise Exception(f"Failed to log in: {response.status_code} - {response.text}")
    jwt_token = response.json().get("token")
    if not jwt_token:
        raise ValueError("Login response does not contain a token")

# Automatically log in with predefined credentials
def auto_login():
    global jwt_token
    username = "prediction_user"
    password = "Y25wMgsD4x7F"
    login(username, password)

# Function to get headers with the JWT token
def get_auth_headers():
    if not jwt_token:
        raise ValueError("JWT token is not available. Please log in first.")
    return {"Authorization": f"Bearer {jwt_token}"}

# Function to fetch all sensors
def fetch_all_sensors():
    headers = get_auth_headers()
    response = requests.get(f"{API_BASE_URL}/", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch sensors from API: {response.status_code} - {response.text}")
    sensors_data = response.json()
    return sensors_data.get("entries_by_identifier", [])

# Function to fetch historical data for a specific sensor
def fetch_sensor_data(unique_identifier, days=30):
    headers = get_auth_headers()
    response = requests.get(f"{API_BASE_URL}/averages?unique_identifiers={unique_identifier}&days={days}", headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data for sensor {unique_identifier}: {response.status_code} - {response.text}")
    
    data = response.json()
    print(f"Fetched data for sensor {unique_identifier}: {data}", flush=True)  # Debugging line
    if unique_identifier not in data:
        raise ValueError(f"No data found for sensor {unique_identifier}")
    
    # Extract and format the data
    sensor_data = pd.DataFrame(data[unique_identifier])
    if not {'date', 'average_value'}.issubset(sensor_data.columns):
        raise ValueError(f"Sensor {unique_identifier} data does not contain the required columns: 'date', 'average_value'")
    
    sensor_data.rename(columns={'average_value': 'indoor_humidity'}, inplace=True)
    return sensor_data

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for the Flask app

# Define a default route for the root URL
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the Humidity Prediction API. Use /predict_all to get predictions."})

# Define a route for predicting indoor humidity for all sensors
@app.route('/predict_all', methods=['GET'])
def predict_all():
    try:
        from predictionModel import predictions_cache  # Import the predictions cache from predictionModel
        return jsonify(predictions_cache)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
