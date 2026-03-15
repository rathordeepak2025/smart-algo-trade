import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard,
    TrendingUp,
    Briefcase,
    FlaskConical,
    BarChart3,
    Activity,
    Search,
    LogOut,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: TrendingUp },
    { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { path: '/strategies', label: 'Strategies', icon: FlaskConical },
    { path: '/backtest', label: 'Backtest', icon: BarChart3 },
    { path: '/stock-fetcher', label: 'Stock Fetcher', icon: Search },
];

export default function Sidebar() {
    const location = useLocation();
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    useEffect(() => {
        const checkMarketStatus = () => {
            const now = new Date();
            // Convert to IST
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const istDate = new Date(utc + (3600000 * 5.5)); // IST is UTC+5:30
            
            const day = istDate.getDay();
            const hours = istDate.getHours();
            const minutes = istDate.getMinutes();
            
            const isWeekday = day >= 1 && day <= 5;
            const timeInMinutes = hours * 60 + minutes;
            const marketOpenMinutes = 9 * 60 + 15; // 9:15 AM
            const marketCloseMinutes = 15 * 60 + 30; // 3:30 PM

            setIsMarketOpen(isWeekday && timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes);
        };

        checkMarketStatus();
        const interval = setInterval(checkMarketStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:8000/api/auth/upstox/logout');
            // Hard reload to clear App level auth state and force a re-check with the backend
            window.location.href = '/login';
        } catch (error) {
            console.error("Error logging out:", error);
            // Fallback reload if backend fails
            window.location.href = '/login';
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <Activity size={22} />
                </div>
                <div>
                    <h1>Nexus</h1>
                    <span>Algo Trading</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <Icon size={18} />
                        <span>{label}</span>
                        {location.pathname === path && <div className="nav-indicator" />}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className={`live-indicator ${isMarketOpen ? 'live' : 'closed'}`}>
                    <span className={`pulse-dot ${isMarketOpen ? 'live' : 'closed'}`}></span>
                    <span>{isMarketOpen ? 'Market Live' : 'Market Closed'}</span>
                </div>
                <div 
                    className="version-text cursor-pointer hover:text-red-500 transition-colors"
                    onClick={handleLogout}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', color: '#f87171' }}
                >
                    <LogOut size={16} /> Logout
                </div>
                <div className="version-text" style={{ marginTop: '10px' }}>v1.0.0 MVP</div>
            </div>
        </aside>
    );
}
