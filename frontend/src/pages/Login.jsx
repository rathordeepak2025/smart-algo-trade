import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_BASE_URL = 'http://localhost:8000/api';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpstoxLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${API_BASE_URL}/auth/upstox/login`);
            if (response.data && response.data.login_url) {
                window.location.href = response.data.login_url; // Redirect to Upstox
            } else {
                setError('Failed to get login URL from server.');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError('System error connecting to backend auth service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Welcome to Nexus</h1>
                <p className="subtitle">AI-Powered Algorithmic Trading Platform</p>

                <div className="login-actions">
                    <button
                        className="upstox-btn"
                        onClick={handleUpstoxLogin}
                        disabled={loading}
                    >
                        {loading ? 'Connecting...' : 'Login with Upstox'}
                    </button>
                </div>

                {error && <div className="error-msg">{error}</div>}
            </div>
        </div>
    );
};

export default Login;
