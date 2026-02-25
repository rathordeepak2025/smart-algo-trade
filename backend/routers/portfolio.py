"""
Portfolio API Router for Project Nexus.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models import Portfolio, PortfolioHolding, Stock

router = APIRouter(prefix="/api", tags=["portfolio"])


# --- Pydantic Schemas ---

class HoldingCreate(BaseModel):
    stock_symbol: str
    quantity: int
    avg_buy_price: float


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    holdings: Optional[List[HoldingCreate]] = []


class HoldingAdd(BaseModel):
    stock_symbol: str
    quantity: int
    avg_buy_price: float


# --- Endpoints ---

@router.get("/portfolios")
def list_portfolios(db: Session = Depends(get_db)):
    """List all portfolios with summary stats."""
    portfolios = db.query(Portfolio).all()
    result = []
    for p in portfolios:
        total_invested = sum(h.quantity * h.avg_buy_price for h in p.holdings)
        current_value = sum(
            h.quantity * (h.stock.current_price or h.avg_buy_price)
            for h in p.holdings
        )
        pnl = current_value - total_invested
        pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0

        result.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "holdings_count": len(p.holdings),
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.get("/portfolios/{portfolio_id}")
def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Get a portfolio with all holdings and P&L breakdown."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holdings = []
    total_invested = 0
    current_value = 0

    for h in portfolio.holdings:
        stock_price = h.stock.current_price or h.avg_buy_price
        invested = h.quantity * h.avg_buy_price
        value = h.quantity * stock_price
        pnl = value - invested
        pnl_pct = (pnl / invested * 100) if invested > 0 else 0

        total_invested += invested
        current_value += value

        holdings.append({
            "id": h.id,
            "symbol": h.stock.symbol,
            "name": h.stock.name,
            "exchange": h.stock.exchange,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": round(stock_price, 2),
            "invested": round(invested, 2),
            "current_value": round(value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "day_change_pct": h.stock.day_change_pct,
        })

    total_pnl = current_value - total_invested

    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "pnl": round(total_pnl, 2),
        "pnl_pct": round((total_pnl / total_invested * 100) if total_invested > 0 else 0, 2),
        "holdings": holdings,
        "created_at": portfolio.created_at.isoformat() if portfolio.created_at else None,
    }


@router.post("/portfolios")
def create_portfolio(data: PortfolioCreate, db: Session = Depends(get_db)):
    """Create a new portfolio with optional initial holdings."""
    portfolio = Portfolio(name=data.name, description=data.description)
    db.add(portfolio)
    db.flush()

    for h in data.holdings:
        stock = db.query(Stock).filter(Stock.symbol == h.stock_symbol.upper()).first()
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {h.stock_symbol} not found")
        holding = PortfolioHolding(
            portfolio_id=portfolio.id,
            stock_id=stock.id,
            quantity=h.quantity,
            avg_buy_price=h.avg_buy_price,
        )
        db.add(holding)

    db.commit()
    db.refresh(portfolio)
    return {"id": portfolio.id, "name": portfolio.name, "message": "Portfolio created"}


@router.post("/portfolios/{portfolio_id}/holdings")
def add_holding(portfolio_id: int, data: HoldingAdd, db: Session = Depends(get_db)):
    """Add a holding to an existing portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    stock = db.query(Stock).filter(Stock.symbol == data.stock_symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {data.stock_symbol} not found")

    # Check if already holding this stock — average up
    existing = (
        db.query(PortfolioHolding)
        .filter(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.stock_id == stock.id,
        )
        .first()
    )

    if existing:
        total_qty = existing.quantity + data.quantity
        total_cost = (existing.quantity * existing.avg_buy_price) + (data.quantity * data.avg_buy_price)
        existing.avg_buy_price = round(total_cost / total_qty, 2)
        existing.quantity = total_qty
    else:
        holding = PortfolioHolding(
            portfolio_id=portfolio_id,
            stock_id=stock.id,
            quantity=data.quantity,
            avg_buy_price=data.avg_buy_price,
        )
        db.add(holding)

    db.commit()
    return {"message": "Holding added successfully"}


@router.delete("/portfolios/{portfolio_id}")
def delete_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Delete a portfolio and all its holdings."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    db.delete(portfolio)
    db.commit()
    return {"message": "Portfolio deleted"}
