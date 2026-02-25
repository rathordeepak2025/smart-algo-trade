"""
Backtesting Engine for Project Nexus.
Simulates trades based on strategy rules against historical price data.
"""

import pandas as pd
import numpy as np
import ta


def run_backtest(prices_df: pd.DataFrame, strategy_rules: dict,
                 initial_capital: float = 100000.0) -> dict:
    """
    Run a backtest for a given strategy against historical data.

    Supported strategy rule types:
      - sma_crossover: Buy when short SMA crosses above long SMA, sell on cross below
      - rsi_overbought_oversold: Buy when RSI < oversold, sell when RSI > overbought
      - macd_crossover: Buy on MACD signal cross up, sell on cross down
      - bollinger_breakout: Buy on lower band touch, sell on upper band touch

    Args:
        prices_df: DataFrame with [timestamp, open, high, low, close, volume]
        strategy_rules: Dict with 'type' and parameters
        initial_capital: Starting capital

    Returns:
        Dict with performance metrics, equity curve, and trades log.
    """
    df = prices_df.copy().sort_values("timestamp").reset_index(drop=True)
    rule_type = strategy_rules.get("type", "sma_crossover")

    # Generate signals based on strategy type
    signals = _generate_signals(df, rule_type, strategy_rules)

    # Simulate trades
    return _simulate_trades(df, signals, initial_capital)


def _generate_signals(df: pd.DataFrame, rule_type: str, params: dict) -> pd.Series:
    """Generate buy/sell signals: 1 = buy, -1 = sell, 0 = hold."""
    signals = pd.Series(0, index=df.index)

    if rule_type == "sma_crossover":
        short_window = params.get("short_window", 20)
        long_window = params.get("long_window", 50)
        sma_short = ta.trend.sma_indicator(df["close"], window=short_window)
        sma_long = ta.trend.sma_indicator(df["close"], window=long_window)

        for i in range(1, len(df)):
            if pd.notna(sma_short.iloc[i]) and pd.notna(sma_long.iloc[i]):
                if sma_short.iloc[i] > sma_long.iloc[i] and sma_short.iloc[i - 1] <= sma_long.iloc[i - 1]:
                    signals.iloc[i] = 1  # Buy
                elif sma_short.iloc[i] < sma_long.iloc[i] and sma_short.iloc[i - 1] >= sma_long.iloc[i - 1]:
                    signals.iloc[i] = -1  # Sell

    elif rule_type == "rsi_overbought_oversold":
        rsi_period = params.get("rsi_period", 14)
        oversold = params.get("oversold", 30)
        overbought = params.get("overbought", 70)
        rsi = ta.momentum.rsi(df["close"], window=rsi_period)

        for i in range(1, len(df)):
            if pd.notna(rsi.iloc[i]):
                if rsi.iloc[i] < oversold and rsi.iloc[i - 1] >= oversold:
                    signals.iloc[i] = 1
                elif rsi.iloc[i] > overbought and rsi.iloc[i - 1] <= overbought:
                    signals.iloc[i] = -1

    elif rule_type == "macd_crossover":
        macd_obj = ta.trend.MACD(df["close"])
        macd_line = macd_obj.macd()
        signal_line = macd_obj.macd_signal()

        for i in range(1, len(df)):
            if pd.notna(macd_line.iloc[i]) and pd.notna(signal_line.iloc[i]):
                if macd_line.iloc[i] > signal_line.iloc[i] and macd_line.iloc[i - 1] <= signal_line.iloc[i - 1]:
                    signals.iloc[i] = 1
                elif macd_line.iloc[i] < signal_line.iloc[i] and macd_line.iloc[i - 1] >= signal_line.iloc[i - 1]:
                    signals.iloc[i] = -1

    elif rule_type == "bollinger_breakout":
        bb = ta.volatility.BollingerBands(df["close"], window=20, window_dev=2)
        bb_lower = bb.bollinger_lband()
        bb_upper = bb.bollinger_hband()

        for i in range(1, len(df)):
            if pd.notna(bb_lower.iloc[i]):
                if df["close"].iloc[i] <= bb_lower.iloc[i] and df["close"].iloc[i - 1] > bb_lower.iloc[i - 1]:
                    signals.iloc[i] = 1
                elif df["close"].iloc[i] >= bb_upper.iloc[i] and df["close"].iloc[i - 1] < bb_upper.iloc[i - 1]:
                    signals.iloc[i] = -1

    return signals


