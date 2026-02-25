import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import './PortfolioCard.css';

export default function PortfolioCard({ portfolio, onClick }) {
    const isProfit = portfolio.pnl >= 0;

    return (
        <div className="card portfolio-card fade-in" onClick={onClick}>
            <div className="portfolio-card-header">
                <h3>{portfolio.name}</h3>
                <span className={`badge ${isProfit ? 'badge-green' : 'badge-red'}`}>
                    {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isProfit ? '+' : ''}{portfolio.pnl_pct?.toFixed(2)}%
                </span>
            </div>

            <div className="portfolio-card-body">
                <div className="portfolio-stat">
                    <span className="portfolio-stat-label">Invested</span>
                    <span className="portfolio-stat-value">
                        <IndianRupee size={14} />
                        {portfolio.total_invested?.toLocaleString('en-IN')}
                    </span>
                </div>

                <div className="portfolio-stat">
                    <span className="portfolio-stat-label">Current Value</span>
                    <span className="portfolio-stat-value highlight">
                        <IndianRupee size={14} />
                        {portfolio.current_value?.toLocaleString('en-IN')}
                    </span>
                </div>

                <div className="portfolio-stat">
                    <span className="portfolio-stat-label">P&L</span>
                    <span className={`portfolio-stat-value ${isProfit ? 'positive' : 'negative'}`}>
                        {isProfit ? '+' : ''}₹{portfolio.pnl?.toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            <div className="portfolio-card-footer">
                {portfolio.holdings_count} holdings
            </div>
        </div>
    );
}
