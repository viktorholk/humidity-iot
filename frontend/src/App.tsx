import { useState } from "react";
import "./App.css";
import "./Service";
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
import { useEffect } from "react";
import { getlastestreadings } from "./Service";

function App() {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
  useEffect(() => {
    getlastestreadings().then((result) => {
      const parsedData = {
        labels: result.map((item: any) => new Date(item.created_at).toLocaleString()),
        datasets: [
          {
            label: "Sensor Data",
            data: result.map((item: any) => parseFloat(item.value)),
            borderColor: "rgba(75,192,192,1)",
            backgroundColor: "rgba(75,192,192,0.2)",
            hidden: false,
          },
        ],
        hidden: false,
      };
      setData(parsedData);
    });
  }, []);

  interface Dataset {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    hidden: boolean;
  }
  
  interface ChartData {
    labels: string[];
    datasets: Dataset[];
  }
  
  const [data, setData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });

  const addDataset = () => {
    const newDataset = {
      label: `Dataset ${data.datasets.length + 1}`,
      data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
      borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
        Math.random() * 255
      )}, ${Math.floor(Math.random() * 255)}, 1)`,
      backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
        Math.random() * 255
      )}, ${Math.floor(Math.random() * 255)}, 0.2)`,
      hidden: false,
    };
    setData({
      ...data,
      datasets: [...data.datasets, newDataset],
    });
  };

  return (
    <>
      <div className="App">
        <header className="App-header">
          <button onClick={addDataset}>Add Dataset</button>
          <Line data={data} />
        </header>
        <div className="sensor-list">
          {data.datasets.map((dataset, index) => (
            <div key={index}>
              <input
                type="checkbox"
                checked={dataset.hidden !== true}
                onChange={() => {
                  const newDatasets = data.datasets.map((d, i) =>
                    i === index ? { ...d, hidden: !d.hidden } : d
                  );
                  setData({ ...data, datasets: newDatasets });
                }}
              />
              <label>{dataset.label}</label>
            </div>
          ))}
        </div>

        <div>
          <h2>Chart Data</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>

        </div>

        <div>
          <h2>offline sensors</h2>
          <ul>
            {data.datasets.map((dataset, index) => (
              <li key={index}>
                {dataset.label}: {dataset.data[dataset.data.length - 1]}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            import("./Service").then((service) => {
              service.getSensoners().then((result) => {
          console.log(result);
              });
            });
          }}
        >
          Call Service
        </button>
      </div>
    </>
  );
}

export default App;
