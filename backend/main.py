"""
Project Nexus — FastAPI Main Entry Point.
The 'Conduit' Logic Tier per rules.md architecture.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal
from models import Stock
from routers import market, portfolio, strategy, screener
from services.market_feed import market_feed

# --- App Init ---
app = FastAPI(
    title="Nexus — Algo Trading Platform",
    description="Real-time NSE/BSE analysis, technical indicators, strategy backtesting",
    version="1.0.0",
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(market.router)
app.include_router(portfolio.router)
app.include_router(strategy.router)
app.include_router(screener.router)


@app.on_event("startup")
async def startup():
    """Initialize database and start market feed simulator."""
    init_db()

    # Initialize market feed with current stock prices
    db = SessionLocal()
    try:
        stocks = db.query(Stock).all()
        prices = {s.symbol: s.current_price for s in stocks if s.current_price}
        if prices:
            market_feed.initialize_prices(prices)
            asyncio.create_task(market_feed.start())
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "name": "Nexus — Algo Trading Platform",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "stocks": "/api/stocks",
            "portfolios": "/api/portfolios",
            "strategies": "/api/strategies",
            "docs": "/docs",
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/market")
async def market_websocket(websocket: WebSocket):
    """WebSocket endpoint for live market data feed."""
    await websocket.accept()
    market_feed.subscribe(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Could handle subscription filters here
    except WebSocketDisconnect:
        market_feed.unsubscribe(websocket)
