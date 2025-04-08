import React from "react";

interface PredictionsProps {
  selectedSensors: Record<string, boolean>;
  predictions: Record<string, number>;
  sensors: { unique_identifier: string; label: string }[];
  tomorrowOutdoorHumidity: number | null;
}

const Predictions: React.FC<PredictionsProps> = ({
  selectedSensors,
  predictions,
  sensors,
  tomorrowOutdoorHumidity,
}) => {
  return (
    <div className="predictions-container">
      <h2>Predictions for Tomorrow</h2>
      <ul>
        {Object.keys(selectedSensors)
          .filter((id) => selectedSensors[id] && predictions[id] !== undefined)
          .map((id) => (
            <li key={id}>
              {sensors.find((sensor) => sensor.unique_identifier === id)?.label || id}:{" "}
              {predictions[id].toFixed(2)}%
            </li>
          ))}
        {tomorrowOutdoorHumidity !== null && (
          <li key="outdoor-humidity">Outdoor Humidity: {tomorrowOutdoorHumidity.toFixed(2)}%</li>
        )}
      </ul>
    </div>
  );
};

export default Predictions;
