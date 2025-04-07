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
import React from "react";
import { Line } from "react-chartjs-2";

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Sensor {
  id: number;
  unique_identifier: string;
  label: string;
  count: number;
  latest_entry: string;
}

interface Reading {
  date: string;
  average_value: number;
  entry_count: number;
}

interface OutdoorHumidityEntry {
  date: string;
  value: number;
}

interface GraphContainerProps {
  selectedSensors: Record<string, boolean>;
  sensorReadings: Record<string, Reading[]>;
  sensors: Sensor[];
  outdoorHumidity: OutdoorHumidityEntry[];
  daysToLookBack: number;
  onDaysToLookBackChange: (days: number) => void;
}

const GraphContainer: React.FC<GraphContainerProps> = ({
  selectedSensors,
  sensorReadings,
  sensors,
  outdoorHumidity,
  daysToLookBack,
  onDaysToLookBackChange,
}) => {
  const generateCombinedChartData = () => {
    const selectedReadings = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([_, readings]) => readings);

    const allDates = Array.from(
      new Set(
        selectedReadings
          .flatMap((readings) => readings.map((r) => r.date))
          .concat(outdoorHumidity.map((entry) => entry.date)) // Include outdoor humidity dates
      )
    ).sort();

    const datasets = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([id, readings]) => {
        const sensor = sensors.find((s) => s.unique_identifier === id);
        return {
          label: sensor?.label || id,
          data: allDates.map(
            (date) =>
              readings.find((r) => r.date === date)?.average_value || null
          ),
          borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
            Math.random() * 255
          }, 1)`,
          backgroundColor: "rgba(0, 0, 0, 0)",
          tension: 0.4,
        };
      });

    if (outdoorHumidity.length > 0) {
      datasets.push({
        label: "Outdoor Humidity",
        data: allDates.map(
          (date) =>
            outdoorHumidity.find((entry) => entry.date === date)?.value || null
        ),
        borderColor: "rgba(0, 123, 255, 1)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        tension: 0.4,
      });
    }

    return { labels: allDates, datasets };
  };

  const chartData = generateCombinedChartData();

  return (
    <div className="graph-container">
      <div className="graph-header">
        <h3>Combined Sensor Readings:</h3>
        <div className="dropdown-container">
          <label htmlFor="days-dropdown">Days to look back:</label>
          <select
            id="days-dropdown"
            value={daysToLookBack}
            onChange={(e) => onDaysToLookBackChange(Number(e.target.value))}
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
      </div>
      {Object.values(selectedSensors).some((isSelected) => isSelected) ? (
        chartData.labels.length > 0 ? (
          <Line
            id="chart-id"
            className="graph"
            data={chartData}
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
          <p>No data available to display.</p>
        )
      ) : (
        <p>Please select at least one sensor to view the graph.</p>
      )}
    </div>
  );
};

export default GraphContainer;
