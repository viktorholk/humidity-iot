import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import threading
import time
from flask import Flask, jsonify
from flask_cors import CORS  # Import CORS

# Global variable to store predictions
predictions_cache = {}

# Function to train a model and predict the next indoor humidity for a sensor
def predict_next_humidity(sensor_identifier):
    from service import fetch_sensor_data  # Import from service.py
    data = fetch_sensor_data(sensor_identifier)
    
    # Feature engineering: Create lag features for indoor humidity
    data['indoor_humidity_lag1'] = data['indoor_humidity'].shift(1)
    data['indoor_humidity_lag2'] = data['indoor_humidity'].shift(2)
    data['indoor_humidity_lag3'] = data['indoor_humidity'].shift(3)
    
    # Drop rows with NaN values caused by lagging
    data = data.dropna()
    
    # Define features (X) and target (y)
    X = data[['indoor_humidity_lag1', 'indoor_humidity_lag2', 'indoor_humidity_lag3']]
    y = data['indoor_humidity']
    
    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train a Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate the model
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    print(f"Sensor {sensor_identifier} - Mean Squared Error: {mse}")
    
    # Predict the next indoor humidity based on the last 3 days
    last_days_humidity = X.iloc[-1].values.tolist()
    next_humidity = model.predict([last_days_humidity])[0]
    return next_humidity

# Function to update predictions once every day
def update_predictions():
    global predictions_cache
    while True:
        try:
            from service import auto_login, fetch_all_sensors  # Import from service.py
            auto_login()  # Log in to get a new JWT token
            
            # Fetch all sensors
            sensors = fetch_all_sensors()
            if not sensors:
                raise ValueError("No sensors found in the API response.")
            
            # Generate predictions for all sensors
            new_predictions = {}
            for sensor in sensors:
                unique_identifier = sensor['unique_identifier']
                try:
                    next_humidity = predict_next_humidity(unique_identifier)
                    new_predictions[unique_identifier] = next_humidity
                except Exception as e:
                    new_predictions[unique_identifier] = f"Error: {str(e)}"
            
            # Update the global predictions cache
            predictions_cache = new_predictions
            print("Predictions updated successfully.")
        except Exception as e:
            print(f"Error updating predictions: {str(e)}")
        
        # Wait for 24 hours before the next update
        time.sleep(86400)

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
        return jsonify(predictions_cache)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    try:
        from service import auto_login, fetch_sensor_data  # Import from service.py
        auto_login()  # Ensure login is successful
        test_sensor_id = "B0:8D:7B:84:21:78"  # Replace with a valid sensor ID
        print("Testing fetch_sensor_data during startup...", flush=True)
        fetch_sensor_data(test_sensor_id, days=30)
    except Exception as e:
        print(f"Error during startup test: {str(e)}", flush=True)

    # Start the update_predictions function in a separate thread
    threading.Thread(target=update_predictions, daemon=True).start()

    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)