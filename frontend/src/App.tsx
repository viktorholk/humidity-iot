import { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
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
import {
  getSensors,
  getSensorReadingsByMacAddress,
  mapSensor,
  updateMapSensor,
  getOutdoorHumidity,
  getmapedSensors,
  deleteMappedSensor,
} from "./Service";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<Record<string, boolean>>({});
  const [sensorReadings, setSensorReadings] = useState<Record<string, Reading[]>>({});
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);
  const [isRenamePopupVisible, setIsRenamePopupVisible] = useState(false);
  const [renamingSensorId, setRenamingSensorId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [outdoorHumidity, setOutdoorHumidity] = useState<number | null>(null);
  const [isMapPopupVisible, setIsMapPopupVisible] = useState(false);
  const [availableSensors, setAvailableSensors] = useState<Sensor[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return; // Prevent API call if not authenticated
    const fetchMappedSensors = async () => {
      try {
        const allSensors = await getSensors();
        const mappedSensors = await getmapedSensors();
        const mappedIdentifiers = new Set(mappedSensors.map((s: any) => s.unique_identifier));
        const filteredSensors = allSensors.entries_by_identifier.filter((s: any) =>
          mappedIdentifiers.has(s.unique_identifier)
        );
        setSensors(
          filteredSensors.map((sensor: any) => {
            const mappedSensor = mappedSensors.find(
              (m: any) => m.unique_identifier === sensor.unique_identifier
            );
            return {
              id: mappedSensor?.id, // Include the id from the mapped sensor
              unique_identifier: sensor.unique_identifier,
              label: mappedSensor?.label || `Sensor ${sensor.unique_identifier}`, // Use the mapped label or a default name
              count: sensor.count,
              latest_entry: sensor.latest_entry,
            };
          })
        );
        setSelectedSensors(
          filteredSensors.reduce((acc: Record<string, boolean>, sensor: Sensor) => {
            acc[sensor.unique_identifier] = false;
            return acc;
          }, {})
        );
      } catch (error) {
        console.error("Error fetching mapped sensors:", error);
      }
    };
    fetchMappedSensors();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return; // Prevent API call if not authenticated
    const fetchOutdoorHumidity = async () => {
      try {
        const response = await getOutdoorHumidity(52.52, 13.41);
        setOutdoorHumidity(response.meanHumidity);
      } catch (error) {
        console.error("Error fetching outdoor humidity:", error);
      }
    };
    fetchOutdoorHumidity();
  }, [isAuthenticated]);

  const handleLoginSuccess = (token: string) => setIsAuthenticated(true);

  const handleRenameClick = (id: string) => {
    setRenamingSensorId(id);
    const sensor = sensors.find((sensor) => sensor.unique_identifier === id);
    if (sensor) {
      setNewName(sensor.label); // Pre-fill the input with the current label
    }
    setIsRenamePopupVisible(true);
  };

  const handleMapButtonClick = async () => {
    if (!isAuthenticated) return; // Prevent API call if not authenticated
    try {
      const allSensorsResponse = await getSensors();
      const mappedResponse = await getmapedSensors();

      const mappedIdentifiers = new Set(
        mappedResponse.map((sensor: any) => sensor.unique_identifier)
      );

      const unmappedSensors = allSensorsResponse.entries_by_identifier.filter(
        (sensor: any) => !mappedIdentifiers.has(sensor.unique_identifier)
      );

      setAvailableSensors(unmappedSensors);
      setIsMapPopupVisible(true);
    } catch (error) {
      console.error("Error fetching available sensors:", error);
      setAvailableSensors([]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        {isRegistering ? (
          <Register onSwitchToLogin={() => setIsRegistering(false)} />
        ) : (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setIsRegistering(true)}
          />
        )}
      </div>
    );
  }

  interface Sensor {
    id: number;
    unique_identifier: string;
    label: string; // Added label property
    count: number;
    latest_entry: string;
  }

  interface Reading {
    date: string;
    average_value: number;
    entry_count: number;
  }

  const handleRenameSubmit = async () => {
    if (renamingSensorId) {
      try {
        const sensor = sensors.find((s) => s.unique_identifier === renamingSensorId);
        if (!sensor || !sensor.id) {
          console.error("Sensor ID not found for renaming");
          return;
        }
        await updateMapSensor(sensor.id, renamingSensorId, newName);
        setSensors((prev) =>
          prev.map((s) =>
            s.unique_identifier === renamingSensorId
              ? { ...s, label: newName } // Update the label
              : s
          )
        );
        setIsRenamePopupVisible(false);
        setRenamingSensorId(null);
        setNewName("");
      } catch (error) {
        console.error(`Error renaming sensor ${renamingSensorId}:`, error);
      }
    }
  };

  const handleCheckboxChange = async (id: string) => {
    if (!isAuthenticated) return; // Prevent API call if not authenticated
    setSelectedSensors((prev) => ({ ...prev, [id]: !prev[id] }));
    if (!selectedSensors[id]) {
      try {
        const response = await getSensorReadingsByMacAddress(id);
        setSensorReadings((prev) => ({ ...prev, [id]: response[id] || [] }));
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

  const handleMapSensor = async (sensorId: string) => {
    try {
      const sensorLabel = prompt("Enter a label for the sensor:") || "Unnamed Sensor";
      const response = await mapSensor(sensorId, sensorLabel); // Get the response from the API

      const mappedSensor = availableSensors.find((s) => s.unique_identifier === sensorId);
      if (mappedSensor) {
        setSensors((prev) => [
          ...prev,
          {
            ...mappedSensor,
            id: response.id, // Set the ID from the API response
            label: sensorLabel, // Save the label to the sensor
          },
        ]);
      }

      setAvailableSensors((prev) =>
        prev.filter((s) => s.unique_identifier !== sensorId)
      );
    } catch (error) {
      console.error(`Error mapping sensor ${sensorId}:`, error);
    }
  };

  const handleRemoveSensor = async (sensorId: string) => {
    try {
      const sensor = sensors.find((s) => s.unique_identifier === sensorId);
      if (!sensor || !sensor.id) {
        console.error("Sensor ID not found for removal");
        return;
      }
      await deleteMappedSensor(sensor.id); // Call the service to delete the sensor
      setSensors((prev) => prev.filter((s) => s.unique_identifier !== sensorId)); // Remove from state
    } catch (error) {
      console.error(`Error removing sensor ${sensorId}:`, error);
    }
  };

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

  const generateCombinedChartData = () => {
    const selectedReadings = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([_, readings]) => readings);

    const allDates = Array.from(
      new Set(selectedReadings.flatMap((readings) => readings.map((r) => r.date)))
    ).sort();

    const datasets = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([id, readings]) => {
        const sensor = sensors.find((s) => s.unique_identifier === id);
        return {
          label: sensor?.label || id, // Use the label or fallback to unique_identifier
          data: allDates.map((date) => readings.find((r) => r.date === date)?.average_value || null),
          borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
          backgroundColor: "rgba(0, 0, 0, 0)",
          tension: 0.4,
        };
      });

    if (outdoorHumidity && Array.isArray(outdoorHumidity)) {
      datasets.push({
        label: "Outdoor Humidity",
        data: allDates.map((_, index) => outdoorHumidity[index] ?? null),
        borderColor: "rgba(0, 123, 255, 1)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        tension: 0.4,
      });
    }

    return { labels: allDates, datasets };
  };

  const toggleGridCollapse = () => setIsGridCollapsed((prev) => !prev);

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
          <button onClick={handleMapButtonClick}>Add Sensor</button>
        )}
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
                    {sensor.label}{" "} {/* Display the sensor name (label) */}
                    <button onClick={() => handleRenameClick(sensor.unique_identifier)}>
                      Rename
                    </button>
                    <button onClick={() => handleRemoveSensor(sensor.unique_identifier)}>
                      Remove
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
        )}
        <div className="graph-container">
          <h3>Combined Sensor Readings:</h3>
          {Object.values(selectedSensors).some((isSelected) => isSelected) ? (
            <Line
              className="graph"
              data={generateCombinedChartData()}
              options={{
                responsive: true,
                spanGaps: true,
                plugins: {
                  legend: { position: "top" },
                  title: { display: true, text: "Combined Sensor Readings" },
                },
              }}
            />
          ) : (
            <p>Please select at least one sensor to view the graph.</p>
          )}
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

      {isMapPopupVisible && (
        <div className="popup">
          <div className="popup-content">
            <h3>Map a Sensor</h3>
            <ul>
              {availableSensors.map((sensor) => (
                <li key={sensor.unique_identifier}>
                  {sensor.unique_identifier}
                  <button onClick={() => handleMapSensor(sensor.unique_identifier)}>Map</button>
                </li>
              ))}
            </ul>
            <button onClick={() => setIsMapPopupVisible(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
