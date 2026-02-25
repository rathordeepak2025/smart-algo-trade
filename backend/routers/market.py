"""
Market Data API Router for Project Nexus.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db
from models import Stock, PriceData
from services.technical_analysis import compute_indicators

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/stocks")
def list_stocks(
    exchange: str = Query(None, description="Filter by exchange: NSE or BSE"),
    sector: str = Query(None, description="Filter by sector"),
    db: Session = Depends(get_db),
):
    """List all stocks, optionally filtered by exchange or sector."""
    query = db.query(Stock)
    if exchange:
        query = query.filter(Stock.exchange == exchange.upper())
    if sector:
        query = query.filter(Stock.sector == sector)

    stocks = query.all()
    return [
        {
            "id": s.id,
            "symbol": s.symbol,
            "name": s.name,
            "exchange": s.exchange,
            "sector": s.sector,
            "current_price": s.current_price,
            "day_change": s.day_change,
            "day_change_pct": s.day_change_pct,
        }
        for s in stocks
    ]


@router.get("/stocks/{symbol}")
def get_stock(symbol: str, db: Session = Depends(get_db)):
    """Get a single stock by symbol."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    return {
        "id": stock.id,
        "symbol": stock.symbol,
        "name": stock.name,
        "exchange": stock.exchange,
        "sector": stock.sector,
        "current_price": stock.current_price,
        "day_change": stock.day_change,
        "day_change_pct": stock.day_change_pct,
    }


@router.get("/stocks/{symbol}/prices")
def get_stock_prices(
    symbol: str,
    limit: int = Query(180, ge=1, le=365, description="Number of days"),
    db: Session = Depends(get_db),
):
    """Get historical OHLCV data for a stock."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    prices = (
        db.query(PriceData)
        .filter(PriceData.stock_id == stock.id)
        .order_by(PriceData.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "timestamp": p.timestamp.strftime("%Y-%m-%d"),
            "open": p.open,
            "high": p.high,
            "low": p.low,
            "close": p.close,
            "volume": p.volume,
            "confidence_level": p.confidence_level,
        }
        for p in reversed(prices)
    ]


@router.get("/stocks/{symbol}/indicators")
def get_stock_indicators(
    symbol: str,
    limit: int = Query(180, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get all technical indicators for a stock."""
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")

    prices = (
        db.query(PriceData)
        .filter(PriceData.stock_id == stock.id)
        .order_by(PriceData.timestamp.desc())
        .limit(limit)
        .all()
    )

    if not prices:
        return {"error": "No price data available"}

    df = pd.DataFrame([
        {
            "timestamp": p.timestamp,
            "open": p.open,
            "high": p.high,
            "low": p.low,
            "close": p.close,
            "volume": p.volume,
        }
        for p in reversed(prices)
    ])

    indicators = compute_indicators(df)
    indicators["symbol"] = symbol.upper()
    indicators["stock_name"] = stock.name
    return indicators
