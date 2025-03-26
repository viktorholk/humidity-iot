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

export const getSensoners = async () => {
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

export const getSensorReadingsByMacAddresse = async (macAdresse: string[]) => {
    try {
        const response = await fetch(`${API_BASE_URL}/averages?unique_identifiers=${macAdresse.join(',')}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching object from API:', error);
        throw error;
    }
}

