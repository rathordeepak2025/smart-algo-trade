import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, BarChart3, Briefcase, Activity,
    IndianRupee, Zap
} from 'lucide-react';
import { fetchStocks, fetchStrategies } from '../services/api';
import marketWS from '../services/websocket';
import axios from 'axios';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [holdings, setHoldings] = useState([]);
    const [positions, setPositions] = useState([]);
    const [strategies, setStrategies] = useState([]);
    const [liveData, setLiveData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchStocks(),
            fetchStrategies(),
            axios.get('http://localhost:8000/api/upstox/holdings').then(res => res.data?.data || []).catch(err => { console.error(err); return []; }),
            axios.get('http://localhost:8000/api/upstox/positions').then(res => res.data?.data || []).catch(err => { console.error(err); return []; })
        ])
            .then(([s, st, h, p]) => {
                setStocks(s);
                setStrategies(st);
                setHoldings(h);
                setPositions(p);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleLiveData = useCallback((updates) => {
        const map = {};
        updates.forEach(u => { map[u.symbol] = u; });
        setLiveData(prev => ({ ...prev, ...map }));
    }, []);

    useEffect(() => {
        const unsub = marketWS.subscribe(handleLiveData);
        return unsub;
    }, [handleLiveData]);

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    // Calculate overview stats from Upstox data
    // Upstox holdings have fields like: average_price, quantity, instrument_token
    const totalInvested = holdings.reduce((sum, h) => sum + ((h.average_price || 0) * (h.quantity || 0)), 0);
    const totalValue = holdings.reduce((sum, h) => sum + ((h.last_price || h.average_price || 0) * (h.quantity || 0)), 0);
    const totalPnl = totalValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const gainers = [...stocks].sort((a, b) => b.day_change_pct - a.day_change_pct).slice(0, 5);
    const losers = [...stocks].sort((a, b) => a.day_change_pct - b.day_change_pct).slice(0, 5);

    return (
        <div className="dashboard fade-in">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Market overview & portfolio summary</p>
            </div>

            {/* Overview Stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="card stat-card">
                    <div className="stat-label">Portfolio Value</div>
                    <div className="stat-value">
                        ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className={`stat-change ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({totalPnlPct.toFixed(2)}%)
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-label">Total Invested</div>
                    <div className="stat-value">
                        ₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                        {holdings.length} Holdings | {positions.length} Positions
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-label">Tracking</div>
                    <div className="stat-value">{stocks.length}</div>
                    <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                        NSE & BSE stocks
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-label">Active Strategies</div>
                    <div className="stat-value">{strategies.length}</div>
                    <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                        Ready to backtest
                    </div>
                </div>
            </div>

            {/* Top Gainers & Losers */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                    <h3 className="section-title">
                        <TrendingUp size={18} style={{ color: 'var(--green)' }} />
                        Top Gainers
                    </h3>
                    <div className="mover-list">
                        {gainers.map(s => (
                            <div key={s.symbol} className="mover-item" onClick={() => navigate(`/stock/${s.symbol}`)}>
                                <div>
                                    <span className="symbol-badge">{s.symbol}</span>
                                    <span className="mover-name">{s.name}</span>
                                </div>
                                <div className="mover-stats">
                                    <span className="mover-price">₹{s.current_price?.toFixed(2)}</span>
                                    <span className="change-badge up">
                                        <ArrowUp size={12} />+{s.day_change_pct?.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title">
                        <TrendingDown size={18} style={{ color: 'var(--red)' }} />
                        Top Losers
                    </h3>
                    <div className="mover-list">
                        {losers.map(s => (
                            <div key={s.symbol} className="mover-item" onClick={() => navigate(`/stock/${s.symbol}`)}>
                                <div>
                                    <span className="symbol-badge">{s.symbol}</span>
                                    <span className="mover-name">{s.name}</span>
                                </div>
                                <div className="mover-stats">
                                    <span className="mover-price">₹{s.current_price?.toFixed(2)}</span>
                                    <span className="change-badge down">
                                        <ArrowDown size={12} />{s.day_change_pct?.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid-3">
                <div className="card quick-action" onClick={() => navigate('/market')}>
                    <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
                    <h4>Market Data</h4>
                    <p>View live prices & charts</p>
                </div>
                <div className="card quick-action" onClick={() => navigate('/strategies')}>
                    <Zap size={24} style={{ color: 'var(--yellow)' }} />
                    <h4>Strategies</h4>
                    <p>Create & manage strategies</p>
                </div>
                <div className="card quick-action" onClick={() => navigate('/backtest')}>
                    <BarChart3 size={24} style={{ color: 'var(--green)' }} />
                    <h4>Backtest</h4>
                    <p>Test strategies on historical data</p>
                </div>
            </div>
        </div>
    );
}

function ArrowUp({ size = 16 }) {
    return <TrendingUp size={size} />;
}
function ArrowDown({ size = 16 }) {
    return <TrendingDown size={size} />;
}
