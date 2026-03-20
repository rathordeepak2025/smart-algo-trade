import requests
import pandas as pd
import gzip
import io
import atexit
from threading import Lock

class UpstoxInstrumentManager:
    def __init__(self):
        self.instruments_df = None
        self._lock = Lock()
        self.downloaded = False
        
    def download_instruments(self):
        """Downloads the daily instrument master file from Upstox for NSE equity."""
        with self._lock:
            if self.downloaded:
                return
                
            url = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.csv.gz"
            try:
                response = requests.get(url, stream=True)
                response.raise_for_status()
                
                with gzip.open(io.BytesIO(response.content), 'rt', encoding='utf-8') as f:
                    # columns depend on Upstox format, usually:
                    # instrument_key, exchange_token, tradingsymbol, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, option_type, exchange
                    df = pd.read_csv(f)
                    
                    # Filter for Equity (EQ) only to keep it fast and relevant to the platform
                    if 'instrument_type' in df.columns:
                        df = df[df['instrument_type'] == 'EQUITY']
                    
                    # Ensure required columns exist, handling case variations
                    df.columns = df.columns.str.lower()
                    
                    # We need instrument_key, tradingsymbol, name
                    required_cols = ['instrument_key', 'tradingsymbol', 'name']
                    available_cols = [c for c in required_cols if c in df.columns]
                    
                    # Keep only what we need for search
                    self.instruments_df = df[available_cols].copy()
                    
                    # Fill NaN names with tradingsymbol
                    if 'name' in self.instruments_df.columns:
                        self.instruments_df['name'] = self.instruments_df['name'].fillna(self.instruments_df['tradingsymbol'])
                    else:
                        self.instruments_df['name'] = self.instruments_df['tradingsymbol']
                        
                    self.instruments_df['search_text'] = (self.instruments_df['tradingsymbol'] + " " + self.instruments_df['name']).str.lower()
                    
                    self.downloaded = True
                    print(f"Downloaded and parsed {len(self.instruments_df)} Upstox instruments.")
            except Exception as e:
                print(f"Failed to download Upstox instruments: {e}")

    def search(self, query: str, limit: int = 20):
        """Searches instruments by tradingsymbol or name."""
        if not self.downloaded:
            self.download_instruments()
            
        if self.instruments_df is None or self.instruments_df.empty:
            return []
            
        query = query.lower().strip()
        if not query:
            return []
            
        # Fast substring match
        mask = self.instruments_df['search_text'].str.contains(query, regex=False, na=False)
        results = self.instruments_df[mask].head(limit)
        
        # Format the output matching the frontend expectations
        output = []
        for _, row in results.iterrows():
            output.append({
                "instrument_key": row.get('instrument_key', ''),
                "symbol": row.get('tradingsymbol', ''),
                "name": row.get('name', ''),
            })
        return output
        
    def get_instrument_keys(self, symbols: list):
        """Map a list of symbols to their Upstox instrument_keys."""
        if not self.downloaded:
            self.download_instruments()
            
        if self.instruments_df is None or self.instruments_df.empty:
            return {}
            
        filtered = self.instruments_df[self.instruments_df['tradingsymbol'].isin(symbols)]
        return dict(zip(filtered['tradingsymbol'], filtered['instrument_key']))

    def get_instruments_metadata(self, symbols: list):
        """Map a list of symbols to their metadata (key and name)."""
        if not self.downloaded:
            self.download_instruments()
            
        if self.instruments_df is None or self.instruments_df.empty:
            return {}
            
        filtered = self.instruments_df[self.instruments_df['tradingsymbol'].isin(symbols)]
        res = {}
        for _, row in filtered.iterrows():
            res[row['tradingsymbol']] = {
                'key': row['instrument_key'],
                'name': row['name']
            }
        return res

# Global instance for thread-safe shared usage
_instrument_manager = UpstoxInstrumentManager()

def get_instrument_manager():
    return _instrument_manager
