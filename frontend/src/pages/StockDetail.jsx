import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchStock, fetchStockIndicators } from '../services/api';
import CandlestickChart from '../components/CandlestickChart';
import './StockDetail.css';

const INDICATOR_OPTIONS = [
    { key: 'sma_20', label: 'SMA 20', color: '#f59e0b' },
    { key: 'sma_50', label: 'SMA 50', color: '#3b82f6' },
    { key: 'ema_12', label: 'EMA 12', color: '#a78bfa' },
    { key: 'ema_26', label: 'EMA 26', color: '#ec4899' },
    { key: 'bb_upper', label: 'BB Upper', color: '#6366f1' },
    { key: 'bb_middle', label: 'BB Mid', color: '#6366f1' },
    { key: 'bb_lower', label: 'BB Lower', color: '#6366f1' },
];

export default function StockDetail() {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const [stock, setStock] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [activeIndicators, setActiveIndicators] = useState(['sma_20', 'sma_50']);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchStock(symbol),
            fetchStockIndicators(symbol),
        ]).then(([s, indicators]) => {
            setStock(s);
            setChartData(indicators);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [symbol]);

    const toggleIndicator = (key) => {
        setActiveIndicators(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    if (!stock) {
        return <div className="empty-state"><h3>Stock not found</h3></div>;
    }

    const isUp = stock.day_change >= 0;
    const selectedIndicators = {};
    activeIndicators.forEach(key => {
        if (chartData?.[key]) selectedIndicators[key] = chartData[key];
    });

    // Get latest RSI and MACD
    const latestRSI = chartData?.rsi?.filter(v => v != null).slice(-1)[0];
    const latestMACD = chartData?.macd?.filter(v => v != null).slice(-1)[0];

    return (
        <div className="stock-detail fade-in">
            <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(-1)}
                style={{ marginBottom: 16 }}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="stock-header">
                <div>
                    <h1>{stock.symbol}</h1>
                    <p className="stock-fullname">{stock.name}</p>
                </div>
                <div className="stock-price-block">
                    <span className="stock-current-price">₹{stock.current_price?.toFixed(2)}</span>
                    <span className={`stock-change ${isUp ? 'positive' : 'negative'}`}>
                        {isUp ? '+' : ''}{stock.day_change?.toFixed(2)} ({isUp ? '+' : ''}{stock.day_change_pct?.toFixed(2)}%)
                    </span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
                <div className="card stat-card">
                    <div className="stat-label">Exchange</div>
                    <div className="stat-value" style={{ fontSize: '1.1rem' }}>
                        <span className={`badge badge-${stock.exchange === 'NSE' ? 'blue' : 'yellow'}`}>
                            {stock.exchange}
                        </span>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">Sector</div>
                    <div className="stat-value" style={{ fontSize: '1.1rem' }}>{stock.sector}</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">RSI (14)</div>
                    <div className={`stat-value ${latestRSI > 70 ? 'negative' : latestRSI < 30 ? 'positive' : ''}`}
                        style={{ fontSize: '1.3rem' }}>
                        {latestRSI ?? '—'}
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-label">MACD</div>
                    <div className={`stat-value ${latestMACD >= 0 ? 'positive' : 'negative'}`}
                        style={{ fontSize: '1.3rem' }}>
                        {latestMACD ?? '—'}
                    </div>
                </div>
            </div>

            {/* Indicator Toggles */}
            <div className="indicator-toggles">
                {INDICATOR_OPTIONS.map(({ key, label, color }) => (
                    <button
                        key={key}
                        className={`indicator-pill ${activeIndicators.includes(key) ? 'active' : ''}`}
                        onClick={() => toggleIndicator(key)}
                        style={activeIndicators.includes(key) ? { borderColor: color, color } : {}}
                    >
                        <span className="indicator-dot" style={{ background: color }} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Candlestick Chart */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                {chartData && (
                    <CandlestickChart data={chartData} indicators={selectedIndicators} height={500} />
                )}
            </div>

            {/* RSI Sub-chart */}
            {chartData?.rsi && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 className="section-title" style={{ marginBottom: 12 }}>RSI (14)</h3>
                    <div className="rsi-bar-container">
                        {chartData.rsi.slice(-60).map((v, i) => {
                            if (v == null) return null;
                            const color = v > 70 ? 'var(--red)' : v < 30 ? 'var(--green)' : 'var(--accent-primary)';
                            return (
                                <div key={i} className="rsi-bar" style={{
                                    height: `${v}%`,
                                    background: color,
                                    opacity: 0.7,
                                }} title={`RSI: ${v}`} />
                            );
                        })}
                    </div>
                    <div className="rsi-levels">
                        <span>Oversold (30)</span>
                        <span>Overbought (70)</span>
                    </div>
                </div>
            )}
        </div>
    );
}
