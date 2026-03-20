import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from models import ChartinkStockList, Screener

CHARTINK_URL = "https://chartink.com/screener/"
CHARTINK_PROCESS_URL = "https://chartink.com/screener/process"

def get_chartink_stocks(scan_clause: str):
    """Hits the Chartink process endpoint with the scan clause to fetch stocks."""
    with requests.Session() as s:
        # Need to get CSRF token from the main screener page first
        r = s.get(CHARTINK_URL, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(r.text, "html.parser")
        meta_csrf = soup.select_one('meta[name="csrf-token"]')
        
        if not meta_csrf:
            print("Chartink CSRF token not found.")
            return []
            
        csrf_token = meta_csrf["content"]
        
        headers = {
            'X-CSRF-TOKEN': csrf_token,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0'
        }
        
        data = {'scan_clause': scan_clause}
        
        response = s.post(CHARTINK_PROCESS_URL, headers=headers, data=data)
        response.raise_for_status()
        res_json = response.json()
        stocks = [item.get('nsecode') for item in res_json.get('data', []) if item.get('nsecode')]
        return stocks

def scrape_and_store(db: Session):
    """
    Fetch all active screeners from the database, run their clauses on Chartink,
    and store the results in the ChartinkStockList table.
    """
    try:
        # Fetch all active screeners from the database
        active_screeners = db.query(Screener).filter(Screener.is_active == True).all()
        
        if not active_screeners:
            print("No active screeners found in the database.")
            return

        total_scraped = 0
        from datetime import datetime, date
        today_start = datetime.combine(date.today(), datetime.min.time())

        for screener in active_screeners:
            print(f"Running screener: {screener.name}")
            stocks = get_chartink_stocks(screener.scan_clause)
            
            if stocks:
                # Clear existing entries for this screener today to prevent accumulation
                db.query(ChartinkStockList).filter(
                    ChartinkStockList.screener_name == screener.name,
                    ChartinkStockList.date_scraped >= today_start
                ).delete()

                record = ChartinkStockList(screener_name=screener.name, stocks=stocks)
                db.add(record)
                total_scraped += 1
                print(f"  [OK] Scraped {len(stocks)} stocks for '{screener.name}'")
            else:
                print(f"  [WARN] No stocks found for '{screener.name}'")
        
        db.commit()
        print(f"Chartink Scraping Finished. Processed {total_scraped} screeners.")
    except Exception as e:
        db.rollback()
        print(f"Error scraping Chartink screeners: {e}")
