import React from "react";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa"; // Import icons
import { deleteMappedSensor } from "../Service";

// Define or import the Reading interface
interface Reading {
  date: string;
  average_value: number;
  entry_count: number;
}

interface Sensor {
  id: number;
  unique_identifier: string;
  label: string;
  count: number;
  latest_entry: string;
}

interface SensorGridProps {
  sensors: Sensor[];
  selectedSensors: Record<string, boolean>;
  setSelectedSensors: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setSensors: React.Dispatch<React.SetStateAction<Sensor[]>>;
  setSensorReadings: React.Dispatch<
    React.SetStateAction<Record<string, Reading[]>>
  >;
  setIsRenamePopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setRenamingSensorId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsMapPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleCheckboxChange: (id: string) => void;
}

const SensorGrid: React.FC<SensorGridProps> = ({
  sensors,
  selectedSensors,
  setSelectedSensors,
  setSensors,
  setSensorReadings,
  setIsRenamePopupVisible,
  setRenamingSensorId,
  setIsMapPopupVisible,
  handleCheckboxChange,
}) => {
  const isLatestReadingToday = (latestEntry: string) => {
    const today = new Date().toISOString().split("T")[0];
    return latestEntry.startsWith(today);
  };

  const handleRemoveSensor = async (
    sensorId: number,
    uniqueIdentifier: string
  ) => {
    try {
      await deleteMappedSensor(sensorId);
      setSensors((prev) =>
        prev.filter((s) => s.unique_identifier !== uniqueIdentifier)
      );
      setSensorReadings((prev) => {
        const updatedReadings = { ...prev };
        delete updatedReadings[uniqueIdentifier];
        return updatedReadings;
      });
      setSelectedSensors((prev) => {
        const updatedSelections = { ...prev };
        delete updatedSelections[uniqueIdentifier];
        return updatedSelections;
      });
    } catch (error) {
      console.error(`Error removing sensor with ID ${sensorId}:`, error);
    }
  };

  return (
    <div className="sensor-grid">
      <div
        className="sensor-box add-sensor"
        onClick={() => setIsMapPopupVisible(true)}
      >
        <FaPlus /> {/* Add icon */}
      </div>
      {sensors.map((sensor) => (
        <div
          key={sensor.unique_identifier}
          className="sensor-box"
          style={{
            backgroundColor: isLatestReadingToday(sensor.latest_entry)
              ? "green"
              : "red",
          }}
        >
          <div>
            <h4>
              {sensor.label}
              <button
                onClick={() => {
                  setRenamingSensorId(sensor.unique_identifier);
                  setIsRenamePopupVisible(true);
                }}
              >
                <FaEdit /> {/* Rename icon */}
              </button>
              <button
                onClick={() =>
                  handleRemoveSensor(sensor.id, sensor.unique_identifier)
                }
              >
                <FaTrash /> {/* Remove icon */}
              </button>
            </h4>
          </div>
          <p>Latest Reading: {sensor.latest_entry}</p>
          <p>Count: {sensor.count}</p>
          <label>
            <input
              type="checkbox"
              name={sensor.unique_identifier}
              checked={selectedSensors[sensor.unique_identifier] ?? false}
              onChange={() => handleCheckboxChange(sensor.unique_identifier)}
            />
            Select
          </label>
        </div>
      ))}
    </div>
  );
};

export default SensorGrid;
