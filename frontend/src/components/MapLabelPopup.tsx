import React from "react";
import { mapSensor } from "../Service";

const MapLabelPopup = ({
  mappingSensorLabel,
  setMappingSensorLabel,
  mappingSensorId,
  setMappingSensorId,
  setIsMapLabelPopupVisible,
  sensors,
  setSensors,
  availableSensors,
  setAvailableSensors,
}: any) => {
  const handleMapLabelSubmit = async () => {
    if (!mappingSensorId) return;
    try {
      const response = await mapSensor(mappingSensorId, mappingSensorLabel);

      const mappedSensor = availableSensors.find(
        (s: any) => s.unique_identifier === mappingSensorId
      );
      if (mappedSensor) {
        setSensors((prev: any) => [
          ...prev,
          {
            ...mappedSensor,
            id: response.id,
            label: mappingSensorLabel,
          },
        ]);
      }

      setAvailableSensors((prev: any) =>
        prev.filter((s: any) => s.unique_identifier !== mappingSensorId)
      );
      setIsMapLabelPopupVisible(false);
      setMappingSensorId(null);
      setMappingSensorLabel("");
    } catch (error) {
      console.error(`Error mapping sensor ${mappingSensorId}:`, error);
    }
  };

  return (
    <div className="popup">
      <div className="popup-content">
        <h3>Enter Sensor Label</h3>
        <input
          type="text"
          value={mappingSensorLabel}
          onChange={(e) => setMappingSensorLabel(e.target.value)}
        />
        <button onClick={handleMapLabelSubmit}>Save</button>
        <button
          onClick={() => {
            setIsMapLabelPopupVisible(false);
            setMappingSensorId(null);
            setMappingSensorLabel("");
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MapLabelPopup;
