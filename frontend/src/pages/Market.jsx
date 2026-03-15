import { useState, useEffect, useCallback } from 'react';
import { fetchStocks } from '../services/api';
import marketWS from '../services/websocket';
import MarketTable from '../components/MarketTable';
import axios from 'axios';

export default function Market() {
    const [stocks, setStocks] = useState([]);
    const [chartinkData, setChartinkData] = useState({ top_gainers: [], top_losers: [] });
    const [liveData, setLiveData] = useState({});
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchStocks(),
            axios.get('http://localhost:8000/api/chartink/screener').then(res => res.data).catch(() => ({ top_gainers: [], top_losers: [] }))
        ])
            .then(([s, cData]) => {
                setStocks(s);
                setChartinkData(cData);
                setLoading(false);
            })
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
        if (filter === 'CHARTINK_GAINERS' && !chartinkData.top_gainers.includes(s.symbol)) return false;
        if (filter === 'CHARTINK_LOSERS' && !chartinkData.top_losers.includes(s.symbol)) return false;
        if (['NSE', 'BSE'].includes(filter) && s.exchange !== filter) return false;
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
                    {[{ id: 'ALL', label: 'ALL' }, { id: 'NSE', label: 'NSE' }, { id: 'BSE', label: 'BSE' }, { id: 'CHARTINK_GAINERS', label: 'Chartink Gainers' }, { id: 'CHARTINK_LOSERS', label: 'Chartink Losers' }].map(f => (
                        <button
                            key={f.id}
                            className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f.id)}
                            style={f.id.includes('CHARTINK') ? { backgroundColor: filter === f.id ? '#8b5cf6' : '#1e293b', borderColor: '#8b5cf6' } : {}}
                        >
                            {f.label}
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
