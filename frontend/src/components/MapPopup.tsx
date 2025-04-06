import React from "react";

const MapPopup = ({
  availableSensors,
  setAvailableSensors,
  setMappingSensorId,
  setIsMapLabelPopupVisible,
  setIsMapPopupVisible,
}: any) => {
  return (
    <div className="popup">
      <div className="popup-content">
        <h3>Map a Sensor</h3>
        {availableSensors.length > 0 ? (
          <ul>
            {availableSensors.map((sensor: any) => (
              <li key={sensor.unique_identifier}>
                {sensor.unique_identifier}
                <button
                  onClick={() => {
                    setMappingSensorId(sensor.unique_identifier);
                    setIsMapLabelPopupVisible(true);
                  }}
                >
                  Map
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No available sensors to map.</p>
        )}
        <button onClick={() => setIsMapPopupVisible(false)}>Close</button>
      </div>
    </div>
  );
};

export default MapPopup;
