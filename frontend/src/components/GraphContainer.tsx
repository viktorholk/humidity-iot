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

interface GraphContainerProps {
  selectedSensors: Record<string, boolean>;
  sensorReadings: Record<string, Reading[]>;
  sensors: Sensor[];
  outdoorHumidity: number | null;
}

const GraphContainer: React.FC<GraphContainerProps> = ({
  selectedSensors,
  sensorReadings,
  sensors,
  outdoorHumidity,
}) => {
  const generateCombinedChartData = () => {
    const selectedReadings = Object.entries(sensorReadings)
      .filter(([id]) => selectedSensors[id])
      .map(([_, readings]) => readings);

    const allDates = Array.from(
      new Set(
        selectedReadings.flatMap((readings) => readings.map((r) => r.date))
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

    if (outdoorHumidity) {
      datasets.push({
        label: "Outdoor Humidity",
        data: allDates.map(() => outdoorHumidity),
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
      <h3>Combined Sensor Readings:</h3>
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
