
interface SystemStats {
    cpu_usage: number;
    ram_usage: number;
    ram_total: number;
    ram_used: number;
    temperature: number;
}

interface WSMessage {
    type: string;
    payload: any;
}

type NotificationListener = (type: string, payload: any) => void;

class SocketService {
    private socket: WebSocket | null = null;
    private statsListeners: ((stats: SystemStats) => void)[] = [];
    private notificationListeners: NotificationListener[] = [];
    private reconnectTimeout: any;
    private reconnectDelay: number = 1000;
    private static readonly MAX_DELAY = 30000;

    constructor() {
        this.connect();
    }

    private connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws`;

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            // Reset backoff on successful connection
            this.reconnectDelay = 1000;
        };

        this.socket.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);
                if (message.type === 'stats') {
                    this.notifyStats(message.payload);
                } else {
                    this.notifyNotification(message.type, message.payload);
                }
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
        const jitter = Math.random() * this.reconnectDelay * 0.5;
        this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectDelay + jitter);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, SocketService.MAX_DELAY);
    }

    destroy() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }
    }

    subscribe(listener: (stats: SystemStats) => void) {
        this.statsListeners.push(listener);
        return () => {
            this.statsListeners = this.statsListeners.filter(l => l !== listener);
        };
    }

    subscribeNotification(listener: (type: string, payload: any) => void) {
        this.notificationListeners.push(listener);
        return () => {
            this.notificationListeners = this.notificationListeners.filter(l => l !== listener);
        };
    }

    private notifyStats(stats: SystemStats) {
        this.statsListeners.forEach(l => l(stats));
    }

    private notifyNotification(type: string, payload: any) {
        this.notificationListeners.forEach(l => l(type, payload));
    }
}

export const socketService = new SocketService();
