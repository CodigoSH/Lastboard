
interface SystemStats {
    cpu_usage: number;
    ram_usage: number;
    ram_total: number;
    ram_used: number;
    temperature: number;
}

class SocketService {
    private socket: WebSocket | null = null;
    private listeners: ((stats: SystemStats) => void)[] = [];
    private reconnectTimeout: any;

    constructor() {
        this.connect();
    }

    private connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws`;

        console.log('[SocketService] Connecting to', url);
        this.socket = new WebSocket(url);

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.notify(data);
            } catch (e) {
                console.error('[SocketService] Failed to parse message', e);
            }
        };

        this.socket.onclose = () => {
            console.warn('[SocketService] WebSocket closed. Reconnecting...');
            this.scheduleReconnect();
        };

        this.socket.onerror = (err) => {
            console.error('[SocketService] WebSocket error', err);
            this.socket?.close();
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    }

    subscribe(listener: (stats: SystemStats) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(stats: SystemStats) {
        this.listeners.forEach(l => l(stats));
    }
}

export const socketService = new SocketService();
