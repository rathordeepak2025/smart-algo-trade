import { useState, useEffect } from 'react';
import { fetchStrategies, createStrategy, deleteStrategy } from '../services/api';
import { Zap, Trash2, Plus, FlaskConical } from 'lucide-react';
import './Strategies.css';

const STRATEGY_TYPES = [
    {
        type: 'sma_crossover',
        label: 'SMA Crossover',
        description: 'Buy when short SMA crosses above long SMA',
        params: [
            { key: 'short_window', label: 'Short Period', default: 20 },
            { key: 'long_window', label: 'Long Period', default: 50 },
        ],
    },
    {
        type: 'rsi_overbought_oversold',
        label: 'RSI Mean Reversion',
        description: 'Buy at oversold RSI, sell at overbought',
        params: [
            { key: 'rsi_period', label: 'RSI Period', default: 14 },
            { key: 'oversold', label: 'Oversold Level', default: 30 },
            { key: 'overbought', label: 'Overbought Level', default: 70 },
        ],
    },
    {
        type: 'macd_crossover',
        label: 'MACD Crossover',
        description: 'Trade on MACD/Signal line crossovers',
        params: [],
    },
    {
        type: 'bollinger_breakout',
        label: 'Bollinger Breakout',
        description: 'Buy at lower band, sell at upper band',
        params: [],
    },
];

export default function Strategies() {
    const [strategies, setStrategies] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [strategyType, setStrategyType] = useState('SWING');
    const [ruleType, setRuleType] = useState('sma_crossover');
    const [params, setParams] = useState({});

    useEffect(() => {
        loadStrategies();
    }, []);

    const loadStrategies = async () => {
        try {
            const data = await fetchStrategies();
            setStrategies(data);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const selectedType = STRATEGY_TYPES.find(t => t.type === ruleType);
        const rules = { type: ruleType };
        selectedType.params.forEach(p => {
            rules[p.key] = Number(params[p.key] || p.default);
        });

        await createStrategy({
            name,
            description,
            strategy_type: strategyType,
            rules,
        });

        setShowForm(false);
        setName('');
        setDescription('');
        loadStrategies();
    };

    const handleDelete = async (id) => {
        await deleteStrategy(id);
        loadStrategies();
    };

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    const selectedRuleType = STRATEGY_TYPES.find(t => t.type === ruleType);

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Strategies</h1>
                    <p>Create and manage trading strategies</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> New Strategy
                </button>
            </div>

            {showForm && (
                <div className="card strategy-form fade-in" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>
                        <FlaskConical size={18} style={{ color: 'var(--accent-primary)' }} /> Create Strategy
                    </h3>
                    <form onSubmit={handleCreate}>
                        <div className="grid-2" style={{ marginBottom: 16 }}>
                            <div className="form-group">
                                <label>Strategy Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. My SMA Strategy"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <select value={strategyType} onChange={e => setStrategyType(e.target.value)}>
                                    <option value="SWING">Swing Trading</option>
                                    <option value="INTRADAY">Intraday</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Description</label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Brief description of your strategy"
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Rule Type</label>
                            <div className="rule-type-grid">
                                {STRATEGY_TYPES.map(st => (
                                    <div
                                        key={st.type}
                                        className={`rule-type-option ${ruleType === st.type ? 'active' : ''}`}
                                        onClick={() => { setRuleType(st.type); setParams({}); }}
                                    >
                                        <strong>{st.label}</strong>
                                        <small>{st.description}</small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedRuleType?.params.length > 0 && (
                            <div className="grid-3" style={{ marginBottom: 16 }}>
                                {selectedRuleType.params.map(p => (
                                    <div className="form-group" key={p.key}>
                                        <label>{p.label}</label>
                                        <input
                                            type="number"
                                            value={params[p.key] ?? p.default}
                                            onChange={e => setParams({ ...params, [p.key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit" className="btn btn-primary">Create Strategy</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Strategy List */}
            <div className="strategies-grid">
                {strategies.map(s => (
                    <div key={s.id} className="card strategy-card">
                        <div className="strategy-card-header">
                            <div>
                                <h3><Zap size={16} style={{ color: 'var(--yellow)' }} /> {s.name}</h3>
                                <p>{s.description}</p>
                            </div>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <div className="strategy-card-meta">
                            <span className={`badge ${s.strategy_type === 'INTRADAY' ? 'badge-yellow' : 'badge-blue'}`}>
                                {s.strategy_type}
                            </span>
                            <span className="badge badge-green">{s.rules?.type?.replace(/_/g, ' ')}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {s.backtest_count} backtest(s)
                            </span>
                        </div>
                        {s.rules && Object.entries(s.rules).filter(([k]) => k !== 'type').length > 0 && (
                            <div className="strategy-params">
                                {Object.entries(s.rules).filter(([k]) => k !== 'type').map(([k, v]) => (
                                    <span key={k} className="param-pill">
                                        {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {strategies.length === 0 && !showForm && (
                <div className="empty-state">
                    <h3>No strategies yet</h3>
                    <p>Create your first trading strategy to get started</p>
                </div>
            )}
        </div>
    );
}
