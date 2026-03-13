import { useState, useEffect } from 'react';
import {
    fetchScreeners,
    createScreener,
    updateScreener,
    deleteScreener,
} from '../services/api';
import { Search, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import './StockFetcher.css';

const emptyForm = { name: '', scan_clause: '', is_active: true };

export default function StockFetcher() {
    const [screeners, setScreeners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadScreeners();
    }, []);

    const loadScreeners = async () => {
        try {
            const data = await fetchScreeners();
            setScreeners(data);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (s) => {
        setEditingId(s.id);
        setForm({ name: s.name, scan_clause: s.scan_clause, is_active: s.is_active });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await updateScreener(editingId, form);
            } else {
                await createScreener(form);
            }
            handleCancel();
            await loadScreeners();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete screener "${name}"? This action cannot be undone.`)) return;
        await deleteScreener(id);
        await loadScreeners();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    if (loading) {
        return <div className="loading"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="page-header sf-header">
                <div>
                    <h1><Search size={22} style={{ color: 'var(--accent-primary)', verticalAlign: 'middle', marginRight: 8 }} />Stock Fetcher</h1>
                    <p>Manage screeners to filter stocks by custom scan conditions</p>
                </div>
                {!showForm && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> New Screener
                    </button>
                )}
            </div>

            {/* Create / Edit Form */}
            {showForm && (
                <div className="card sf-form fade-in">
                    <h3 className="sf-form-title">
                        <Search size={16} style={{ color: 'var(--accent-primary)' }} />
                        {editingId ? 'Edit Screener' : 'New Screener'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div className="sf-form-row">
                            <div className="form-group sf-name-group">
                                <label htmlFor="sf-name">Screener Name</label>
                                <input
                                    id="sf-name"
                                    name="name"
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. High Volume Breakout"
                                    required
                                />
                            </div>
                            <div className="sf-active-group">
                                <label className="sf-checkbox-label">
                                    <input
                                        name="is_active"
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={handleChange}
                                        className="sf-checkbox"
                                    />
                                    <span className="sf-checkbox-custom" />
                                    <span>Is Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label htmlFor="sf-clause">Scan Clause</label>
                            <textarea
                                id="sf-clause"
                                name="scan_clause"
                                rows={5}
                                value={form.scan_clause}
                                onChange={handleChange}
                                placeholder={`e.g.\nlatest close > 200\nand latest volume > latest ema(volume, 20)\nand latest rsi(14) < 60`}
                                required
                            />
                        </div>

                        <div className="sf-form-actions">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving…' : editingId ? 'Update Screener' : 'Save Screener'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Screeners Table */}
            {screeners.length > 0 ? (
                <div className="card sf-table-card">
                    <table className="sf-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Screener Name</th>
                                <th>Scan Clause</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {screeners.map((s, i) => (
                                <tr key={s.id} className="sf-row fade-in">
                                    <td className="sf-idx">{i + 1}</td>
                                    <td className="sf-name">{s.name}</td>
                                    <td className="sf-clause">
                                        <code className="sf-code">{s.scan_clause}</code>
                                    </td>
                                    <td>
                                        {s.is_active ? (
                                            <span className="badge badge-green sf-status-badge">
                                                <CheckCircle2 size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="badge sf-status-badge sf-inactive">
                                                <XCircle size={12} /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="sf-actions">
                                            <button
                                                className="btn btn-sm btn-icon"
                                                title="Edit"
                                                onClick={() => openEdit(s)}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                title="Delete"
                                                onClick={() => handleDelete(s.id, s.name)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                !showForm && (
                    <div className="empty-state">
                        <Search size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                        <h3>No screeners yet</h3>
                        <p>Create your first screener to start filtering stocks by scan conditions</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                            <Plus size={16} /> New Screener
                        </button>
                    </div>
                )
            )}
        </div>
    );
}
