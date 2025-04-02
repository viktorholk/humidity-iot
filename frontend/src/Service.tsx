const API_BASE_URL = "http://iot.holk.solutions:3000"; // Replace with your API base URL

const getAuthHeaders = () => {
  const token = localStorage.getItem("jwtToken"); // Retrieve token from localStorage
  return token ? { Authorization: `Bearer ${token}` } : { Authorization: "" };
};

export const registerUser = async (username: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response from registerUser:", data); // Log the response for debugging
    return data; // Assuming the API returns a JSON response
  } catch (error) {
    console.error("Error during registration:", error);
    throw error;
  }
};

export const login = async (username: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};

export const getSensors = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}`); // Fetch all sensors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Response from getSensors:", data); // Debugging log
    return data; // Return the full response
  } catch (error) {
    console.error("Error fetching sensors:", error);
    throw error;
  }
};

export const mapSensor = async (unique_identifier: string, label: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/mappings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        unique_identifier,
        label,
      }),
    });
    if (!response.ok) {
      console.error(unique_identifier, label, getAuthHeaders());
      throw new Error(`HTTP error! status: ${(response.status, response)}`);
    }
    const data = await response.json();
    console.log("Response from mapSensor:", data); // Log the response for debugging
    return data; // Assuming the API returns a JSON response
  } catch (error) {
    console.error("Error mapping sensor:", error);
    throw error;
  }
};

export const getmapedSensors = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/mappings`, {
      headers: { ...getAuthHeaders() },
    }); // Fetch mapped sensors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Response from getmapedSensors:", data); // Debugging log
    return data; // Return the full response
  } catch (error) {
    console.error("Error fetching mapped sensors:", error);
    throw error;
  }
};

export const updateMapSensor = async (
  unique_identifier: string,
  label: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/mappings`, {
      method: "put",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        unique_identifier,
        label,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Response from mapSensor:", data); // Log the response for debugging
    return data; // Assuming the API returns a JSON response
  } catch (error) {
    console.error("Error mapping sensor:", error);
    throw error;
  }
};

// export const getlastestreadings = async () => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/entries?limit=10`, {
//       headers: getAuthHeaders(),
//     });
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     var data = await response.json();
//     console.log("Response from getlastestreadings:", data); // Log the response for debugging
//     return data;
//   } catch (error) {
//     console.error("Error fetching object from API:", error);
//     throw error;
//   }
// };

export const getSensorReadingsByMacAddress = async (
  macAdresse: string | string[]
) => {
  try {
    // Ensure macAdresse is always an array
    const macArray = Array.isArray(macAdresse) ? macAdresse : [macAdresse];
    const response = await fetch(
      `${API_BASE_URL}/averages?unique_identifiers=${macArray.join(",")}`,
      { headers: { ...getAuthHeaders() } }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Response from getSensorReadingsByMacAddress:", data); // Log the response for debugging
    return data;
  } catch (error) {
    console.error("Error fetching object from API:", error);
    throw error;
  }
};

// export const renameSensor = async (newName: string, oldName: string) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}/mappings`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json", ...getAuthHeaders() },
//       body: JSON.stringify({ newName, oldName }),
//     });
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     const data = await response.json();
//     console.log("Response from renameSensor:", response); // Log the response for debugging
//     return data; // Assuming the API returns a JSON response
//   } catch (error) {
//     console.error("Error renaming sensor:", error);
//     throw error;
//   }
// };

export const getOutdoorHumidity = async (
  latitude: number,
  longitude: number
) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=relative_humidity_2m_mean&timezone=auto`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Extract the daily humidity data
    return {
      meanHumidity: data.daily.relative_humidity_2m_mean,
    };
  } catch (error) {
    console.error("Error fetching outdoor humidity:", error);
    throw error;
  }
};
