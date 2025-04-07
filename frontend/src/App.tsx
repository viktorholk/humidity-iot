import { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa"; // Import icons
import Login from "./Login";
import Register from "./Register";
import SensorGrid from "./components/SensorGrid";
import GraphContainer from "./components/GraphContainer";
import RenamePopup from "./components/RenamePopup";
import MapPopup from "./components/MapPopup";
import MapLabelPopup from "./components/MapLabelPopup";
import {
  getSensors,
  getmapedSensors,
  getOutdoorHumidity,
  getSensorReadingsByMacAddress,
} from "./Service";
import "./App.css";

interface Sensor {
  id: number;
  unique_identifier: string;
  label: string;
  count: number;
  latest_entry: string;
}

// Define or import the Reading interface
interface Reading {
  date: string;
  average_value: number;
  entry_count: number;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
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
  const [outdoorHumidity, setOutdoorHumidity] = useState<
    { date: string; value: number }[]
  >([]);
  const [isMapPopupVisible, setIsMapPopupVisible] = useState(false);
  const [availableSensors, setAvailableSensors] = useState<Sensor[]>([]);
  const [isMapLabelPopupVisible, setIsMapLabelPopupVisible] = useState(false);
  const [mappingSensorId, setMappingSensorId] = useState<string | null>(null);
  const [mappingSensorLabel, setMappingSensorLabel] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | undefined>(
    undefined
  );
  const [daysToLookBack, setDaysToLookBack] = useState(7); // Add state for days to look back

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchMappedSensors = async () => {
      try {
        const allSensors = await getSensors();
        const mappedSensors = await getmapedSensors();
        const mappedIdentifiers = new Set(
          mappedSensors.map((s: any) => s.unique_identifier)
        );
        const filteredSensors = allSensors.entries_by_identifier.filter(
          (s: any) => mappedIdentifiers.has(s.unique_identifier)
        );
        setSensors(
          filteredSensors.map((sensor: any) => {
            const mappedSensor = mappedSensors.find(
              (m: any) => m.unique_identifier === sensor.unique_identifier
            );
            return {
              id: mappedSensor?.id,
              unique_identifier: sensor.unique_identifier,
              label:
                mappedSensor?.label || `Sensor ${sensor.unique_identifier}`,
              count: sensor.count,
              latest_entry: sensor.latest_entry,
            };
          })
        );
        setSelectedSensors(
          filteredSensors.reduce(
            (acc: Record<string, boolean>, sensor: Sensor) => {
              acc[sensor.unique_identifier] = false;
              return acc;
            },
            {}
          )
        );
      } catch (error) {
        console.error("Error fetching mapped sensors:", error);
      }
    };
    fetchMappedSensors();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchOutdoorHumidity = async () => {
      try {
        const response = await getOutdoorHumidity(52.52, 13.41, daysToLookBack);
        setOutdoorHumidity(response); // Store the daily humidity data
      } catch (error) {
        console.error("Error fetching outdoor humidity:", error);
      }
    };
    fetchOutdoorHumidity();
  }, [isAuthenticated, daysToLookBack]); // Add daysToLookBack as a dependency

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchAvailableSensors = async () => {
      try {
        const allSensors = await getSensors();
        const mappedSensors = await getmapedSensors();
        const mappedIdentifiers = new Set(
          mappedSensors.map((s: any) => s.unique_identifier)
        );
        const unmappedSensors = allSensors.entries_by_identifier.filter(
          (s: any) => !mappedIdentifiers.has(s.unique_identifier)
        );
        setAvailableSensors(unmappedSensors);
      } catch (error) {
        console.error("Error fetching available sensors:", error);
      }
    };
    fetchAvailableSensors();
  }, [isAuthenticated, isMapPopupVisible]);

  const handleCheckboxChange = async (id: string) => {
    if (!isAuthenticated) return;

    setSelectedSensors((prev) => {
      const isSelected = !prev[id];

      if (isSelected) {
        getSensorReadingsByMacAddress(id, daysToLookBack)
          .then((response) => {
            setSensorReadings((prevReadings) => ({
              ...prevReadings,
              [id]: response[id] || [],
            }));
          })
          .catch((error) => {
            console.error(`Error fetching readings for sensor ${id}:`, error);
          });
      } else {
        setSensorReadings((prevReadings) => {
          const updatedReadings = { ...prevReadings };
          delete updatedReadings[id];
          return updatedReadings;
        });
      }

      return { ...prev, [id]: isSelected };
    });
  };

  const handleDaysToLookBackChange = (days: number) => {
    setDaysToLookBack(days);

    // Fetch updated readings for all selected sensors
    Object.keys(selectedSensors).forEach((id) => {
      if (selectedSensors[id]) {
        getSensorReadingsByMacAddress(id, days)
          .then((response) => {
            setSensorReadings((prevReadings) => ({
              ...prevReadings,
              [id]: response[id] || [],
            }));
          })
          .catch((error) => {
            console.error(`Error fetching readings for sensor ${id}:`, error);
          });
      }
    });
  };

  const handleLoginSuccess = () => setIsAuthenticated(true);

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        {isRegistering ? (
          <Register
            onSwitchToLogin={(message) => {
              setIsRegistering(false);
              setSuccessMessage(message);
            }}
          />
        ) : (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setIsRegistering(true)}
            successMessage={successMessage}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="App">
        <h1>Sensor Selection</h1>
        <button
          className={`dropdown-button ${isGridCollapsed ? "collapsed" : ""}`}
          onClick={() => setIsGridCollapsed((prev) => !prev)}
        >
          {isGridCollapsed ? <FaChevronDown /> : <FaChevronUp />}
        </button>
        <div
          className={`sensor-grid-container ${
            isGridCollapsed ? "collapsed" : "expanded"
          }`}
        >
          {!isGridCollapsed && (
            <SensorGrid
              sensors={sensors}
              selectedSensors={selectedSensors}
              setSelectedSensors={setSelectedSensors}
              setSensors={setSensors}
              setSensorReadings={setSensorReadings}
              setIsRenamePopupVisible={setIsRenamePopupVisible}
              setRenamingSensorId={setRenamingSensorId}
              setIsMapPopupVisible={setIsMapPopupVisible}
              handleCheckboxChange={handleCheckboxChange}
            />
          )}
        </div>
        <GraphContainer
          selectedSensors={selectedSensors}
          sensorReadings={sensorReadings}
          sensors={sensors}
          outdoorHumidity={outdoorHumidity}
          daysToLookBack={daysToLookBack}
          onDaysToLookBackChange={handleDaysToLookBackChange}
        />
      </div>

      {isRenamePopupVisible && (
        <RenamePopup
          newName={newName}
          setNewName={setNewName}
          renamingSensorId={renamingSensorId}
          sensors={sensors}
          setSensors={setSensors}
          setIsRenamePopupVisible={setIsRenamePopupVisible}
        />
      )}

      {isMapPopupVisible && (
        <MapPopup
          availableSensors={availableSensors}
          setAvailableSensors={setAvailableSensors}
          setMappingSensorId={setMappingSensorId}
          setIsMapLabelPopupVisible={setIsMapLabelPopupVisible}
          setIsMapPopupVisible={setIsMapPopupVisible}
        />
      )}

      {isMapLabelPopupVisible && (
        <MapLabelPopup
          mappingSensorLabel={mappingSensorLabel}
          setMappingSensorLabel={setMappingSensorLabel}
          mappingSensorId={mappingSensorId}
          setMappingSensorId={setMappingSensorId}
          setIsMapLabelPopupVisible={setIsMapLabelPopupVisible}
          sensors={sensors}
          setSensors={setSensors}
          availableSensors={availableSensors}
          setAvailableSensors={setAvailableSensors}
        />
      )}
    </>
  );
}

export default App;
