import { useState, useEffect } from 'react';
import { fetchStrategies, fetchStocks, runBacktest } from '../services/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart3, Play, Trophy, TrendingDown, Target, Percent } from 'lucide-react';
import './Backtest.css';

export default function Backtest() {
    const [strategies, setStrategies] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    // Form
    const [selectedStrategy, setSelectedStrategy] = useState('');
    const [selectedStock, setSelectedStock] = useState('RELIANCE');
    const [capital, setCapital] = useState(100000);
    const [days, setDays] = useState(120);

    useEffect(() => {
        Promise.all([fetchStrategies(), fetchStocks()])
            .then(([s, st]) => {
                setStrategies(s);
                setStocks(st);
                if (s.length > 0) setSelectedStrategy(s[0].id);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleRun = async () => {
        if (!selectedStrategy) return;
        setRunning(true);
        setResult(null);
        try {
            const res = await runBacktest(selectedStrategy, {
                stock_symbol: selectedStock,
                initial_capital: capital,
                days,
            });
            setResult(res);
        } catch (err) {
            console.error(err);
            alert('Backtest failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Backtest</h1>
                <p>Test strategies against historical data</p>
            </div>

            {/* Configuration */}
            <div className="card backtest-config" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>
                    <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} /> Configuration
                </h3>
                <div className="grid-4" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                        <label>Strategy</label>
                        <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)}>
                            {strategies.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Stock</label>
                        <select value={selectedStock} onChange={e => setSelectedStock(e.target.value)}>
                            {stocks.map(s => (
                                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Initial Capital (₹)</label>
                        <input
                            type="number"
                            value={capital}
                            onChange={e => setCapital(Number(e.target.value))}
                            min={10000}
                        />
                    </div>
                    <div className="form-group">
                        <label>Days</label>
                        <input
                            type="number"
                            value={days}
                            onChange={e => setDays(Number(e.target.value))}
                            min={50}
                            max={365}
                        />
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleRun}
                    disabled={running || !selectedStrategy}
                >
                    {running ? (
                        <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Running...</>
                    ) : (
                        <><Play size={16} /> Run Backtest</>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="backtest-results fade-in">
                    {/* Metrics Cards */}
                    <div className="grid-4" style={{ marginBottom: 24 }}>
                        <div className="card stat-card">
                            <div className="stat-label">
                                <Trophy size={14} /> Total Return
                            </div>
                            <div className={`stat-value ${result.total_return_pct >= 0 ? 'positive' : 'negative'}`}>
                                {result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct}%
                            </div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                                ₹{result.initial_capital.toLocaleString('en-IN')} → ₹{result.final_capital.toLocaleString('en-IN')}
                            </div>
                        </div>

                        <div className="card stat-card">
                            <div className="stat-label">
                                <Percent size={14} /> Win Rate
                            </div>
                            <div className={`stat-value ${result.win_rate >= 50 ? 'positive' : 'negative'}`}>
                                {result.win_rate}%
                            </div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                                {result.winning_trades}W / {result.losing_trades}L
                            </div>
                        </div>

                        <div className="card stat-card">
                            <div className="stat-label">
                                <TrendingDown size={14} /> Max Drawdown
                            </div>
                            <div className="stat-value negative">
                                -{result.max_drawdown_pct}%
                            </div>
                        </div>

                        <div className="card stat-card">
                            <div className="stat-label">
                                <Target size={14} /> Sharpe Ratio
                            </div>
                            <div className={`stat-value ${result.sharpe_ratio >= 1 ? 'positive' : result.sharpe_ratio >= 0 ? '' : 'negative'}`}>
                                {result.sharpe_ratio}
                            </div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
                                {result.total_trades} total trades
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>Equity Curve</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={result.equity_curve}>
                                <defs>
                                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickLine={false}
                                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a2332',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        color: '#f0f4f8',
                                        fontSize: 12,
                                    }}
                                    formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Equity']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="equity"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#equityGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Trades Log */}
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>Trade Log</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th style={{ textAlign: 'right' }}>Price</th>
                                        <th style={{ textAlign: 'right' }}>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Value</th>
                                        <th style={{ textAlign: 'right' }}>P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.trades_log?.map((t, i) => (
                                        <tr key={i}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{t.date}</td>
                                            <td>
                                                <span className={`badge ${t.type.startsWith('BUY') ? 'badge-green' : 'badge-red'}`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>₹{t.price}</td>
                                            <td style={{ textAlign: 'right' }}>{t.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>₹{t.value?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {t.pnl != null ? (
                                                    <span className={t.pnl >= 0 ? 'positive' : 'negative'}>
                                                        {t.pnl >= 0 ? '+' : ''}₹{t.pnl?.toLocaleString('en-IN')}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!result && !running && (
                <div className="empty-state">
                    <BarChart3 size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                    <h3>Select a strategy and run a backtest</h3>
                    <p>Configure the parameters above and click "Run Backtest" to see results</p>
                </div>
            )}
        </div>
    );
}
