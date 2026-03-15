import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const AuthCallback = ({ setIsAuthenticated }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Verifying authentication...');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // upstox might send state
        const error = searchParams.get('error');

        if (error) {
            setStatus(`Authentication failed: ${error}`);
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

        if (code) {
            // Exchange code for token via backend
            setStatus('Exchanging authorization code...');
            axios.post(`${API_BASE_URL}/auth/upstox/callback?code=${code}`)
                .then((response) => {
                    setStatus('Authentication successful! Redirecting...');
                    if (setIsAuthenticated) setIsAuthenticated(true);
                    setTimeout(() => navigate('/'), 1500);
                })
                .catch((err) => {
                    console.error("Auth callback error:", err);
                    setStatus('Failed to verify code with backend. Please try again.');
                    setTimeout(() => navigate('/login'), 3000);
                });
        } else {
            setStatus('Invalid callback URL, no code found.');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [searchParams, navigate, setIsAuthenticated]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <h2>Nexus Authentication</h2>
            <p>{status}</p>
            {/* Simple loader */}
            {status.includes('...') && (
                <div style={{ marginTop: '20px', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}>
                    <style>{"@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"}</style>
                </div>
            )}
        </div>
    );
};

export default AuthCallback;
