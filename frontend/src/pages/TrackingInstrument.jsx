import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import './Market.css';

export default function TrackingInstrument() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrackedStocks = async () => {
            setLoading(true);
            try {
                const res = await axios.get('http://localhost:8000/api/market/tracked');
                setStocks(res.data);
            } catch (err) {
                console.error("Failed to fetch tracked stocks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrackedStocks();
    }, []);

    return (
        <div className="fade-in market-page">
            <div className="page-header">
                <div className="header-icon">
                    <Compass size={32} color="var(--primary)" />
                </div>
                <div>
                    <h1>Tracking Instruments</h1>
                    <p>Live matching for stocks you've selected to track today</p>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Fetching your tracked instruments...</p>
                </div>
            ) : stocks.length === 0 ? (
                <div className="empty-state">
                    <p>You haven't tracked any instruments today. Go to the Market page to add some.</p>
                </div>
            ) : (
                <div className="card table-container">
                    <table className="market-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Name</th>
                                <th>Exchange</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                                <th style={{ textAlign: 'right' }}>Change</th>
                                <th style={{ textAlign: 'right' }}>Change %</th>
                                <th style={{ textAlign: 'right' }}>Volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stocks.map(stock => {
                                const isUp = stock.day_change >= 0;
                                return (
                                    <tr key={stock.symbol}>
                                        <td><span className="symbol-badge">{stock.symbol}</span></td>
                                        <td className="stock-name">{stock.name}</td>
                                        <td><span className="badge badge-blue">NSE</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{stock.current_price?.toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={isUp ? 'positive' : 'negative'}>
                                                {isUp ? '+' : ''}{stock.day_change?.toFixed(2)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`change-badge ${isUp ? 'up' : 'down'}`}>
                                                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                {Math.abs(stock.day_change_pct || 0).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{stock.volume?.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
