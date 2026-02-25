import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './MarketTable.css';

export default function MarketTable({ stocks, liveData = {} }) {
    const navigate = useNavigate();

    const getDisplayPrice = (stock) => {
        const live = liveData[stock.symbol];
        return live ? live.price : stock.current_price;
    };

    const getChange = (stock) => {
        const live = liveData[stock.symbol];
        return {
            change: live ? live.change : stock.day_change,
            changePct: live ? live.change_pct : stock.day_change_pct,
        };
    };

    return (
        <div className="card table-container">
            <table>
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Exchange</th>
                        <th>Sector</th>
                        <th style={{ textAlign: 'right' }}>Price (₹)</th>
                        <th style={{ textAlign: 'right' }}>Change</th>
                        <th style={{ textAlign: 'right' }}>% Change</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks.map((stock) => {
                        const price = getDisplayPrice(stock);
                        const { change, changePct } = getChange(stock);
                        const isUp = change >= 0;
                        const flashClass = liveData[stock.symbol]
                            ? isUp ? 'flash-green' : 'flash-red'
                            : '';

                        return (
                            <tr
                                key={stock.symbol}
                                className={flashClass}
                                onClick={() => navigate(`/stock/${stock.symbol}`)}
                            >
                                <td>
                                    <span className="symbol-badge">{stock.symbol}</span>
                                </td>
                                <td className="stock-name">{stock.name}</td>
                                <td>
                                    <span className={`badge badge-${stock.exchange === 'NSE' ? 'blue' : 'yellow'}`}>
                                        {stock.exchange}
                                    </span>
                                </td>
                                <td className="sector-text">{stock.sector}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className="price-value">₹{price?.toFixed(2)}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className={isUp ? 'positive' : 'negative'}>
                                        {isUp ? '+' : ''}{change?.toFixed(2)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className={`change-badge ${isUp ? 'up' : 'down'}`}>
                                        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {Math.abs(changePct || 0).toFixed(2)}%
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
