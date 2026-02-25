/**
 * WebSocket client for live market data feed.
 */

class MarketWebSocket {
    constructor() {
        this.ws = null;
        this.listeners = new Set();
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket('ws://localhost:8000/ws/market');

            this.ws.onopen = () => {
                console.log('🟢 Market feed connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'market_update') {
                        this.listeners.forEach(fn => fn(message.data));
                    }
                } catch (e) {
                    console.error('Error parsing market data:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('🔴 Market feed disconnected');
                this._reconnect();
            };

            this.ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
        } catch (e) {
            console.error('WebSocket connection error:', e);
            this._reconnect();
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connect();
        }
        return () => this.listeners.delete(callback);
    }

    _reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    disconnect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) this.ws.close();
        this.listeners.clear();
    }
}

export const marketWS = new MarketWebSocket();
export default marketWS;
