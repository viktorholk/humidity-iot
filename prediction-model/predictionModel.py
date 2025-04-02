import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import joblib

# Load your historical data
# Ensure you have a CSV file with columns: 'date', 'indoor_humidity', 'outdoor_humidity'
data = pd.read_csv('humidity_data.csv')

# Feature engineering: Create lag features for outdoor humidity
data['outdoor_humidity_lag1'] = data['outdoor_humidity'].shift(1)
data['outdoor_humidity_lag2'] = data['outdoor_humidity'].shift(2)
data['outdoor_humidity_lag3'] = data['outdoor_humidity'].shift(3)

# Drop rows with NaN values caused by lagging
data = data.dropna()

# Define features (X) and target (y)
X = data[['outdoor_humidity', 'outdoor_humidity_lag1', 'outdoor_humidity_lag2', 'outdoor_humidity_lag3']]
y = data['indoor_humidity']

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train a Random Forest Regressor
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate the model
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
print(f"Mean Squared Error: {mse}")

# Save the model for future use
joblib.dump(model, 'humidity_prediction_model.pkl')

# Function to predict indoor humidity based on outdoor humidity predictions
def predict_indoor_humidity(outdoor_humidity_forecast):
    # Ensure the input is a list of the last 4 outdoor humidity values
    if len(outdoor_humidity_forecast) != 4:
        raise ValueError("Input must be a list of the last 4 outdoor humidity values.")
    
    # Prepare the input for prediction as a DataFrame with the correct feature names
    input_data = pd.DataFrame([outdoor_humidity_forecast], columns=[
        'outdoor_humidity', 'outdoor_humidity_lag1', 'outdoor_humidity_lag2', 'outdoor_humidity_lag3'
    ])
    prediction = model.predict(input_data)
    return prediction[0]

# Example usage
# Replace with actual outdoor humidity predictions from the weather API
example_forecast = [68, 70, 72, 74]  # Last 4 outdoor humidity predictions
predicted_indoor_humidity = predict_indoor_humidity(example_forecast)
print(f"Predicted Indoor Humidity: {predicted_indoor_humidity}")