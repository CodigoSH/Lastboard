/**
 * Base API Service
 * Handles horizontal concerns like base URL, headers, and error parsing.
 */
export const api = {
    async get(url: string) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API GET failed: ${response.statusText}`);
        return response.json();
    },

    async post(url: string, data: any) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API POST failed: ${response.statusText}`);
        return response.json();
    },

    async patch(url: string, data: any) {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API PATCH failed: ${response.statusText}`);
        return response.json();
    }
};
