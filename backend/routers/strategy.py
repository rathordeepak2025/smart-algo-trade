"""
Strategy & Backtesting API Router for Project Nexus.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import pandas as pd

from database import get_db
from models import Strategy, BacktestResult, Stock, PriceData
from services.backtesting import run_backtest

router = APIRouter(prefix="/api", tags=["strategy"])


# --- Pydantic Schemas ---

class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    strategy_type: str = "SWING"  # INTRADAY or SWING
    rules: dict  # e.g. {"type": "sma_crossover", "short_window": 20, "long_window": 50}


class BacktestRequest(BaseModel):
    stock_symbol: str = "RELIANCE"
    initial_capital: float = 100000.0
    days: int = 180


# --- Endpoints ---

@router.get("/strategies")
def list_strategies(db: Session = Depends(get_db)):
    """List all strategies."""
    strategies = db.query(Strategy).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "strategy_type": s.strategy_type,
            "rules": s.rules,
            "backtest_count": len(s.backtest_results),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in strategies
    ]


@router.get("/strategies/{strategy_id}")
def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    """Get a strategy with its backtest history."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    return {
        "id": strategy.id,
        "name": strategy.name,
        "description": strategy.description,
        "strategy_type": strategy.strategy_type,
        "rules": strategy.rules,
        "backtest_results": [
            {
                "id": r.id,
                "stock_symbol": r.stock_symbol,
                "total_return_pct": r.total_return_pct,
                "sharpe_ratio": r.sharpe_ratio,
                "max_drawdown_pct": r.max_drawdown_pct,
                "win_rate": r.win_rate,
                "total_trades": r.total_trades,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in strategy.backtest_results
        ],
        "created_at": strategy.created_at.isoformat() if strategy.created_at else None,
    }


@router.post("/strategies")
def create_strategy(data: StrategyCreate, db: Session = Depends(get_db)):
    """Create a new trading strategy."""
    strategy = Strategy(
        name=data.name,
        description=data.description,
        strategy_type=data.strategy_type.upper(),
        rules=data.rules,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return {"id": strategy.id, "name": strategy.name, "message": "Strategy created"}


@router.delete("/strategies/{strategy_id}")
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    """Delete a strategy."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(strategy)
    db.commit()
    return {"message": "Strategy deleted"}


@router.post("/strategies/{strategy_id}/backtest")
def run_strategy_backtest(
    strategy_id: int,
    req: BacktestRequest,
    db: Session = Depends(get_db),
):
    """Run a backtest for a strategy against a stock's historical data."""
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    stock = db.query(Stock).filter(Stock.symbol == req.stock_symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {req.stock_symbol} not found")

    # Fetch price data
    prices = (
        db.query(PriceData)
        .filter(PriceData.stock_id == stock.id)
        .order_by(PriceData.timestamp.desc())
        .limit(req.days)
        .all()
    )

    if len(prices) < 50:
        raise HTTPException(status_code=400, detail="Not enough price data for backtesting (need at least 50 days)")

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

    # Run the backtest
    result = run_backtest(df, strategy.rules, req.initial_capital)

    # Save result to DB
    bt = BacktestResult(
        strategy_id=strategy.id,
        stock_symbol=req.stock_symbol.upper(),
        start_date=df["timestamp"].iloc[0],
        end_date=df["timestamp"].iloc[-1],
        initial_capital=req.initial_capital,
        final_capital=result["final_capital"],
        total_return_pct=result["total_return_pct"],
        max_drawdown_pct=result["max_drawdown_pct"],
        total_trades=result["total_trades"],
        winning_trades=result["winning_trades"],
        losing_trades=result["losing_trades"],
        sharpe_ratio=result["sharpe_ratio"],
        win_rate=result["win_rate"],
        equity_curve=result["equity_curve"],
        trades_log=result["trades_log"],
    )
    db.add(bt)
    db.commit()
    db.refresh(bt)

    result["backtest_id"] = bt.id
    result["strategy_name"] = strategy.name
    result["stock_symbol"] = req.stock_symbol.upper()

    return result


@router.get("/backtests/{backtest_id}")
def get_backtest_result(backtest_id: int, db: Session = Depends(get_db)):
    """Retrieve a saved backtest result."""
    bt = db.query(BacktestResult).filter(BacktestResult.id == backtest_id).first()
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest result not found")

    return {
        "id": bt.id,
        "strategy_id": bt.strategy_id,
        "stock_symbol": bt.stock_symbol,
        "start_date": bt.start_date.strftime("%Y-%m-%d"),
        "end_date": bt.end_date.strftime("%Y-%m-%d"),
        "initial_capital": bt.initial_capital,
        "final_capital": bt.final_capital,
        "total_return_pct": bt.total_return_pct,
        "max_drawdown_pct": bt.max_drawdown_pct,
        "total_trades": bt.total_trades,
        "winning_trades": bt.winning_trades,
        "losing_trades": bt.losing_trades,
        "sharpe_ratio": bt.sharpe_ratio,
        "win_rate": bt.win_rate,
        "equity_curve": bt.equity_curve,
        "trades_log": bt.trades_log,
        "created_at": bt.created_at.isoformat() if bt.created_at else None,
    }
