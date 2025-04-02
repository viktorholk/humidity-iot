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
} from "./Service";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Move all hooks to the top level
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<
    Record<string, boolean>
  >({});
  const [sensorReadings, setSensorReadings] = useState<
    Record<string, Reading[]>
  >({});
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);
  const [isRenamePopupVisible, setIsRenamePopupVisible] = useState(false);
  const [renamingSensorId, setRenamingSensorId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [outdoorHumidity, setOutdoorHumidity] = useState<number | null>(null);
  const [isMapPopupVisible, setIsMapPopupVisible] = useState(false);
  const [availableSensors, setAvailableSensors] = useState<Sensor[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      setIsAuthenticated(true); // Automatically log in if token exists
    }
  }, []);

  useEffect(() => {
    async function fetchMappedSensors() {
      try {
        const allSensorsResponse = await getSensors(); // Fetch all sensors with full details
        const mappedResponse = await getmapedSensors(); // Fetch already mapped sensors

        const mappedIdentifiers = new Set(
          mappedResponse.map((sensor: any) => sensor.unique_identifier)
        ); // Create a set of mapped sensor identifiers

        const mappedSensors = allSensorsResponse.entries_by_identifier.filter(
          (sensor: any) => mappedIdentifiers.has(sensor.unique_identifier)
        ); // Filter sensors to only include mapped ones

        setSensors(mappedSensors); // Set the sensors state

        const initialSelection = mappedSensors.reduce(
          (acc: Record<string, boolean>, sensor: Sensor) => {
            acc[sensor.unique_identifier] = false;
            return acc;
          },
          {}
        );
        setSelectedSensors(initialSelection); // Initialize the selection state
      } catch (error) {
        console.error("Error fetching mapped sensors:", error);
      }
    }

    fetchMappedSensors(); // Call the function on component mount
  }, []);

  useEffect(() => {
    async function fetchOutdoorHumidity() {
      try {
        const response = await getOutdoorHumidity(52.52, 13.41); // Example coordinates
        setOutdoorHumidity(response.meanHumidity);
      } catch (error) {
        console.error("Error fetching outdoor humidity:", error);
      }
    }

    fetchOutdoorHumidity();
  }, []);

  const handleLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
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
        <button onClick={() => setIsRegistering(false)}>Back to Login</button>
      </div>
    );
  }

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
        await updateMapSensor(renamingSensorId, newName); // Call the rename service
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

  const handleMapButtonClick = async () => {
    try {
      const allSensorsResponse = await getSensors(); // Fetch all available sensors
      const mappedResponse = await getmapedSensors(); // Fetch already mapped sensors

      const mappedIdentifiers = new Set(
        mappedResponse.map((sensor: any) => sensor.unique_identifier)
      ); // Create a set of mapped sensor identifiers

      const unmappedSensors = allSensorsResponse.entries_by_identifier.filter(
        (sensor: any) => !mappedIdentifiers.has(sensor.unique_identifier)
      ); // Filter out already mapped sensors

      setAvailableSensors(unmappedSensors); // Set the available sensors
      setIsMapPopupVisible(true); // Show the popup
    } catch (error) {
      console.error("Error fetching available sensors:", error);
      setAvailableSensors([]); // Fallback to an empty array
    }
  };

  const handleMapSensor = async (sensorId: string) => {
    try {
      const sensorLabel =
        prompt("Enter a label for the sensor:") || "Unnamed Sensor";
      await mapSensor(sensorId, sensorLabel); // Call the map sensor service with label
      setSensors((prev) => [
        ...prev,
        availableSensors.find((s) => s.unique_identifier === sensorId)!,
      ]);
      setAvailableSensors((prev) =>
        prev.filter((s) => s.unique_identifier !== sensorId)
      );
    } catch (error) {
      console.error(`Error mapping sensor ${sensorId}:`, error);
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
      new Set(
        selectedReadings.flatMap((readings) =>
          readings.map((reading) => reading.date)
        )
      )
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

    // Add outdoor humidity as a separate dataset
    if (outdoorHumidity && Array.isArray(outdoorHumidity)) {
      datasets.push({
        label: "Outdoor Humidity",
        data: allDates.map((_, index) => outdoorHumidity[index] ?? null), // Map outdoor humidity to corresponding dates
        borderColor: "rgba(0, 123, 255, 1)", // Blue color for outdoor humidity
        backgroundColor: "rgba(0, 0, 0, 0)",
        tension: 0.4,
      });
    }

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
        <button onClick={handleMapButtonClick}>Add Sensor</button>
        {!isGridCollapsed && (
          <div className="sensor-grid">
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
                    {sensor.unique_identifier}{" "}
                    <button
                      onClick={() =>
                        handleRenameClick(sensor.unique_identifier)
                      }
                    >
                      Rename
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
                    onChange={() =>
                      handleCheckboxChange(sensor.unique_identifier)
                    }
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
            <button onClick={() => setIsRenamePopupVisible(false)}>
              Cancel
            </button>
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
                  <button
                    onClick={() => handleMapSensor(sensor.unique_identifier)}
                  >
                    Map
                  </button>
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
