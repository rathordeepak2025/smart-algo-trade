import { useState, useEffect, useCallback } from 'react';
import { fetchStocks } from '../services/api';
import marketWS from '../services/websocket';
import MarketTable from '../components/MarketTable';

export default function Market() {
    const [stocks, setStocks] = useState([]);
    const [liveData, setLiveData] = useState({});
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStocks()
            .then(s => { setStocks(s); setLoading(false); })
            .catch(() => setLoading(false));
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

    const filtered = stocks.filter(s => {
        if (filter !== 'ALL' && s.exchange !== filter) return false;
        if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) &&
            !s.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Market</h1>
                <p>Real-time NSE & BSE stock prices</p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search stocks..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: 280 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                    {['ALL', 'NSE', 'BSE'].map(f => (
                        <button
                            key={f}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pulse-dot live"></span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>Live</span>
                </div>
            </div>

            <MarketTable stocks={filtered} liveData={liveData} />
        </div>
    );
}
