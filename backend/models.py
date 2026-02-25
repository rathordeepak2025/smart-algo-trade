"""
SQLAlchemy ORM Models for Project Nexus.
Includes confidence_level tracking per rules.md 'Resonance' tier requirements.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class ExchangeType(str, enum.Enum):
    NSE = "NSE"
    BSE = "BSE"


class StrategyType(str, enum.Enum):
    INTRADAY = "INTRADAY"
    SWING = "SWING"


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    exchange = Column(String(10), nullable=False)
    sector = Column(String(50), nullable=True)
    current_price = Column(Float, default=0.0)
    day_change = Column(Float, default=0.0)
    day_change_pct = Column(Float, default=0.0)

    prices = relationship("PriceData", back_populates="stock", cascade="all, delete-orphan")


class PriceData(Base):
    __tablename__ = "price_data"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Integer, nullable=False)
    confidence_level = Column(Float, default=1.0)  # Per rules.md: track confidence of each data point

    stock = relationship("Stock", back_populates="prices")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    avg_buy_price = Column(Float, nullable=False)
    bought_at = Column(DateTime, server_default=func.now())

    portfolio = relationship("Portfolio", back_populates="holdings")
    stock = relationship("Stock")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    strategy_type = Column(String(20), nullable=False, default="SWING")
    rules = Column(JSON, nullable=False)  # Strategy rules as JSON
    created_at = Column(DateTime, server_default=func.now())

    backtest_results = relationship("BacktestResult", back_populates="strategy", cascade="all, delete-orphan")


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    stock_symbol = Column(String(20), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    initial_capital = Column(Float, default=100000.0)
    final_capital = Column(Float, nullable=False)
    total_return_pct = Column(Float, nullable=False)
    max_drawdown_pct = Column(Float, nullable=False)
    total_trades = Column(Integer, nullable=False)
    winning_trades = Column(Integer, nullable=False)
    losing_trades = Column(Integer, nullable=False)
    sharpe_ratio = Column(Float, nullable=True)
    win_rate = Column(Float, nullable=False)
    metrics = Column(JSON, nullable=True)  # Additional detailed metrics
    equity_curve = Column(JSON, nullable=True)  # Equity over time for charting
    trades_log = Column(JSON, nullable=True)  # Individual trade records
    created_at = Column(DateTime, server_default=func.now())

    strategy = relationship("Strategy", back_populates="backtest_results")
