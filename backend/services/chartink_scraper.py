import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from models import ChartinkStockList

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
    Scrape Top Gainers / Losers and store in DB for the day.
    """
    try:
        # Example clauses that Chartink interprets
        top_gainers_clause = "( {33489} ( latest close > latest open and latest volume > 100000 ) ) "
        gainers = get_chartink_stocks(top_gainers_clause)
        
        if gainers:
            record = ChartinkStockList(screener_name="Top Gainers", stocks=gainers)
            db.add(record)
        
        top_losers_clause = "( {33489} ( latest close < latest open and latest volume > 100000 ) ) "
        losers = get_chartink_stocks(top_losers_clause)
        
        if losers:
            record2 = ChartinkStockList(screener_name="Top Losers", stocks=losers)
            db.add(record2)
        
        db.commit()
        print(f"Chartink Scraping Successful: {len(gainers)} gainers, {len(losers)} losers.")
    except Exception as e:
        print(f"Error scraping Chartink: {e}")
