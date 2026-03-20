import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.upstox_instruments import get_instrument_manager

def check_keys():
    manager = get_instrument_manager()
    manager.download_instruments()
    df = manager.instruments_df
    if df is not None:
        print("Sample rows from instruments_df:")
        print(df.head(5))
        
        # Check for RELIANCE specifically
        rel = df[df['tradingsymbol'] == 'RELIANCE']
        print("\nRELIANCE info:")
        print(rel)

if __name__ == "__main__":
    check_keys()
