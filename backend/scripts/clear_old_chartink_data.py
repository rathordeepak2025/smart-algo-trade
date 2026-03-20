import sys
import os
from datetime import date, datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import ChartinkStockList

def clear_data():
    db = SessionLocal()
    try:
        today_start = datetime.combine(date.today(), datetime.min.time())
        # Delete all entries for today to start fresh
        deleted = db.query(ChartinkStockList).filter(ChartinkStockList.date_scraped >= today_start).delete()
        db.commit()
        print(f"Deleted {deleted} ChartinkStockList entries for today.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
