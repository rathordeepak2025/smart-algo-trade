import sys
import os
import requests

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import UserSession

def test_quote():
    db = SessionLocal()
    try:
        session = db.query(UserSession).first()
        if not session or not session.access_token:
            print("Not authenticated with Upstox.")
            return
            
        # Common symbol to test
        symbol_key = "NSE_EQ|INE002A01018" # RELIANCE
        headers = {
            'Authorization': f'Bearer {session.access_token}',
            'Accept': 'application/json'
        }
        url = f"https://api.upstox.com/v2/market-quote/quotes?instrument_key={symbol_key}"
        resp = requests.get(url, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Full Data Structure:")
            import json
            print(json.dumps(data, indent=2))
        else:
            print(f"Error: {resp.text}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_quote()
