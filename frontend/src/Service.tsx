const API_BASE_URL = "http://iot.holk.solutions:3000"

const getAuthHeaders = () => {
  const token = localStorage.getItem("jwtToken"); // Retrieve token from localStorage
  return token ? { Authorization: `Bearer ${token}` } : { Authorization: "" };
};

const isAuthenticated = () => !!localStorage.getItem("jwtToken");

const retryOnUnauthorized = async () => {
  try {
    localStorage.removeItem("jwtToken"); // Clear the token
    window.location.href = "/"; // Redirect to the login page
    throw new Error("User not authenticated. Redirecting to login.");
  } catch (error) {
    console.error("Error during retry on unauthorized:", error);
    throw error;
  }
};

const fetchWithRetry = async (url: string, options: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (response.status === 401) {
      await retryOnUnauthorized();
    }
    return response;
  } catch (error) {
    console.error("Error during fetchWithRetry:", error);
    throw error;
  }
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
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}`, {});
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Return the full response
  } catch (error) {
    console.error("Error fetching sensors:", error);
    throw error;
  }
};

export const mapSensor = async (unique_identifier: string, label: string) => {
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/mappings`, {
      method: "POST",
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
    return data; // Return the full response, including the ID
  } catch (error) {
    console.error("Error mapping sensor:", error);
    throw error;
  }
};

export const getmapedSensors = async () => {
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/mappings`, {
      headers: { ...getAuthHeaders() },
    }); // Fetch mapped sensors
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Return the full response
  } catch (error) {
    console.error("Error fetching mapped sensors:", error);
    throw error;
  }
};

export const updateMapSensor = async (
  id: number,
  unique_identifier: string,
  label: string
) => {
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/mappings/${id}`, {
      method: "PUT",
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
    return data; // Assuming the API returns a JSON response
  } catch (error) {
    console.error("Error updating sensor mapping:", error);
    throw error;
  }
};

export const getSensorReadingsByMacAddress = async (
  macAddress: string | string[],
  days: number = 7
) => {
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const macArray = Array.isArray(macAddress) ? macAddress : [macAddress];
    const response = await fetchWithRetry(
      `${API_BASE_URL}/averages?unique_identifiers=${macArray.join(
        ","
      )}&days=${days}`,
      { headers: { ...getAuthHeaders() } }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching sensor readings:", error);
    throw error;
  }
};

export const deleteMappedSensor = async (id: number) => {
  if (!isAuthenticated()) throw new Error("User not authenticated");
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/mappings/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error removing sensor with ID ${id}:`, error);
    throw error;
  }
};

export const getOutdoorHumidity = async (
  latitude: number,
  longitude: number,
  amountOfDays: number = 7
) => {
  try {
    const endDate = new Date().toISOString().split("T")[0]; // Today's date
    const startDate = new Date(
      new Date().setDate(new Date().getDate() - amountOfDays)
    )
      .toISOString()
      .split("T")[0]; // Date `amountOfDays` ago

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=relative_humidity_2m_mean&timezone=auto`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Map daily humidity values to their respective dates
    const dailyHumidity = data.daily.time.map(
      (date: string, index: number) => ({
        date,
        value: data.daily.relative_humidity_2m_mean[index],
      })
    );

    return dailyHumidity;
  } catch (error) {
    console.error("Error fetching outdoor humidity:", error);
    throw error;
  }
};
