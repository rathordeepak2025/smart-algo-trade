"""
Simulated Market Feed Service for Project Nexus.
WebSocket-based live price updates using mock data.
"""

import asyncio
import json
import random
from datetime import datetime


class MarketFeedSimulator:
    """Simulates real-time price ticks for NSE/BSE stocks."""

    def __init__(self):
        self.subscribers = set()
        self.running = False
        self.stocks = {}

    def initialize_prices(self, stock_prices: dict):
        """Set initial prices for stocks. stock_prices = {symbol: price}"""
        self.stocks = {
            symbol: {
                "symbol": symbol,
                "price": price,
                "prev_close": price,
                "open": price * (1 + random.uniform(-0.01, 0.01)),
                "high": price,
                "low": price,
                "volume": random.randint(100000, 5000000),
            }
            for symbol, price in stock_prices.items()
        }

    def subscribe(self, websocket):
        self.subscribers.add(websocket)

    def unsubscribe(self, websocket):
        self.subscribers.discard(websocket)

    async def start(self):
        """Start the price simulation loop."""
        self.running = True
        while self.running:
            await self._tick()
            await asyncio.sleep(1.5)  # Tick every 1.5 seconds

    def stop(self):
        self.running = False

    async def _tick(self):
        """Generate one price tick for all stocks and broadcast."""
        updates = []
        for symbol, data in self.stocks.items():
            # Random walk with slight mean reversion
            change_pct = random.gauss(0, 0.003)  # ~0.3% std dev per tick
            new_price = data["price"] * (1 + change_pct)
            new_price = round(max(new_price, 1.0), 2)  # Floor at ₹1

            data["price"] = new_price
            data["high"] = max(data["high"], new_price)
            data["low"] = min(data["low"], new_price)
            data["volume"] += random.randint(1000, 50000)

            day_change = new_price - data["prev_close"]
            day_change_pct = (day_change / data["prev_close"]) * 100 if data["prev_close"] else 0

            updates.append({
                "symbol": symbol,
                "price": new_price,
                "open": round(data["open"], 2),
                "high": round(data["high"], 2),
                "low": round(data["low"], 2),
                "volume": data["volume"],
                "change": round(day_change, 2),
                "change_pct": round(day_change_pct, 2),
                "timestamp": datetime.now().isoformat(),
            })

        if updates and self.subscribers:
            message = json.dumps({"type": "market_update", "data": updates})
            dead = set()
            for ws in self.subscribers:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.add(ws)
            self.subscribers -= dead


# Singleton instance
market_feed = MarketFeedSimulator()
