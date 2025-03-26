const API_BASE_URL = 'http://iot.holk.solutions:3000'; // Replace with your API base URL

export const getlastestreadings = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/entries?limit=10`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching object from API:', error);
        throw error;
    }
};

export const getSensors = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching object from API:', error);
        throw error;
    }
}

export const getSensorReadingsByMacAddress = async (macAdresse: string | string[]) => {
    try {
        // Ensure macAdresse is always an array
        const macArray = Array.isArray(macAdresse) ? macAdresse : [macAdresse];
        const response = await fetch(`${API_BASE_URL}/averages?unique_identifiers=${macArray.join(',')}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching object from API:', error);
        throw error;
    }
};

export const renameSensor = async (newName: string, oldName: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName, oldName })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error renaming sensor:', error);
        throw error;
    }
};

