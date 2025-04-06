import React from "react";
import { updateMapSensor } from "../Service";

const RenamePopup = ({
  newName,
  setNewName,
  renamingSensorId,
  sensors,
  setSensors,
  setIsRenamePopupVisible,
}: any) => {
  const handleRenameSubmit = async () => {
    if (renamingSensorId) {
      try {
        const sensor = sensors.find(
          (s: any) => s.unique_identifier === renamingSensorId
        );
        if (!sensor || !sensor.id) {
          console.error("Sensor ID not found for renaming");
          return;
        }
        await updateMapSensor(sensor.id, renamingSensorId, newName);
        setSensors((prev: any) =>
          prev.map((s: any) =>
            s.unique_identifier === renamingSensorId
              ? { ...s, label: newName }
              : s
          )
        );
        setIsRenamePopupVisible(false);
      } catch (error) {
        console.error(`Error renaming sensor ${renamingSensorId}:`, error);
      }
    }
  };

  return (
    <div className="popup">
      <div className="popup-content">
        <h3>Rename Sensor</h3>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={handleRenameSubmit}>Save</button>
        <button onClick={() => setIsRenamePopupVisible(false)}>Cancel</button>
      </div>
    </div>
  );
};

export default RenamePopup;
