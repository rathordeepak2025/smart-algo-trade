import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    Briefcase,
    FlaskConical,
    BarChart3,
    Activity,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: TrendingUp },
    { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { path: '/strategies', label: 'Strategies', icon: FlaskConical },
    { path: '/backtest', label: 'Backtest', icon: BarChart3 },
];

export default function Sidebar() {
    const location = useLocation();

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
                <div className="live-indicator">
                    <span className="pulse-dot live"></span>
                    <span>Market Live</span>
                </div>
                <div className="version-text">v1.0.0 MVP</div>
            </div>
        </aside>
    );
}