def _simulate_trades(df: pd.DataFrame, signals: pd.Series,
                     initial_capital: float) -> dict:
    """Simulate trades and compute performance metrics."""
    capital = initial_capital
    position = 0  # Number of shares held
    entry_price = 0.0
    trades = []
    equity_curve = []

    for i in range(len(df)):
        current_price = df["close"].iloc[i]
        timestamp = df["timestamp"].iloc[i].strftime("%Y-%m-%d")

        if signals.iloc[i] == 1 and position == 0:
            # Buy: use full capital
            position = int(capital // current_price)
            if position > 0:
                entry_price = current_price
                capital -= position * current_price
                trades.append({
                    "type": "BUY",
                    "date": timestamp,
                    "price": round(current_price, 2),
                    "quantity": position,
                    "value": round(position * current_price, 2),
                })

        elif signals.iloc[i] == -1 and position > 0:
            # Sell: liquidate all
            sell_value = position * current_price
            pnl = (current_price - entry_price) * position
            capital += sell_value
            trades.append({
                "type": "SELL",
                "date": timestamp,
                "price": round(current_price, 2),
                "quantity": position,
                "value": round(sell_value, 2),
                "pnl": round(pnl, 2),
            })
            position = 0

        # Track equity
        equity = capital + (position * current_price)
        equity_curve.append({
            "date": timestamp,
            "equity": round(equity, 2),
        })

    # Close any open position at end
    if position > 0:
        final_price = df["close"].iloc[-1]
        capital += position * final_price
        trades.append({
            "type": "SELL (CLOSE)",
            "date": df["timestamp"].iloc[-1].strftime("%Y-%m-%d"),
            "price": round(final_price, 2),
            "quantity": position,
            "value": round(position * final_price, 2),
            "pnl": round((final_price - entry_price) * position, 2),
        })
        position = 0

    final_capital = capital
    total_return_pct = ((final_capital - initial_capital) / initial_capital) * 100

    # Compute metrics
    sell_trades = [t for t in trades if t["type"].startswith("SELL")]
    winning = [t for t in sell_trades if t.get("pnl", 0) > 0]
    losing = [t for t in sell_trades if t.get("pnl", 0) <= 0]
    win_rate = (len(winning) / len(sell_trades) * 100) if sell_trades else 0

    # Max drawdown
    equity_values = [e["equity"] for e in equity_curve]
    max_drawdown = _compute_max_drawdown(equity_values)

    # Sharpe ratio (annualized, assuming daily data)
    if len(equity_values) > 1:
        returns = pd.Series(equity_values).pct_change().dropna()
        sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0
    else:
        sharpe = 0

    return {
        "initial_capital": initial_capital,
        "final_capital": round(final_capital, 2),
        "total_return_pct": round(total_return_pct, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "total_trades": len(trades),
        "winning_trades": len(winning),
        "losing_trades": len(losing),
        "win_rate": round(win_rate, 2),
        "sharpe_ratio": round(sharpe, 2),
        "equity_curve": equity_curve,
        "trades_log": trades,
    }


def _compute_max_drawdown(equity_values: list) -> float:
    """Compute maximum drawdown percentage from an equity curve."""
    if not equity_values:
        return 0.0
    peak = equity_values[0]
    max_dd = 0.0
    for val in equity_values:
        if val > peak:
            peak = val
        dd = ((peak - val) / peak) * 100 if peak > 0 else 0
        max_dd = max(max_dd, dd)
    return max_dd
