import sys
import os
from datetime import date, datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import ChartinkStockList, Screener

def check_data():
    db = SessionLocal()
    try:
        today_start = datetime.combine(date.today(), datetime.min.time())
        lists = db.query(ChartinkStockList).filter(ChartinkStockList.date_scraped >= today_start).all()
        
        print(f"Total ChartinkStockList entries for today: {len(lists)}")
        for i, l in enumerate(lists):
            print(f"Entry {i+1}: Screener: {l.screener_name}, Stocks: {len(l.stocks)}")
            
        active_screeners = db.query(Screener).filter(Screener.is_active == True).all()
        print(f"\nActive screeners in DB: {len(active_screeners)}")
        for s in active_screeners:
            print(f"Screener: {s.name}, Clause: {s.scan_clause[:50]}...")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
