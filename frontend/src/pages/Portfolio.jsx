import { useState, useEffect } from 'react';
import { fetchPortfolios, fetchPortfolio } from '../services/api';
import PortfolioCard from '../components/PortfolioCard';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import './Portfolio.css';

export default function Portfolio() {
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPortfolios()
            .then(p => { setPortfolios(p); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleSelect = async (p) => {
        const detail = await fetchPortfolio(p.id);
        setSelected(detail);
    };

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Portfolio</h1>
                <p>Track your investments & P&L</p>
            </div>

            <div className="grid-3" style={{ marginBottom: 24 }}>
                {portfolios.map(p => (
                    <PortfolioCard key={p.id} portfolio={p} onClick={() => handleSelect(p)} />
                ))}
            </div>

            {selected && (
                <div className="card fade-in">
                    <div className="portfolio-detail-header">
                        <div>
                            <h2>{selected.name}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {selected.description}
                            </p>
                        </div>
                        <div className="portfolio-summary-stats">
                            <div>
                                <span className="stat-label">Invested</span>
                                <span className="stat-value" style={{ fontSize: '1.2rem' }}>
                                    ₹{selected.total_invested?.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span className="stat-label">Current</span>
                                <span className="stat-value" style={{ fontSize: '1.2rem' }}>
                                    ₹{selected.current_value?.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span className="stat-label">P&L</span>
                                <span className={`stat-value ${selected.pnl >= 0 ? 'positive' : 'negative'}`}
                                    style={{ fontSize: '1.2rem' }}>
                                    {selected.pnl >= 0 ? '+' : ''}₹{selected.pnl?.toLocaleString('en-IN')}
                                    <small> ({selected.pnl_pct?.toFixed(2)}%)</small>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginTop: 20 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Name</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                                    <th style={{ textAlign: 'right' }}>Current</th>
                                    <th style={{ textAlign: 'right' }}>Invested</th>
                                    <th style={{ textAlign: 'right' }}>Value</th>
                                    <th style={{ textAlign: 'right' }}>P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.holdings?.map(h => {
                                    const isUp = h.pnl >= 0;
                                    return (
                                        <tr key={h.id} onClick={() => navigate(`/stock/${h.symbol}`)}>
                                            <td><span className="symbol-badge">{h.symbol}</span></td>
                                            <td className="stock-name">{h.name}</td>
                                            <td style={{ textAlign: 'right' }}>{h.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>₹{h.avg_buy_price?.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>₹{h.current_price?.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>₹{h.invested?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right' }}>₹{h.current_value?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className={isUp ? 'positive' : 'negative'}>
                                                    {isUp ? '+' : ''}₹{h.pnl?.toFixed(2)}
                                                    <br />
                                                    <small>{isUp ? '+' : ''}{h.pnl_pct?.toFixed(2)}%</small>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
