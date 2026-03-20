import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Activity, Search, Plus } from 'lucide-react';
import './Market.css';

export default function Market() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    // 1. Fetch Today's Chartink stocks on mount
    useEffect(() => {
        const fetchInitialStocks = async () => {
            setLoading(true);
            try {
                const res = await axios.get('http://localhost:8000/api/stocks');
                setStocks(res.data);
            } catch (err) {
                console.error("Failed to fetch initial stocks", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialStocks();
    }, []);

    // 2. Search functionality
    const handleSearch = async (val) => {
        setSearch(val);
        if (val.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }
        try {
            const res = await axios.get(`http://localhost:8000/api/market/search?q=${val}`);
            setSearchResults(res.data);
            setShowResults(true);
        } catch (err) {
            console.error("Search error", err);
        }
    };

    const addStockToTable = async (instrument) => {
        // Prevent duplicates
        if (stocks.find(s => s.symbol === instrument.symbol)) {
            setSearch('');
            setShowResults(false);
            return;
        }

        try {
            // Fetch live quote for the new stock
            const quoteRes = await axios.get(`http://localhost:8000/api/market/quotes?symbols=${instrument.symbol}`);
            const quote = quoteRes.data[instrument.symbol] || {};
            
            const newStock = {
                symbol: instrument.symbol,
                name: instrument.name,
                exchange: 'NSE',
                current_price: quote.current_price || 0,
                day_change: quote.day_change || 0,
                day_change_pct: quote.day_change_pct || 0,
                volume: quote.volume || 0 // Assuming volume is returned
            };
            
            setStocks(prev => [newStock, ...prev]);
            setSearch('');
            setShowResults(false);
        } catch (err) {
            console.error("Failed to add stock", err);
        }
    };

    // 3. Track functionality
    const handleTrack = async (symbol) => {
        try {
            await axios.post('http://localhost:8000/api/market/track', { symbol });
            alert(`${symbol} matches current date and is now being tracked.`);
        } catch (err) {
            console.error("Failed to track stock", err);
            alert("Error adding to tracking list.");
        }
    };

    // Handle clicks outside search results
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="fade-in market-page">
            <div className="page-header">
                <div className="header-icon">
                    <Activity size={32} color="var(--primary)" />
                </div>
                <div>
                    <h1>Market</h1>
                    <p>Real-time data for today's screened instruments</p>
                </div>
            </div>

            {/* Search Box */}
            <div className="search-container" ref={searchRef} style={{ position: 'relative', marginBottom: 24 }}>
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search & Add Stocks (e.g. RELIANCE)..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
                {showResults && searchResults.length > 0 && (
                    <div className="search-results-dropdown shadow-lg">
                        {searchResults.map(res => (
                            <div 
                                key={res.instrument_key} 
                                className="search-result-item"
                                onClick={() => addStockToTable(res)}
                            >
                                <span className="res-symbol">{res.symbol}</span>
                                <span className="res-name">{res.name}</span>
                                <Plus size={14} className="add-icon" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Fetching today's screened stocks...</p>
                </div>
            ) : stocks.length === 0 ? (
                <div className="empty-state">
                    <p>No stocks found for today's run. Try searching for a stock above.</p>
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
                                <th style={{ textAlign: 'center' }}>Action</th>
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
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                className="btn btn-sm btn-primary track-btn"
                                                onClick={() => handleTrack(stock.symbol)}
                                            >
                                                Track
                                            </button>
                                        </td>
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
