"""
Seed Data for Project Nexus.
Generates 20 popular NSE/BSE stocks with 6 months of simulated OHLCV data.
"""

import random
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, Stock, PriceData, Portfolio, PortfolioHolding, Strategy


# Popular NSE/BSE stocks with realistic base prices
STOCKS = [
    ("RELIANCE", "Reliance Industries", "NSE", "Energy", 2450.0),
    ("TCS", "Tata Consultancy Services", "NSE", "IT", 3800.0),
    ("HDFCBANK", "HDFC Bank", "NSE", "Banking", 1650.0),
    ("INFY", "Infosys", "NSE", "IT", 1520.0),
    ("ICICIBANK", "ICICI Bank", "NSE", "Banking", 1050.0),
    ("HINDUNILVR", "Hindustan Unilever", "NSE", "FMCG", 2580.0),
    ("SBIN", "State Bank of India", "NSE", "Banking", 620.0),
    ("BHARTIARTL", "Bharti Airtel", "NSE", "Telecom", 1180.0),
    ("ITC", "ITC Limited", "NSE", "FMCG", 440.0),
    ("KOTAKBANK", "Kotak Mahindra Bank", "NSE", "Banking", 1780.0),
    ("LT", "Larsen & Toubro", "NSE", "Infrastructure", 3200.0),
    ("AXISBANK", "Axis Bank", "NSE", "Banking", 1100.0),
    ("ASIANPAINT", "Asian Paints", "BSE", "Consumer", 2850.0),
    ("MARUTI", "Maruti Suzuki", "NSE", "Auto", 10500.0),
    ("TATAMOTORS", "Tata Motors", "NSE", "Auto", 680.0),
    ("SUNPHARMA", "Sun Pharma", "NSE", "Pharma", 1150.0),
    ("WIPRO", "Wipro", "NSE", "IT", 450.0),
    ("POWERGRID", "Power Grid Corp", "BSE", "Energy", 280.0),
    ("TATASTEEL", "Tata Steel", "NSE", "Metal", 135.0),
    ("ADANIENT", "Adani Enterprises", "NSE", "Conglomerate", 2650.0),
]


def generate_ohlcv(base_price: float, days: int = 180) -> list:
    """Generate realistic OHLCV data using geometric Brownian motion."""
    data = []
    price = base_price
    start_date = datetime.now() - timedelta(days=days)

    for i in range(days):
        date = start_date + timedelta(days=i)
        # Skip weekends
        if date.weekday() >= 5:
            continue

        # Daily return with slight upward drift
        daily_return = random.gauss(0.0003, 0.018)
        price *= (1 + daily_return)
        price = max(price, 1.0)

        open_price = price * (1 + random.uniform(-0.005, 0.005))
        high_price = max(open_price, price) * (1 + random.uniform(0, 0.015))
        low_price = min(open_price, price) * (1 - random.uniform(0, 0.015))
        close_price = price
        volume = int(random.uniform(500000, 15000000))

        data.append({
            "timestamp": date,
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": volume,
            "confidence_level": round(random.uniform(0.85, 1.0), 2),
        })

    return data


def seed():
    """Seed the database with stocks, price data, sample portfolio, and strategies."""
    print("🚀 Seeding Nexus database...")

    # Create tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # --- Seed Stocks & Price Data ---
        stock_objects = {}
        for symbol, name, exchange, sector, base_price in STOCKS:
            stock = Stock(
                symbol=symbol,
                name=name,
                exchange=exchange,
                sector=sector,
            )
            db.add(stock)
            db.flush()

            prices = generate_ohlcv(base_price)
            for p in prices:
                db.add(PriceData(stock_id=stock.id, **p))

            # Set current price from last data point
            if prices:
                stock.current_price = prices[-1]["close"]
                stock.day_change = round(prices[-1]["close"] - prices[-2]["close"], 2) if len(prices) > 1 else 0
                stock.day_change_pct = round(
                    (stock.day_change / prices[-2]["close"]) * 100, 2
                ) if len(prices) > 1 and prices[-2]["close"] != 0 else 0

            stock_objects[symbol] = stock
            print(f"  ✅ {symbol} — {len(prices)} days of data")

        # --- Sample Portfolio ---
        portfolio = Portfolio(name="My Portfolio", description="Primary trading portfolio")
        db.add(portfolio)
        db.flush()

        sample_holdings = [
            ("RELIANCE", 10, 2400.0),
            ("TCS", 5, 3750.0),
            ("HDFCBANK", 15, 1600.0),
            ("INFY", 20, 1480.0),
            ("ITC", 50, 420.0),
        ]
        for symbol, qty, price in sample_holdings:
            stock = stock_objects[symbol]
            db.add(PortfolioHolding(
                portfolio_id=portfolio.id,
                stock_id=stock.id,
                quantity=qty,
                avg_buy_price=price,
            ))
        print(f"  📁 Created portfolio with {len(sample_holdings)} holdings")

        # --- Sample Strategies ---
        strategies = [
            Strategy(
                name="SMA Crossover (20/50)",
                description="Buy when 20-day SMA crosses above 50-day SMA. Classic trend-following strategy.",
                strategy_type="SWING",
                rules={"type": "sma_crossover", "short_window": 20, "long_window": 50},
            ),
            Strategy(
                name="RSI Mean Reversion",
                description="Buy when RSI drops below 30 (oversold), sell above 70 (overbought).",
                strategy_type="INTRADAY",
                rules={"type": "rsi_overbought_oversold", "rsi_period": 14, "oversold": 30, "overbought": 70},
            ),
            Strategy(
                name="MACD Signal Crossover",
                description="Trade MACD line crossing the signal line.",
                strategy_type="SWING",
                rules={"type": "macd_crossover"},
            ),
            Strategy(
                name="Bollinger Band Breakout",
                description="Buy at lower band, sell at upper band.",
                strategy_type="SWING",
                rules={"type": "bollinger_breakout"},
            ),
        ]
        for s in strategies:
            db.add(s)
        print(f"  📊 Created {len(strategies)} sample strategies")

        db.commit()
        print("\n✨ Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
