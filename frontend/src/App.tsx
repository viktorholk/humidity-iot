import { useState, useEffect } from "react";
import "./App.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getSensors, getSensorReadingsByMacAddress, renameSensor } from "./Service"; // Import renameSensor

function App() {
  interface Sensor {
    unique_identifier: string;
    count: number;
    latest_entry: string;
  }

  interface Reading {
    date: string;
    average_value: number;
    entry_count: number;
  }

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<Record<string, boolean>>({});
  const [sensorReadings, setSensorReadings] = useState<Record<string, Reading[]>>({});
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);
  const [isRenamePopupVisible, setIsRenamePopupVisible] = useState(false); // State for popup visibility
  const [renamingSensorId, setRenamingSensorId] = useState<string | null>(null); // Track sensor being renamed
  const [newName, setNewName] = useState<string>(""); // Track the new name for the sensor

  useEffect(() => {
    async function fetchSensors() {
      try {
        const response = await getSensors();
        const sensorData = response.entries_by_identifier || [];
        setSensors(sensorData);

        const initialSelection = sensorData.reduce((acc: Record<string, boolean>, sensor: Sensor) => {
          acc[sensor.unique_identifier] = false;
          return acc;
        }, {});
        setSelectedSensors(initialSelection);
      } catch (error) {
        console.error("Error fetching sensors:", error);
      }
    }

    fetchSensors();
  }, []);

  const handleRenameClick = (id: string) => {
    setRenamingSensorId(id); // Set the sensor being renamed
    const sensor = sensors.find((sensor) => sensor.unique_identifier === id);
    if (sensor) {
      setNewName(sensor.unique_identifier); // Pre-fill the input with the current name
    }
    setIsRenamePopupVisible(true); // Show the popup
  };

  const handleRenameSubmit = async () => {
    if (renamingSensorId) {
      try {
        await renameSensor(renamingSensorId, newName); // Call the rename service
        setSensors((prev) =>
          prev.map((sensor) =>
            sensor.unique_identifier === renamingSensorId
              ? { ...sensor, unique_identifier: newName }
              : sensor
          )
        );
        setIsRenamePopupVisible(false); // Hide the popup
        setRenamingSensorId(null); // Clear the renaming state
        setNewName(""); // Clear the input field
      } catch (error) {
        console.error(`Error renaming sensor ${renamingSensorId}:`, error);
      }
    }
  };

  const handleCheckboxChange = async (id: string) => {
    setSelectedSensors((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    if (!selectedSensors[id]) {
      try {
        const response = await getSensorReadingsByMacAddress(id);
        setSensorReadings((prev) => ({
          ...prev,
          [id]: response[id] || [],
        }));
      } catch (error) {
        console.error(`Error fetching readings for sensor ${id}:`, error);
      }
    } else {
      setSensorReadings((prev) => {
        const updatedReadings = { ...prev };
        delete updatedReadings[id];
        return updatedReadings;
      });
    }
  };

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const generateCombinedChartData = () => {
    const selectedReadings = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([id, readings]) => readings);

    const allDates = Array.from(
      new Set(selectedReadings.flatMap((readings) => readings.map((reading) => reading.date)))
    ).sort();

    const datasets = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([id, readings]) => ({
        label: id,
        data: allDates.map((date) => {
          const reading = readings.find((r) => r.date === date);
          return reading ? reading.average_value : null;
        }),
        borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 1)`,
        backgroundColor: "rgba(0, 0, 0, 0)",
        tension: 0.4,
      }));

    return {
      labels: allDates,
      datasets,
    };
  };

  const toggleGridCollapse = () => {
    setIsGridCollapsed((prev) => !prev);
  };

  const isLatestReadingToday = (latestEntry: string) => {
    const today = new Date().toISOString().split("T")[0];
    return latestEntry.startsWith(today);
  };

  return (
    <>
      <div className="App">
        <h1>Sensor Selection</h1>
        <button onClick={toggleGridCollapse}>
          {isGridCollapsed ? "Expand Grid" : "Collapse Grid"}
        </button>
        {!isGridCollapsed && (
          <div className="sensor-grid">
            {sensors.map((sensor) => (
              <div
                key={sensor.unique_identifier}
                className="sensor-box"
                style={{
                  backgroundColor: isLatestReadingToday(sensor.latest_entry) ? "green" : "red",
                }}
              >
                <div>
                  <h4>
                    {sensor.unique_identifier}{" "}
                    <button onClick={() => handleRenameClick(sensor.unique_identifier)}>Rename</button>
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
        )}
        <div className="graph-container">
          <h3>Combined Sensor Readings:</h3>
          <Line
            className="graph"
            data={generateCombinedChartData()}
            options={{
              responsive: true,
              spanGaps: true,
              plugins: {
                legend: {
                  position: "top",
                },
                title: {
                  display: true,
                  text: "Combined Sensor Readings",
                },
              },
            }}
          />
        </div>
      </div>

      {isRenamePopupVisible && (
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
      )}
    </>
  );
}

export default App;
