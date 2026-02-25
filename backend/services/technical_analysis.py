"""
Technical Analysis Service for Project Nexus.
Computes RSI, MACD, Bollinger Bands, SMA, EMA using the 'ta' library.
"""

import pandas as pd
import ta


def compute_indicators(prices_df: pd.DataFrame) -> dict:
    """
    Compute all technical indicators for a given price DataFrame.
    
    Args:
        prices_df: DataFrame with columns [timestamp, open, high, low, close, volume]
    
    Returns:
        Dictionary with indicator arrays ready for charting.
    """
    df = prices_df.copy().sort_values("timestamp").reset_index(drop=True)

    result = {
        "timestamps": df["timestamp"].dt.strftime("%Y-%m-%d").tolist(),
        "ohlcv": {
            "open": df["open"].tolist(),
            "high": df["high"].tolist(),
            "low": df["low"].tolist(),
            "close": df["close"].tolist(),
            "volume": df["volume"].astype(int).tolist(),
        },
    }

    # --- SMA (20, 50) ---
    df["sma_20"] = ta.trend.sma_indicator(df["close"], window=20)
    df["sma_50"] = ta.trend.sma_indicator(df["close"], window=50)

    # --- EMA (12, 26) ---
    df["ema_12"] = ta.trend.ema_indicator(df["close"], window=12)
    df["ema_26"] = ta.trend.ema_indicator(df["close"], window=26)

    # --- RSI (14) ---
    df["rsi"] = ta.momentum.rsi(df["close"], window=14)

    # --- MACD ---
    macd = ta.trend.MACD(df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_histogram"] = macd.macd_diff()

    # --- Bollinger Bands ---
    bb = ta.volatility.BollingerBands(df["close"], window=20, window_dev=2)
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"] = bb.bollinger_lband()

    # --- VWAP (Volume-Weighted Average Price) ---
    df["vwap"] = (df["volume"] * (df["high"] + df["low"] + df["close"]) / 3).cumsum() / df["volume"].cumsum()

    # Convert to serializable format, replace NaN with None
    for col in ["sma_20", "sma_50", "ema_12", "ema_26", "rsi",
                 "macd", "macd_signal", "macd_histogram",
                 "bb_upper", "bb_middle", "bb_lower", "vwap"]:
        result[col] = [None if pd.isna(v) else round(v, 2) for v in df[col].tolist()]

    return result


def compute_single_indicator(prices_df: pd.DataFrame, indicator: str, **params) -> list:
    """Compute a single indicator by name."""
    df = prices_df.copy().sort_values("timestamp").reset_index(drop=True)

    calculators = {
        "sma": lambda: ta.trend.sma_indicator(df["close"], window=params.get("window", 20)),
        "ema": lambda: ta.trend.ema_indicator(df["close"], window=params.get("window", 12)),
        "rsi": lambda: ta.momentum.rsi(df["close"], window=params.get("window", 14)),
        "macd": lambda: ta.trend.MACD(df["close"]).macd(),
        "bb_upper": lambda: ta.volatility.BollingerBands(df["close"]).bollinger_hband(),
        "bb_lower": lambda: ta.volatility.BollingerBands(df["close"]).bollinger_lband(),
    }

    if indicator not in calculators:
        raise ValueError(f"Unknown indicator: {indicator}")

    series = calculators[indicator]()
    return [None if pd.isna(v) else round(v, 2) for v in series.tolist()]
