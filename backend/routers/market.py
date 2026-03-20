"""
Market Data API Router for Project Nexus.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db
from models import Stock, PriceData, ChartinkStockList
from sqlalchemy import desc
from services.technical_analysis import compute_indicators
from services.upstox_instruments import get_instrument_manager

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/stocks")
def list_stocks(db: Session = Depends(get_db)):
    """
    List stocks from the latest ChartinkStockList for the current date, with live prices from Upstox.
    Clears dependence on legacy 'stocks' table for the primary view.
    """
    from datetime import datetime, date
    import requests
    from models import UserSession

    # 1. Get today's stocks from the LATEST entry of each ACTIVE screener
    from models import Screener
    active_screeners = db.query(Screener).filter(Screener.is_active == True).all()
    active_names = [s.name for s in active_screeners]
    
    if not active_names:
        return []
        
    symbols = set()
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    for name in active_names:
        latest_list = db.query(ChartinkStockList).filter(
            ChartinkStockList.screener_name == name,
            ChartinkStockList.date_scraped >= today_start
        ).order_by(ChartinkStockList.date_scraped.desc()).first()
        
        if latest_list:
            symbols.update(latest_list.stocks)
        
    if not symbols:
        return []
        
    symbol_list = list(symbols)
    
    # 2. Get metadata and instrument keys
    manager = get_instrument_manager()
    metadata = manager.get_instruments_metadata(symbol_list)
    
    if not metadata:
        # If no metadata found for any symbols, return them as is with name=symbol
        return [{"symbol": s, "name": s, "current_price": 0, "day_change": 0, "day_change_pct": 0} for s in symbol_list]

    # 3. Get live quotes from Upstox
    session = db.query(UserSession).first()
    if not session or not session.access_token:
        # Return what we have if not authenticated
        return [
            {
                "symbol": s,
                "name": metadata.get(s, {}).get('name', s),
                "current_price": 0, "day_change": 0, "day_change_pct": 0,
                "exchange": "NSE"
            }
            for s in symbol_list
        ]

    # Map symbols to keys for the Upstox API call
    # Batch the requests to avoid URL length limits or API restrictions (max 50-100 usually)
    batch_size = 50
    keys_list = [m['key'] for m in metadata.values()]
    quotes_data = {}
    
    headers = {
        'Authorization': f'Bearer {session.access_token}',
        'Accept': 'application/json'
    }
    
    try:
        for i in range(0, len(keys_list), batch_size):
            batch_keys = keys_list[i:i + batch_size]
            keys_str = ','.join(batch_keys)
            url = f"https://api.upstox.com/v2/market-quote/quotes?instrument_key={keys_str}"
            resp = requests.get(url, headers=headers)
            if resp.status_code == 401:
                print("Upstox token unauthorized. Please re-login.")
                break
            resp.raise_for_status()
            batch_results = resp.json().get('data', {})
            quotes_data.update(batch_results)
        
        # 4. Build response
        # Upstox returns keys in data like "NSE_EQ:RELIANCE", but we requested by instrument_key.
        # Robust way: Map symbol in quote to our symbol_list
        symbol_to_quote = {}
        for q_val in quotes_data.values():
            s = q_val.get('symbol')
            if s:
                symbol_to_quote[s] = q_val

        results = []
        for symbol in symbol_list:
            meta = metadata.get(symbol, {})
            quote = symbol_to_quote.get(symbol, {})
            
            lp = quote.get('last_price', 0)
            nc = quote.get('net_change', 0)
            prev_close = lp - nc
            pct = (nc / prev_close * 100) if prev_close > 0 else 0
            
            results.append({
                "symbol": symbol,
                "name": meta.get('name', symbol),
                "current_price": lp,
                "day_change": nc,
                "day_change_pct": pct,
                "exchange": "NSE",
                "sector": "N/A",
                "volume": quote.get('volume', 0)
            })
        return results
    except Exception as e:
        print(f"Error fetching live Upstox data for market list: {e}")
        # Return fallback if API fails
        return [
            {
                "symbol": s,
                "name": metadata.get(s, {}).get('name', s),
                "current_price": 0, "day_change": 0, "day_change_pct": 0, "volume": 0,
                "exchange": "NSE"
            }
            for s in symbol_list
        ]

@router.get("/market/quotes")
def get_live_quotes(symbols: str = Query(...), db: Session = Depends(get_db)):
    """Fetch live market quotes from Upstox for a comma-separated list of symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
    if not symbol_list:
        return {}

    manager = get_instrument_manager()
    metadata = manager.get_instruments_metadata(symbol_list)
    session = db.query(UserSession).first()
    
    if not session or not session.access_token or not metadata:
        return {s: {"symbol": s, "current_price": 0, "day_change": 0, "day_change_pct": 0, "volume": 0} for s in symbol_list}

    keys_list = [m['key'] for m in metadata.values()]
    headers = {'Authorization': f'Bearer {session.access_token}', 'Accept': 'application/json'}
    quotes_data = {}
    
    try:
        batch_size = 50
        for i in range(0, len(keys_list), batch_size):
            batch_keys = keys_list[i:i+batch_size]
            url = f"https://api.upstox.com/v2/market-quote/quotes?instrument_key={','.join(batch_keys)}"
            resp = requests.get(url, headers=headers)
            if resp.status_code == 200:
                quotes_data.update(resp.json().get('data', {}))
        
        # Build symbol-to-quote map for robust lookup
        symbol_to_quote = {qv.get('symbol'): qv for qv in quotes_data.values() if qv.get('symbol')}
        
        res = {}
        for s in symbol_list:
            q = symbol_to_quote.get(s, {})
            lp = q.get('last_price', 0)
            nc = q.get('net_change', 0)
            pc = lp - nc
            res[s] = {
                "symbol": s,
                "current_price": lp,
                "day_change": nc,
                "day_change_pct": (nc / pc * 100) if pc > 0 else 0,
                "volume": q.get('volume', 0)
            }
        return res
    except Exception as e:
        print(f"Error in get_live_quotes: {e}")
        return {s: {"symbol": s, "current_price": 0, "day_change": 0, "day_change_pct": 0, "volume": 0} for s in symbol_list}


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

@router.get("/chartink/screener")
def get_latest_chartink_screener(db: Session = Depends(get_db)):
    """Get the latest scraped stocks from Chartink."""
    latest_gainers = db.query(ChartinkStockList).filter(ChartinkStockList.screener_name == "Top Gainers").order_by(desc(ChartinkStockList.date_scraped)).first()
    latest_losers = db.query(ChartinkStockList).filter(ChartinkStockList.screener_name == "Top Losers").order_by(desc(ChartinkStockList.date_scraped)).first()
    
    return {
        "top_gainers": latest_gainers.stocks if latest_gainers else [],
        "top_losers": latest_losers.stocks if latest_losers else []
    }

from services.upstox_instruments import get_instrument_manager
from models import UserSession
import requests

@router.get("/market/search")
def search_instruments(q: str = Query(..., min_length=1)):
    """Search Upstox instruments by symbol or name."""
    manager = get_instrument_manager()
    results = manager.search(q, limit=20)
    return results

@router.get("/market/sectors")
def get_sectors(db: Session = Depends(get_db)):
    """Returns a dictionary of sectors mapped to their stock symbols, dynamically built from the local DB."""
    # Find active sectors in DB
    stocks = db.query(Stock).filter(Stock.sector.isnot(None), Stock.sector != "").all()
    
    sectors = {}
    for s in stocks:
        if s.sector not in sectors:
            sectors[s.sector] = []
        sectors[s.sector].append(s.symbol)
        
    return sectors

class TrackStockRequest(BaseModel):
    symbol: str

@router.post("/market/track")
def track_stock(data: TrackStockRequest, db: Session = Depends(get_db)):
    """Add a stock to the tracked_stocks table for the current day."""
    from models import TrackedStock
    from datetime import date, datetime
    
    # Check if already tracked today
    today_start = datetime.combine(date.today(), datetime.min.time())
    existing = db.query(TrackedStock).filter(
        TrackedStock.symbol == data.symbol.upper(),
        TrackedStock.added_at >= today_start
    ).first()
    
    if existing:
        return {"message": f"{data.symbol} is already being tracked today.", "id": existing.id}
        
    new_track = TrackedStock(symbol=data.symbol.upper())
    db.add(new_track)
    db.commit()
    db.refresh(new_track)
    return {"message": f"{data.symbol} added to tracking", "id": new_track.id}

@router.get("/market/tracked")
def list_tracked_stocks(db: Session = Depends(get_db)):
    """List all stocks being tracked today with live prices."""
    from models import TrackedStock, UserSession
    from datetime import date, datetime
    import requests
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    tracked = db.query(TrackedStock).filter(TrackedStock.added_at >= today_start).all()
    
    if not tracked:
        return []
        
    symbol_list = [t.symbol for t in tracked]
    
    # Reuse the live quote logic
    manager = get_instrument_manager()
    metadata = manager.get_instruments_metadata(symbol_list)
    
    if not metadata:
        return [{"symbol": s, "name": s, "current_price": 0, "day_change": 0, "day_change_pct": 0} for s in symbol_list]

    session = db.query(UserSession).first()
    if not session or not session.access_token:
         return [
            {
                "symbol": s,
                "name": metadata.get(s, {}).get('name', s),
                "current_price": 0, "day_change": 0, "day_change_pct": 0,
                "exchange": "NSE"
            }
            for s in symbol_list
        ]

    batch_size = 50
    keys_list = [m['key'] for m in metadata.values()]
    quotes_data = {}
    headers = {'Authorization': f'Bearer {session.access_token}', 'Accept': 'application/json'}
    
    try:
        for i in range(0, len(keys_list), batch_size):
            batch_keys = keys_list[i:i + batch_size]
            keys_str = ','.join(batch_keys)
            url = f"https://api.upstox.com/v2/market-quote/quotes?instrument_key={keys_str}"
            resp = requests.get(url, headers=headers)
            if resp.status_code == 401: break
            resp.raise_for_status()
            quotes_data.update(resp.json().get('data', {}))
        
        # Build symbol-to-quote map for robust lookup
        symbol_to_quote = {qv.get('symbol'): qv for qv in quotes_data.values() if qv.get('symbol')}
        
        results = []
        for s in symbol_list:
            meta = metadata.get(s, {})
            quote = symbol_to_quote.get(s, {})
            lp = quote.get('last_price', 0)
            nc = quote.get('net_change', 0)
            pc = lp - nc
            
            results.append({
                "symbol": s,
                "name": meta.get('name', s),
                "current_price": lp,
                "day_change": nc,
                "day_change_pct": (nc / pc * 100) if pc > 0 else 0,
                "exchange": "NSE",
                "sector": "N/A",
                "volume": quote.get('volume', 0)
            })
        return results
    except Exception as e:
        print(f"Error fetching tracked stocks live data: {e}")
        return [{"symbol": s, "name": metadata.get(s, {}).get('name', s), "current_price": 0, "day_change": 0, "day_change_pct": 0, "volume": 0} for s in symbol_list]
